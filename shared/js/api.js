/* NEXUS — domain API (sample-data implementation on top of the in-memory NX.DB).
   Every method is async and throws Error(message) on failure, exactly like a fetch-based client would,
   so pages never touch storage directly. Replace the bodies with HTTP calls for production. */
(function () {
  "use strict";
  const NX = window.NX;
  const DB = NX.DB;
  const money = (n) => Math.round(n * 100) / 100;
  const DAY = 86400000;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const DEMO_THREADS_KEY = "nexus.demo.threads.v1";
  const WORKSPACE_COMMISSION_RATE = 14;
  const EXPERT_COMMISSION_RATE = 8;
  const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "cancelled"]);

  /* ---------- helpers ---------- */
  function restoreDemoThreads() {
    const saved = sessionStorage.getItem(DEMO_THREADS_KEY);
    if (saved === null) return;
    let threads;
    try {
      threads = JSON.parse(saved);
    } catch (error) {
      throw new Error("Your demo conversations could not be restored. Clear this tab's site data and try again.");
    }
    if (
      !Array.isArray(threads) ||
      threads.some(
        (thread) =>
          !thread ||
          typeof thread.id !== "string" ||
          !Array.isArray(thread.participants) ||
          !Array.isArray(thread.messages),
      )
    )
      throw new Error("Your demo conversations are invalid. Clear this tab's site data and try again.");
    DB.save("threads", threads);
  }
  function saveDemoThreads() {
    sessionStorage.setItem(DEMO_THREADS_KEY, JSON.stringify(DB.all("threads")));
  }
  function me() {
    const u = NX.Auth.user() || NX.Auth.demo();
    if (!u) throw new Error("Please sign in to continue.");
    return u;
  }
  function need(roles) {
    const u = me();
    if (![].concat(roles).includes(u.role))
      throw new Error("You do not have access to this action.");
    return u;
  }
  const settings = () => DB.obj("settings");
  const workspaceCommissionRate = () => Number(settings().workspaceCommission ?? WORKSPACE_COMMISSION_RATE);
  const expertCommissionRate = () => Number(settings().expertCommission ?? EXPERT_COMMISSION_RATE);
  const spaceName = (id) => (DB.find("spaces", id) || { name: "Space" }).name;
  const isLive = (b) => b.status !== "cancelled";
  const isWallet = (t) => t.method === "wallet" || t.type === "topup";
  const nowMs = () => Date.now();
  const stamp = (date, time) => new Date(date + "T" + (time || "09:00") + ":00").getTime();

  function enrichBooking(b) {
    const sp = DB.find("spaces", b.spaceId) || {};
    return Object.assign({}, b, {
      spaceName: sp.name || "Space",
      spaceArea: sp.area || "",
      spaceCity: sp.city || "",
      hue: sp.hue == null ? NX.hue(sp.name || b.spaceId) : sp.hue,
      ownerEmail: sp.ownerEmail,
      days: 1,
    });
  }
  function enrichConsult(c) {
    const e = DB.find("experts", c.expertId) || {};
    return Object.assign({}, c, {
      expertName: e.name || "Expert",
      expertTitle: e.title || "",
      expertEmail: e.email,
      spaceName: c.spaceId ? spaceName(c.spaceId) : "",
    });
  }
  function ownedSpaceIds(email) {
    return DB.all("spaces")
      .filter((s) => s.ownerEmail === email)
      .map((s) => s.id);
  }
  function walletBalance(email) {
    return money(
      DB.all("transactions")
        .filter((t) => t.email === email && isWallet(t))
        .reduce((a, t) => a + t.amount, 0),
    );
  }
  function addTx(o) {
    return DB.add(
      "transactions",
      Object.assign({ id: DB.nextId("T-", "transactions", 5000), at: nowMs(), ref: "" }, o),
    );
  }

  /* desk availability for a date */
  function deskState(space, date, slot) {
    const taken = {};
    DB.all("bookings").forEach((b) => {
      if (b.spaceId !== space.id || b.date !== date || !isLive(b)) return;
      const overlaps = !slot || slot.durationType !== "hourly" || b.durationType !== "hourly" ||
        (slot.startTime < b.endTime && b.startTime < slot.endTime);
      if (overlaps) b.deskIds.forEach((d) => (taken[d] = true));
    });
    return space.plan.map((d) => ({
      id: d.id,
      zone: d.zone,
      busy: !!(d.base || taken[d.id]),
      blocked: !!d.blocked,
    }));
  }
  function spaceView(sp, date, slot) {
    const fb = DB.all("feedback").filter((f) => f.kind === "space" && f.targetId === sp.id);
    const rating = fb.length ? money(fb.reduce((a, f) => a + f.rating, 0) / fb.length) : sp.rating;
    return {
      id: sp.id,
      name: sp.name,
      area: sp.area,
      city: sp.city,
      price: sp.price,
      hourlyPrice: Number(sp.hourlyPrice || 0),
      rating,
      reviews: fb.length,
      am: sp.am,
      hue: sp.hue == null ? NX.hue(sp.name) : sp.hue,
      description: sp.description || "",
      hours: sp.hours || "",
      address: sp.address || "",
      instant: sp.instant !== false,
      isNew: !!sp.isNew,
      ownerEmail: sp.ownerEmail,
      status: sp.status,
      paused: !!sp.paused,
      desks: deskState(sp, date, slot),
    };
  }

  /* earnings ledger for experts and owners (derived — nothing is stored twice) */
  function earnings(email, role) {
    let items = [];
    if (role === "owner") {
      const ids = ownedSpaceIds(email);
      items = DB.all("bookings")
        .filter((b) => ids.includes(b.spaceId) && isLive(b))
        .map((b) => ({
          id: b.id,
          kind: "Desk booking",
          label:
            spaceName(b.spaceId) +
            " · " +
            b.deskIds.length +
            " desk" +
            (b.deskIds.length > 1 ? "s" : ""),
          date: b.date,
          gross: b.fee,
          cut: b.cut,
          net: money(b.fee - b.cut),
          done: b.status === "completed",
          status: b.status,
        }));
    } else {
      const u = DB.all("users").find((x) => x.email === email);
      items = DB.all("consultations")
        .filter(
          (c) =>
            u &&
            c.expertId === u.expertId &&
            (c.status === "completed" || c.status === "confirmed"),
        )
        .map((c) => ({
          id: c.id,
          kind: "Expert session",
          label: c.topic || "Consultation",
          date: c.date,
          gross: c.fee,
          cut: c.cut,
          net: money(c.fee - c.cut),
          done: c.status === "completed",
          status: c.status,
        }));
    }
    const payouts = DB.all("payouts").filter((p) => p.email === email);
    const earned = money(items.filter((i) => i.done).reduce((a, i) => a + i.net, 0));
    const upcoming = money(
      items.filter((i) => !i.done && i.status !== "pending").reduce((a, i) => a + i.net, 0),
    );
    const paid = money(
      payouts.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0),
    );
    const requested = money(
      payouts.filter((p) => p.status === "requested").reduce((a, p) => a + p.amount, 0),
    );
    return {
      items: items.sort((a, b) => (a.date < b.date ? 1 : -1)),
      payouts: payouts.sort((a, b) => b.at - a.at),
      earned,
      upcoming,
      paid,
      requested,
      available: money(earned - paid - requested),
      gross: money(items.filter((i) => i.done).reduce((a, i) => a + i.gross, 0)),
      fees: money(items.filter((i) => i.done).reduce((a, i) => a + i.cut, 0)),
    };
  }

  const Api = {
    async createHostedCheckout(payload) {
      const response = await fetch(NX.root + "api/payments/checkout-sessions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Card checkout is not available yet.");
      if (!data.checkoutUrl || !/^https:\/\//i.test(data.checkoutUrl))
        throw new Error("The payment server returned an invalid checkout link.");
      return data;
    },
    async paymentStatus(paymentId) {
      if (!paymentId || !/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) throw new Error("Invalid payment reference.");
      const response = await fetch(NX.root + "api/payments/" + encodeURIComponent(paymentId), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Payment status could not be verified.");
      if (!PAYMENT_STATUSES.has(data.status)) throw new Error("The server returned an unknown payment status.");
      return data;
    },
    /* ================= catalog ================= */
    async spaces(date) {
      return DB.all("spaces")
        .filter((s) => s.status === "approved" && !s.paused)
        .map((s) => spaceView(s, date || NX.todayISO));
    },
    async space(id, date, slot) {
      const s = DB.find("spaces", id);
      if (!s) return null;
      const u = NX.Auth.user();
      const mine = u && (u.role === "admin" || s.ownerEmail === u.email);
      if (s.status !== "approved" && !mine) return null;
      const v = spaceView(s, date || NX.todayISO, slot);
      v.feedback = DB.all("feedback")
        .filter((f) => f.kind === "space" && f.targetId === id)
        .sort((a, b) => b.at - a.at);
      return v;
    },
    async experts() {
      return DB.all("experts")
        .filter((e) => e.status === "approved")
        .map((e) => Object.assign({}, e, { slots: Api._slotLabels(e) }));
    },
    async expert(id) {
      const e = DB.find("experts", id);
      if (!e) return null;
      return Object.assign({}, e, {
        slots: Api._slotLabels(e),
        feedback: DB.all("feedback")
          .filter((f) => f.kind === "expert" && f.targetId === id)
          .sort((a, b) => b.at - a.at),
      });
    },
    _slotList(e) {
      const out = [];
      const booked = DB.all("consultations").filter(
        (c) => c.expertId === e.id && c.status !== "cancelled" && c.status !== "declined",
      );
      for (let i = 0; i < 8; i++) {
        const date = NX.isoOffset(i);
        const dow = new Date(date + "T12:00:00").getDay();
        if (!e.avail.days.includes(dow)) continue;
        e.avail.times.forEach((time) => {
          if (stamp(date, time) < nowMs() + 3600000) return;
          if (booked.some((c) => c.date === date && c.time === time)) return;
          const label =
            i === 0
              ? "Today " + time
              : i === 1
                ? "Tomorrow " + time
                : NX.fmtDate(date, { weekday: "short", day: "numeric", month: "short" }) +
                  " " +
                  time;
          out.push({ date, time, label });
        });
      }
      return out;
    },
    _slotLabels(e) {
      return Api._slotList(e)
        .slice(0, 4)
        .map((s) => s.label);
    },
    async expertSlots(id) {
      const e = DB.find("experts", id);
      return e ? Api._slotList(e) : [];
    },

    /* ================= space bookings ================= */
    async quote(spaceId, deskIds, date, booking = {}) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || Number.isNaN(new Date(date + "T00:00:00").getTime())) throw new Error("Choose a valid booking date.");
      const sp = await Api.space(spaceId, date, booking);
      if (!sp) throw new Error("This space is not available.");
      if (!Array.isArray(deskIds) || !deskIds.length || deskIds.length > 8 || new Set(deskIds).size !== deskIds.length) throw new Error("Choose between 1 and 8 different desks.");
      const desks = deskIds.map((id) => sp.desks.find((d) => d.id === id));
      if (!desks.length || desks.some((d) => !d)) throw new Error("Choose at least one desk.");
      const hourly = booking.durationType === "hourly";
      const toMinutes = (value) => {
        const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
        if (!match || Number(match[1]) > 24 || Number(match[2]) > 59 || (Number(match[1]) === 24 && Number(match[2]) !== 0)) return NaN;
        return Number(match[1]) * 60 + Number(match[2]);
      };
      const durationHours = hourly ? (toMinutes(booking.endTime) - toMinutes(booking.startTime)) / 60 : 0;
      if (hourly && !(durationHours > 0 && durationHours <= 12)) throw new Error("Choose a valid hourly booking period.");
      const baseFee = money((hourly ? Number(sp.hourlyPrice || 0) * durationHours : sp.price) * desks.length);
      const rate = workspaceCommissionRate();
      const commission = money((baseFee * rate) / 100);
      const fee = money(baseFee + commission);
      return { space: sp, desks, date, durationType: hourly ? "hourly" : "daily", durationHours, baseFee, commission, rate, fee, cut: commission, instant: sp.instant };
    },
    async book(a, b, c) {
      /* backwards-compatible signature: book(spaceId, deskIds, date) pays by wallet/card default */
      if (typeof a === "object") return Api.bookSpace(a);
      return Api.bookSpace({ spaceId: a, deskIds: b, date: c, method: "wallet" });
    },
    async bookSpace(o) {
      const u = need(["user", "company"]);
      const prior = o.idempotencyKey && DB.all("bookings").find((b) => b.idempotencyKey === o.idempotencyKey && b.userEmail === u.email);
      if (prior) return enrichBooking(prior);
      const cfg = settings();
      if (cfg.maintenance)
        throw new Error("Bookings are paused while the platform is under maintenance.");
      const sp = DB.find("spaces", o.spaceId);
      if (!sp || sp.status !== "approved" || sp.paused)
        throw new Error("This space is not available.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date || "")) || Number.isNaN(new Date(o.date + "T00:00:00").getTime())) throw new Error("Choose a valid booking date.");
      if (!Array.isArray(o.deskIds) || !o.deskIds.length || o.deskIds.length > 8 || new Set(o.deskIds).size !== o.deskIds.length) throw new Error("Choose between 1 and 8 different desks.");
      if (o.date < NX.todayISO) throw new Error("Pick today or a future date.");
      if (o.date > NX.addDays(NX.todayISO, cfg.bookingWindow))
        throw new Error("You can book up to " + cfg.bookingWindow + " days ahead.");
      let company = null;
      if (u.role === "company") {
        company = DB.find("companies", u.companyId);
        if (!company || company.status !== "approved")
          throw new Error("Your company account is waiting for admin approval.");
      }
      const state = deskState(sp, o.date, o);
      if (
        o.deskIds.some((id) => {
          const d = state.find((x) => x.id === id);
          return !d || d.busy || d.blocked;
        })
      )
        throw new Error("One of the desks is no longer available. Please pick another.");
      const hourly = o.durationType === "hourly";
      const timeMinutes = (value) => { const m = /^(\d{2}):(\d{2})$/.exec(String(value || "")); return m && Number(m[1]) <= 24 && Number(m[2]) < 60 && (Number(m[1]) < 24 || Number(m[2]) === 0) ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
      const durationHours = hourly ? (timeMinutes(o.endTime) - timeMinutes(o.startTime)) / 60 : 0;
      if (hourly && !(durationHours > 0 && durationHours <= 12)) throw new Error("Choose a valid hourly booking period.");
      const baseFee = money((hourly ? Number(sp.hourlyPrice || 0) * durationHours : sp.price) * o.deskIds.length);
      const rate = workspaceCommissionRate();
      const commission = money((baseFee * rate) / 100);
      const fee = money(baseFee + commission);
      const method = o.method === "wallet" ? "wallet" : "unavailable";
      if (method !== "wallet") throw new Error("Card payments require a verified payment provider and are not available yet.");
      if (method === "wallet" && walletBalance(u.email) < fee)
        throw new Error("Your demo wallet balance is insufficient.");
      const rec = {
        id: DB.nextId("B-", "bookings", 1000),
        kind: "space",
        userEmail: u.email,
        bookedBy: o.bookedBy || u.name,
        payer: u.role === "company" ? "company" : "user",
        companyId: company ? company.id : undefined,
        walletEmail: u.email,
        spaceId: sp.id,
        deskIds: o.deskIds.slice(),
        date: o.date,
        durationType: hourly ? "hourly" : "daily",
        startTime: hourly ? o.startTime : undefined,
        endTime: hourly ? o.endTime : undefined,
        fee,
        baseFee,
        commission,
        cut: commission,
        rate,
        idempotencyKey: o.idempotencyKey,
        method,
        status: sp.instant !== false ? "confirmed" : "pending",
        paymentStatus: "paid",
        createdAt: nowMs(),
      };
      DB.add("bookings", rec);
      addTx({
        email: u.email,
        type: "booking",
        amount: -fee,
        desc: "Desk booking · " + sp.name,
        ref: rec.id,
        method,
      });
      return enrichBooking(rec);
    },
    async bookings() {
      const u = me();
      let list = DB.all("bookings");
      if (u.role === "user") list = list.filter((b) => b.userEmail === u.email);
      else if (u.role === "company") list = list.filter((b) => b.companyId === u.companyId);
      else if (u.role === "owner") {
        const ids = ownedSpaceIds(u.email);
        list = list.filter((b) => ids.includes(b.spaceId));
      } else if (u.role !== "admin") list = [];
      return list
        .map(enrichBooking)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
    },
    async booking(id) {
      const b = (await Api.bookings()).find((x) => x.id === id);
      if (!b) throw new Error("Booking not found.");
      return b;
    },
    async spaceBookings(spaceId, date) {
      return DB.all("bookings")
        .filter((b) => b.spaceId === spaceId && b.date === date && isLive(b))
        .map(enrichBooking);
    },
    _refundable(b, who) {
      if (who === "owner") return true;
      return stamp(b.date, "09:00") - nowMs() > settings().cancelHours * 3600000;
    },
    async cancelBooking(id) {
      const u = need(["user", "company", "owner", "admin"]);
      const b = DB.find("bookings", id);
      if (!b) throw new Error("Booking not found.");
      const mine =
        b.userEmail === u.email ||
        b.companyId === u.companyId ||
        (DB.find("spaces", b.spaceId) || {}).ownerEmail === u.email ||
        u.role === "admin";
      if (!mine) throw new Error("You cannot change this booking.");
      if (b.status === "cancelled" || b.status === "completed")
        throw new Error("This booking can no longer be cancelled.");
      const who = u.role === "owner" || u.role === "admin" ? "owner" : "member";
      const refund = Api._refundable(b, who);
      DB.patch("bookings", id, { status: "cancelled", paymentStatus: "cancelled", cancelledBy: u.role, refunded: refund });
      if (refund && b.walletEmail)
        addTx({
          email: b.walletEmail,
          type: "refund",
          amount: b.fee,
          desc: "Refund · " + id,
          ref: id,
          method: b.method === "wallet" ? "wallet" : "card",
        });
      return { refunded: refund };
    },
    async setBookingStatus(id, status) {
      const u = need(["owner", "admin"]);
      const b = DB.find("bookings", id);
      if (!b) throw new Error("Booking not found.");
      const sp = DB.find("spaces", b.spaceId);
      if (u.role === "owner" && sp.ownerEmail !== u.email)
        throw new Error("This booking belongs to another space.");
      if (status === "cancelled") return Api.cancelBooking(id);
      if (!["confirmed", "completed"].includes(status)) throw new Error("Unknown status.");
      DB.patch("bookings", id, { status });
      return null;
    },

    /* ================= service tickets ================= */
    async tickets(f) {
      const u = me();
      const all = DB.all("tickets");
      if (f && f.mine)
        return all
          .filter((t) => t.userEmail === u.email)
          .map((t) => Object.assign({ mine: true }, t));
      return all.filter((t) => t.spaceId === f.spaceId);
    },
    async addTickets(list) {
      const u = need(["user", "company"]);
      const all = DB.all("tickets");
      let id = Math.max(100, ...all.map((t) => t.id)) + 1;
      const made = list.map((t) => ({
        id: id++,
        spaceId: t.spaceId,
        deskId: t.deskId,
        type: t.type,
        note: t.note || "",
        status: "new",
        userEmail: u.email,
        at: nowMs(),
      }));
      DB.save("tickets", all.concat(made));
      return made;
    },
    async setTicketStatus(id, status) {
      need(["owner", "admin"]);
      DB.patch("tickets", id, { status });
      return null;
    },

    /* ================= consultations ================= */
    async consults() {
      const u = me();
      let list = DB.all("consultations");
      if (u.role === "user") list = list.filter((c) => c.userEmail === u.email);
      else if (u.role === "company") list = list.filter((c) => c.companyId === u.companyId);
      else if (u.role === "expert") list = list.filter((c) => c.expertId === u.expertId);
      else if (u.role !== "admin") list = [];
      return list
        .map(enrichConsult)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.time < b.time ? 1 : -1));
    },
    async consultQuote(expertId) {
      const e = DB.find("experts", expertId);
      if (!e || e.status !== "approved") throw new Error("This expert is not available.");
      const baseFee = money(e.rate);
      const rate = expertCommissionRate();
      const commission = money((baseFee * rate) / 100);
      return { expert: e, baseFee, commission, fee: money(baseFee + commission), cut: commission, rate };
    },
    async addConsult(c) {
      /* backwards-compatible: addConsult({expertId, slot:{date,time}, ...}) */
      return Api.bookConsult(c);
    },
    async bookConsult(o) {
      const u = need(["user", "company"]);
      const cfg = settings();
      if (cfg.maintenance)
        throw new Error("Bookings are paused while the platform is under maintenance.");
      const e = DB.find("experts", o.expertId);
      if (!e || e.status !== "approved") throw new Error("This expert is not available.");
      if (!o.topic || o.topic.trim().length < 5)
        throw new Error("Describe what you need help with (at least a few words).");
      if (!Api._slotList(e).some((s) => s.date === o.date && s.time === o.time))
        throw new Error("That time slot was just taken. Pick another.");
      if (u.role === "company") {
        const co = DB.find("companies", u.companyId);
        if (!co || co.status !== "approved")
          throw new Error("Your company account is waiting for admin approval.");
      }
      const baseFee = money(e.rate);
      const rate = expertCommissionRate();
      const commission = money((baseFee * rate) / 100);
      const rec = {
        id: DB.nextId("C-", "consultations", 2000),
        expertId: e.id,
        userEmail: u.email,
        bookedBy: o.bookedBy || u.name,
        companyId: u.role === "company" ? u.companyId : undefined,
        payer: u.role === "company" ? "company" : "user",
        walletEmail: u.email,
        date: o.date,
        time: o.time,
        mode: o.mode || "online",
        spaceId: o.mode === "space" ? o.spaceId || e.spaceId : undefined,
        topic: o.topic.trim(),
        notes: o.notes || "",
        fee: money(baseFee + commission),
        baseFee,
        commission,
        cut: commission,
        rate,
        paymentStatus: "not_started",
        status: "requested",
        createdAt: nowMs(),
      };
      DB.add("consultations", rec);
      return enrichConsult(rec);
    },
    async payConsult(id, payment = {}) {
      const u = need(["user", "company"]);
      const c = DB.find("consultations", id);
      if (!c || (c.userEmail !== u.email && (!u.companyId || c.companyId !== u.companyId))) throw new Error("Session not found.");
      if (c.paymentStatus === "paid") return enrichConsult(c);
      if (c.status !== "approved") throw new Error("The expert must approve this request before payment.");
      if (payment.method !== "wallet") throw new Error("Card payments require a verified payment provider and are not available yet.");
      if (walletBalance(u.email) < c.fee) throw new Error("Your demo wallet balance is insufficient.");
      const updated = DB.patch("consultations", id, { status: "confirmed", method: "wallet", paymentStatus: "paid", paidAt: nowMs(), walletEmail: u.email });
      addTx({ email: u.email, type: "consultation", amount: -c.fee, desc: "Expert session", ref: id, method: "wallet" });
      return enrichConsult(updated);
    },
    async setConsultStatus(id, status) {
      const u = need(["expert", "user", "company", "admin"]);
      const c = DB.find("consultations", id);
      if (!c) throw new Error("Session not found.");
      if (u.role === "expert" && c.expertId !== u.expertId)
        throw new Error("This session belongs to another expert.");
      if (u.role === "user" && c.userEmail !== u.email)
        throw new Error("You cannot change this session.");
      if (u.role === "company" && c.companyId !== u.companyId)
        throw new Error("You cannot change this session.");
      if (["completed", "declined", "cancelled"].includes(c.status))
        throw new Error("This session is already closed.");
      if ((u.role === "user" || u.role === "company") && status !== "cancelled")
        throw new Error("Members can only cancel sessions.");
      if (u.role === "expert" && !["approved", "confirmed", "declined", "completed"].includes(status))
        throw new Error("Unknown status.");
      DB.patch("consultations", id, { status, ...(status === "cancelled" || status === "declined" ? { paymentStatus: "cancelled" } : {}) });
      if ((status === "declined" || status === "cancelled") && c.paymentStatus === "paid" && c.method === "wallet" && c.walletEmail)
        addTx({
          email: c.walletEmail,
          type: "refund",
          amount: c.fee,
          desc: "Refund · " + id,
          ref: id,
          method: c.method === "wallet" ? "wallet" : "card",
        });
      return null;
    },

    /* ================= wallet, payouts, invoices ================= */
    async wallet() {
      const u = need(["user", "company"]);
      const items = DB.all("transactions")
        .filter((t) => t.email === u.email)
        .map((t) => {
          if (!t.ref || !["booking", "consultation"].includes(t.type)) return t;
          const rec = DB.find(t.type === "booking" ? "bookings" : "consultations", t.ref);
          if (!rec || !Number.isFinite(rec.baseFee)) return t;
          return Object.assign({}, t, { breakdown: { baseFee: rec.baseFee, commission: Number.isFinite(rec.commission) ? rec.commission : rec.cut, rate: Number.isFinite(rec.rate) ? rec.rate : null } });
        })
        .sort((a, b) => b.at - a.at);
      const spent = money(
        -items
          .filter((t) => t.type !== "topup")
          .reduce((a, t) => a + t.amount, 0),
      );
      return {
        balance: walletBalance(u.email),
        transactions: items,
        spent,
        topups: money(items.filter((t) => t.type === "topup").reduce((a, t) => a + t.amount, 0)),
      };
    },
    async topUp(amount) {
      const u = need(["user", "company"]);
      const n = Number(amount);
      if (!(n >= 5 && n <= 2000)) throw new Error("Enter an amount between 5 and 2,000 JOD.");
      addTx({ email: u.email, type: "topup", amount: money(n), desc: "Demo wallet funds added · simulated balance only", method: "wallet" });
      return walletBalance(u.email);
    },
    async earnings() {
      const u = need(["expert", "owner"]);
      return earnings(u.email, u.role);
    },
    async requestPayout(amount, method) {
      const u = need(["expert", "owner"]);
      const e = earnings(u.email, u.role);
      const n = money(Number(amount));
      const min = settings().minPayout;
      if (!(n >= min)) throw new Error("The minimum payout is JOD " + min + ".");
      if (n > e.available)
        throw new Error("You can withdraw up to JOD " + e.available.toFixed(2) + " right now.");
      if (!method || method.trim().length < 4)
        throw new Error("Enter bank details (e.g. IBAN ending).");
      const p = {
        id: DB.nextId("P-", "payouts", 3000),
        email: u.email,
        name: u.name,
        role: u.role,
        amount: n,
        method: method.trim(),
        status: "requested",
        at: nowMs(),
        resolvedAt: null,
        note: "",
      };
      DB.add("payouts", p);
      return p;
    },
    async invoices() {
      const u = need(["user", "company"]);
      const out = [];
      DB.all("bookings")
        .filter((b) => b.userEmail === u.email || (u.companyId && b.companyId === u.companyId))
        .forEach((b) => out.push(Api._invoiceFrom(b, "booking", u)));
      DB.all("consultations")
        .filter((c) => c.userEmail === u.email || (u.companyId && c.companyId === u.companyId))
        .forEach((c) => out.push(Api._invoiceFrom(c, "consultation", u)));
      return out.sort((a, b) => b.at - a.at);
    },
    _invoiceFrom(rec, kind, u) {
      const isB = kind === "booking";
      const who = u || {};
      const company = who.companyId ? DB.find("companies", who.companyId) : null;
      const desc = isB
        ? spaceName(rec.spaceId) +
          " · " +
          rec.deskIds.join(", ") +
          " · " +
          NX.fmtDate(rec.date, { day: "numeric", month: "short", year: "numeric" }) +
          (rec.durationType === "hourly" ? " · " + rec.startTime + "–" + rec.endTime : " · Full day")
        : "Expert session with " +
          ((DB.find("experts", rec.expertId) || {}).name || "expert") +
          " · " +
          NX.fmtDate(rec.date, { day: "numeric", month: "short", year: "numeric" }) +
          " " +
          rec.time;
      const priceLines = Number.isFinite(rec.baseFee) && Number.isFinite(rec.commission ?? rec.cut)
        ? [
            { desc: (isB ? "Workspace" : "Expert") + " base price", qty: 1, unit: rec.baseFee, total: rec.baseFee },
            { desc: (isB ? "Workspace" : "Expert") + " commission (" + (Number.isFinite(rec.rate) ? rec.rate : money(((rec.commission ?? rec.cut) / rec.baseFee) * 100)) + "%)", qty: 1, unit: rec.commission ?? rec.cut, total: rec.commission ?? rec.cut },
          ]
        : [{ desc, qty: 1, unit: rec.fee, total: rec.fee }];
      const refunded = money(DB.all("transactions").filter((t) => t.ref === rec.id && t.type === "refund").reduce((sum, t) => sum + t.amount, 0));
      if (refunded > 0) priceLines.push({ desc: "Refund", qty: 1, unit: -refunded, total: -refunded });
      return {
        no: "INV-" + rec.id.replace("-", ""),
        ref: rec.id,
        kind,
        at: rec.createdAt,
        status: refunded >= rec.fee && refunded > 0 ? "cancelled" : rec.paymentStatus || rec.status,
        paymentStatus: rec.paymentStatus || (rec.method === "wallet" ? "paid" : "pending"),
        amount: money(rec.fee - refunded),
        method: rec.method,
        billTo: company ? company.name : who.name,
        billEmail: who.email,
        lines: priceLines,
      };
    },
    async invoice(ref) {
      const list = await Api.invoices();
      const i = list.find((x) => x.ref === ref);
      if (!i) throw new Error("Invoice not found.");
      return i;
    },

    /* ================= messaging ================= */
    async threads() {
      restoreDemoThreads();
      const u = me();
      return DB.all("threads")
        .filter((t) => t.participants.some((p) => p.email === u.email))
        .map((t) => {
          const last = t.messages[t.messages.length - 1];
          const other = t.participants.filter((p) => p.email !== u.email);
          const readAt = (t.reads || {})[u.email] || 0;
          const unread = t.messages.filter((m) => m.from !== u.email && m.at > readAt).length;
          return Object.assign({}, t, { other, last, unread });
        })
        .sort((a, b) => b.last.at - a.last.at);
    },
    async unread() {
      if (!NX.Auth.user()) return 0;
      return (await Api.threads()).reduce((a, t) => a + t.unread, 0);
    },
    async markRead(id) {
      restoreDemoThreads();
      const u = me();
      const t = DB.find("threads", id);
      if (!t) return;
      DB.patch("threads", id, { reads: Object.assign({}, t.reads, { [u.email]: nowMs() }) });
      saveDemoThreads();
    },
    async sendMessage(id, text) {
      restoreDemoThreads();
      const u = me();
      const t = DB.find("threads", id);
      if (!t || !t.participants.some((p) => p.email === u.email))
        throw new Error("Conversation not found.");
      const msg = String(text || "").trim();
      if (!msg) throw new Error("Write a message first.");
      if (msg.length > 1500) throw new Error("Messages can be up to 1,500 characters.");
      const m = { id: "m" + nowMs().toString(36), from: u.email, text: msg, at: nowMs() };
      DB.patch("threads", id, (x) => ({
        messages: x.messages.concat(m),
        reads: Object.assign({}, x.reads, { [u.email]: m.at }),
      }));
      saveDemoThreads();
      return m;
    },
    async contacts() {
      const u = me();
      const list = [];
      const add = (email, name, role, hint) => {
        if (email !== u.email && !list.some((c) => c.email === email))
          list.push({ email, name, role, hint });
      };
      const users = DB.all("users");
      const admin = users.find((x) => x.role === "admin");
      if (u.role === "user" || u.role === "company") {
        DB.all("experts")
          .filter((e) => e.status === "approved")
          .forEach((e) => add(e.email, e.name, "expert", e.title));
        DB.all("spaces")
          .filter((s) => s.status === "approved")
          .forEach((s) => {
            const o = users.find((x) => x.email === s.ownerEmail);
            if (o) add(o.email, o.name, "owner", "Owner · " + s.name);
          });
      } else if (u.role === "expert") {
        DB.all("consultations")
          .filter((c) => c.expertId === u.expertId)
          .forEach((c) => {
            const m = users.find((x) => x.email === c.userEmail);
            if (m)
              add(
                m.email,
                c.companyId ? (DB.find("companies", c.companyId) || m).name : m.name,
                m.role,
                "Client",
              );
          });
      } else if (u.role === "owner") {
        const ids = ownedSpaceIds(u.email);
        DB.all("bookings")
          .filter((b) => ids.includes(b.spaceId))
          .forEach((b) => {
            const m = users.find((x) => x.email === b.userEmail);
            if (m)
              add(
                m.email,
                b.companyId ? (DB.find("companies", b.companyId) || m).name : m.name,
                m.role,
                "Guest",
              );
          });
      } else {
        users.forEach((x) => add(x.email, x.name, x.role, NX.ROLES[x.role].label));
      }
      if (admin && u.role !== "admin") add(admin.email, "NEXUS Support", "admin", "Platform team");
      return list;
    },
    async startThread(o) {
      restoreDemoThreads();
      const u = me();
      const to = (await Api.contacts()).find((c) => c.email === o.to);
      if (!to) throw new Error("You cannot message this person.");
      const msg = String(o.text || "").trim();
      if (!msg) throw new Error("Write a message first.");
      const existing = DB.all("threads").find(
        (t) =>
          t.participants.some((p) => p.email === to.email) &&
          t.participants.some((p) => p.email === u.email) &&
          (t.subject || "") === (o.subject || ""),
      );
      if (existing) {
        await Api.sendMessage(existing.id, msg);
        return existing.id;
      }
      const t = {
        id: DB.nextId("th", "threads", 10),
        subject: (o.subject || "New conversation").slice(0, 80),
        participants: [
          {
            email: u.email,
            name: u.role === "company" ? (DB.find("companies", u.companyId) || u).name : u.name,
            role: u.role,
          },
          { email: to.email, name: to.name, role: to.role },
        ],
        ctx: o.ctx || {},
        reads: { [u.email]: nowMs() },
        messages: [{ id: "m" + nowMs().toString(36), from: u.email, text: msg, at: nowMs() }],
      };
      DB.add("threads", t);
      saveDemoThreads();
      return t.id;
    },

    /* ================= favorites ================= */
    async favorites() {
      const u = need(["user", "company"]);
      const f = DB.obj("favorites")[u.email] || { spaces: [], experts: [] };
      return { spaces: f.spaces || [], experts: f.experts || [] };
    },
    async toggleFavorite(kind, id) {
      const u = need(["user", "company"]);
      const all = DB.obj("favorites");
      const f = all[u.email] || { spaces: [], experts: [] };
      const key = kind === "expert" ? "experts" : "spaces";
      const on = !f[key].includes(id);
      f[key] = on ? f[key].concat(id) : f[key].filter((x) => x !== id);
      all[u.email] = f;
      DB.save("favorites", all);
      return on;
    },

    /* ================= feedback ================= */
    async addFeedback(o) {
      const u = me();
      const rating = Number(o.rating);
      if (!(rating >= 1 && rating <= 5)) throw new Error("Choose a star rating.");
      const text = String(o.text || "").trim();
      if (text.length < 10) throw new Error("Please write at least 10 characters.");
      if (text.length > 800) throw new Error("Feedback can be up to 800 characters.");
      if (o.refId && DB.all("feedback").some((f) => f.refId === o.refId && f.from === u.email))
        throw new Error("You already left feedback for this.");
      const f = {
        id: DB.nextId("F-", "feedback", 6000),
        kind: o.kind,
        refId: o.refId || "",
        targetId: o.targetId || "",
        from: u.email,
        fromName: o.bookedBy || u.name,
        role: u.role,
        rating,
        tags: o.tags || [],
        text,
        at: nowMs(),
      };
      DB.add("feedback", f);
      return f;
    },
    async feedbackList() {
      const u = me();
      const all = DB.all("feedback");
      let list = [];
      if (u.role === "company") list = all.filter((f) => f.from === u.email);
      else if (u.role === "user") list = all.filter((f) => f.from === u.email);
      else if (u.role === "owner") {
        const ids = ownedSpaceIds(u.email);
        list = all.filter((f) => f.kind === "space" && ids.includes(f.targetId));
      } else if (u.role === "expert")
        list = all.filter((f) => f.kind === "expert" && f.targetId === u.expertId);
      else list = all;
      return list
        .map((f) =>
          Object.assign({}, f, {
            targetName:
              f.kind === "space"
                ? spaceName(f.targetId)
                : f.kind === "expert"
                  ? (DB.find("experts", f.targetId) || {}).name
                  : "NEXUS platform",
          }),
        )
        .sort((a, b) => b.at - a.at);
    },
    async pendingReviews() {
      const u = need(["user", "company"]);
      const given = DB.all("feedback")
        .filter((f) => f.from === u.email)
        .map((f) => f.refId);
      const mineB = (await Api.bookings())
        .filter((b) => b.status === "completed" && !given.includes(b.id))
        .map((b) => ({
          kind: "space",
          refId: b.id,
          targetId: b.spaceId,
          title: b.spaceName,
          date: b.date,
          bookedBy: b.bookedBy,
        }));
      const mineC = (await Api.consults())
        .filter((c) => c.status === "completed" && !given.includes(c.id))
        .map((c) => ({
          kind: "expert",
          refId: c.id,
          targetId: c.expertId,
          title: c.expertName,
          date: c.date,
          bookedBy: c.bookedBy,
        }));
      return mineB.concat(mineC).sort((a, b) => (a.date < b.date ? 1 : -1));
    },

    /* ================= profile & settings ================= */
    async me() {
      return clone(me());
    },
    async updateProfile(p) {
      const u = me();
      const name = String(p.name || "").trim();
      if (name.length < 2) throw new Error("Enter your full name.");
      if (p.phone && !/^[+\d\s()-]{7,20}$/.test(p.phone))
        throw new Error("Enter a valid phone number.");
      DB.patch("users", u.id, {
        name,
        phone: p.phone || "",
        city: p.city || "",
        bio: (p.bio || "").slice(0, 300),
      });
      if (u.role === "expert") DB.patch("experts", u.expertId, { name });
      return clone(me());
    },
    async changePassword(oldPass, newPass) {
      const u = me();
      if (u.ph !== NX.hash(oldPass)) throw new Error("Your current password is incorrect.");
      if (String(newPass).length < 8 || !/\d/.test(newPass) || !/[A-Za-z]/.test(newPass))
        throw new Error("Use at least 8 characters with letters and numbers.");
      DB.patch("users", u.id, { ph: NX.hash(newPass) });
    },
    async prefs() {
      const u = me();
      return Object.assign(
        {
          emailNotif: true,
          pushNotif: false,
          marketing: false,
          bookingAlerts: true,
          timezone: "Asia/Amman",
        },
        DB.obj("prefs")[u.email] || {},
      );
    },
    async savePrefs(p) {
      const u = me();
      const all = DB.obj("prefs");
      all[u.email] = p;
      DB.save("prefs", all);
    },
    async closeAccount() {
      const u = me();
      if (u.role === "admin") throw new Error("Admin accounts cannot be closed here.");
      DB.patch("users", u.id, { status: "suspended", closedByUser: true });
      NX.Auth.logout();
    },
    async addSupport(o) {
      const u = me();
      if (!o.subject || o.subject.trim().length < 4) throw new Error("Add a short subject.");
      if (!o.message || o.message.trim().length < 10)
        throw new Error("Describe the problem in at least 10 characters.");
      const s = {
        id: DB.nextId("S-", "support", 7000),
        email: u.email,
        name: u.name,
        role: u.role,
        category: o.category || "General",
        subject: o.subject.trim(),
        message: o.message.trim(),
        status: "open",
        at: nowMs(),
        reply: "",
      };
      DB.add("support", s);
      return s;
    },
    async supportList() {
      const u = me();
      const all = DB.all("support");
      return (u.role === "admin" ? all : all.filter((s) => s.email === u.email)).sort(
        (a, b) => b.at - a.at,
      );
    },
    async replySupport(id, reply) {
      need("admin");
      if (!reply || reply.trim().length < 3) throw new Error("Write a reply first.");
      DB.patch("support", id, { reply: reply.trim(), status: "resolved" });
    },

    /* expert */
    async myExpert() {
      const u = need("expert");
      return clone(DB.find("experts", u.expertId));
    },
    async updateExpert(p) {
      const u = need("expert");
      if (!p.title || p.title.trim().length < 4) throw new Error("Add a professional headline.");
      if (!(Number(p.rate) >= 5 && Number(p.rate) <= 300))
        throw new Error("Session rate must be between JOD 5 and JOD 300.");
      if (!p.skills || !p.skills.length) throw new Error("Pick at least one specialty.");
      if (!p.modes || !p.modes.length) throw new Error("Pick at least one session type.");
      return DB.patch("experts", u.expertId, {
        title: p.title.trim(),
        bio: (p.bio || "").slice(0, 600),
        rate: Number(p.rate),
        skills: p.skills,
        modes: p.modes,
        languages: p.languages || ["Arabic", "English"],
        city: p.city || "",
        why: (p.why || "").slice(0, 120) || DB.find("experts", u.expertId).why,
      });
    },
    async saveAvailability(avail) {
      const u = need("expert");
      if (!avail.days.length || !avail.times.length)
        throw new Error("Choose at least one day and one time.");
      DB.patch("experts", u.expertId, { avail });
    },

    /* company */
    async myCompany() {
      const u = need("company");
      return clone(DB.find("companies", u.companyId));
    },
    async updateCompany(p) {
      const u = need("company");
      if (!p.name || p.name.trim().length < 2) throw new Error("Enter the company name.");
      return DB.patch("companies", u.companyId, {
        name: p.name.trim(),
        industry: p.industry,
        size: p.size,
        city: p.city,
        taxId: p.taxId || "",
        website: p.website || "",
        monthlyBudget: Math.max(0, Number(p.monthlyBudget) || 0),
      });
    },
    async addTeamMember(m) {
      const u = need("company");
      if (!m.name || m.name.trim().length < 2) throw new Error("Enter the member's name.");
      if (!/^\S+@\S+\.\S+$/.test(m.email || "")) throw new Error("Enter a valid work email.");
      const co = DB.find("companies", u.companyId);
      if (co.team.some((t) => t.email.toLowerCase() === m.email.toLowerCase()))
        throw new Error("This person is already on your team.");
      co.team.push({
        id: "m" + nowMs().toString(36),
        name: m.name.trim(),
        email: m.email.trim(),
        title: m.title || "Team member",
        admin: false,
      });
      DB.patch("companies", co.id, { team: co.team });
    },
    async removeTeamMember(id) {
      const u = need("company");
      const co = DB.find("companies", u.companyId);
      const t = co.team.find((x) => x.id === id);
      if (t && t.admin) throw new Error("The account admin cannot be removed.");
      DB.patch("companies", co.id, { team: co.team.filter((x) => x.id !== id) });
    },

    /* owner */
    async mySpaces() {
      const u = need("owner");
      return DB.all("spaces")
        .filter((s) => s.ownerEmail === u.email)
        .map((s) => Object.assign(spaceView(s, NX.todayISO), { raw: clone(s) }));
    },
    async addSpace(d) {
      const u = need("owner");
      if (!d.name || d.name.trim().length < 3) throw new Error("Give your space a name.");
      if (!(d.desks >= 1 && d.desks <= 80)) throw new Error("Desk count must be between 1 and 80.");
      if (!(d.price >= 1 && d.price <= 200))
        throw new Error("Daily price must be between JOD 1 and JOD 200.");
      const id = DB.nextId("s", "spaces", 7);
      const sp = {
        id,
        name: d.name.trim(),
        area: d.area.trim(),
        city: d.city,
        price: Number(d.price),
        desks: Number(d.desks),
        quiet: d.quiet,
        rating: null,
        hue: NX.hue(d.name),
        am: d.am || [],
        load: 0,
        ownerEmail: u.email,
        status: "pending",
        paused: false,
        instant: true,
        isNew: true,
        description: d.description || "",
        address: d.area.trim() + ", " + d.city,
        hours: d.hours || "Sun–Thu 09:00–18:00",
        created: nowMs(),
      };
      buildPlan(sp, 90 + DB.all("spaces").length);
      DB.add("spaces", sp);
      DB.add("approvals", {
        id: DB.nextId("A-", "approvals", 4000),
        type: "space",
        refId: id,
        title: sp.name,
        subtitle: "New workspace · " + sp.desks + " desks · JOD " + sp.price + "/day",
        submittedBy: u.name,
        email: u.email,
        at: nowMs(),
        status: "pending",
        decidedAt: null,
        note: "",
      });
      NX.Auth.audit(u.email, "Submitted listing", sp.name);
      return spaceView(sp, NX.todayISO);
    },
    async updateSpace(id, p) {
      const u = need("owner");
      const s = DB.find("spaces", id);
      if (!s || s.ownerEmail !== u.email) throw new Error("This space is not yours.");
      if (p.price !== undefined && !(Number(p.price) >= 1 && Number(p.price) <= 200))
        throw new Error("Daily price must be between JOD 1 and JOD 200.");
      if (p.name !== undefined && p.name.trim().length < 3)
        throw new Error("Give your space a name.");
      const patch = {};
      ["name", "area", "city", "description", "hours", "am", "instant", "paused"].forEach((k) => {
        if (p[k] !== undefined) patch[k] = p[k];
      });
      if (p.price !== undefined) patch.price = Number(p.price);
      if (p.name !== undefined || p.area !== undefined || p.city !== undefined)
        patch.address = (p.area || s.area) + ", " + (p.city || s.city);
      return DB.patch("spaces", id, patch);
    },
    async setDeskBlocked(spaceId, deskId, blocked) {
      const u = need("owner");
      const s = DB.find("spaces", spaceId);
      if (!s || s.ownerEmail !== u.email) throw new Error("This space is not yours.");
      DB.patch("spaces", spaceId, {
        plan: s.plan.map((d) => (d.id === deskId ? Object.assign({}, d, { blocked }) : d)),
      });
    },
    async setDeskCount(spaceId, count) {
      const u = need("owner");
      const s = DB.find("spaces", spaceId);
      if (!s || s.ownerEmail !== u.email) throw new Error("This space is not yours.");
      count = Number(count);
      if (!(count >= 1 && count <= 80)) throw new Error("Desk count must be between 1 and 80.");
      const q = Math.round(count * (s.quiet == null ? 0.5 : s.quiet));
      const plan = [];
      for (let k = 0; k < count; k++) {
        const id = "T" + String(k + 1).padStart(2, "0");
        const old = s.plan.find((d) => d.id === id);
        plan.push(old || { id, zone: k < q ? "quiet" : "social", base: false });
      }
      const used = DB.all("bookings").some(
        (b) =>
          b.spaceId === spaceId &&
          isLive(b) &&
          b.date >= NX.todayISO &&
          b.deskIds.some((d) => !plan.some((p) => p.id === d)),
      );
      if (used)
        throw new Error(
          "Some removed desks have upcoming bookings. Cancel or move those bookings first.",
        );
      DB.patch("spaces", spaceId, { plan, desks: count });
    },

    /* ================= admin ================= */
    async adminStats() {
      need("admin");
      const bookings = DB.all("bookings");
      const consults = DB.all("consultations");
      const live = bookings.filter((b) => b.status === "completed" || b.status === "confirmed");
      const liveC = consults.filter((c) => c.status === "completed" || c.status === "confirmed");
      const gmv = money(live.reduce((a, b) => a + b.fee, 0) + liveC.reduce((a, c) => a + c.fee, 0));
      const revenue = money(
        live.reduce((a, b) => a + b.cut, 0) + liveC.reduce((a, c) => a + c.cut, 0),
      );
      const users = DB.all("users");
      return {
        gmv,
        revenue,
        bookings: bookings.length,
        consults: consults.length,
        members: users.filter((u) => u.role === "user").length,
        owners: users.filter((u) => u.role === "owner").length,
        experts: DB.all("experts").length,
        companies: DB.all("companies").length,
        spaces: DB.all("spaces").filter((s) => s.status === "approved").length,
        pendingApprovals: DB.all("approvals").filter((a) => a.status === "pending").length,
        pendingPayouts: DB.all("payouts").filter((p) => p.status === "requested").length,
        openSupport: DB.all("support").filter((s) => s.status === "open").length,
        audit: DB.all("audit").slice(0, 8),
      };
    },
    async adminAccounts(kind) {
      need("admin");
      const users = DB.all("users");
      if (kind === "experts")
        return DB.all("experts").map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          sub: e.title,
          status: e.status === "approved" ? "active" : e.status,
          created: e.created,
          kind,
        }));
      if (kind === "companies")
        return DB.all("companies").map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          sub: c.industry + " · " + c.city,
          status: c.status === "approved" ? "active" : c.status,
          created: c.created,
          kind,
        }));
      if (kind === "spaces")
        return DB.all("spaces").map((s) => ({
          id: s.id,
          name: s.name,
          email: s.ownerEmail,
          sub: s.area + ", " + s.city + " · " + s.desks + " desks",
          status: s.paused ? "paused" : s.status === "approved" ? "active" : s.status,
          created: s.created,
          kind,
        }));
      const role = kind === "owners" ? "owner" : "user";
      return users
        .filter((u) => u.role === role)
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          sub: u.city || "",
          status: u.status,
          created: u.created,
          kind,
        }));
    },
    async setAccountStatus(kind, id, status) {
      const admin = need("admin");
      if (kind === "experts")
        DB.patch("experts", id, { status: status === "active" ? "approved" : status });
      else if (kind === "companies")
        DB.patch("companies", id, { status: status === "active" ? "approved" : status });
      else if (kind === "spaces")
        DB.patch(
          "spaces",
          id,
          status === "paused"
            ? { paused: true }
            : { paused: false, status: status === "active" ? "approved" : status },
        );
      else DB.patch("users", id, { status });
      NX.Auth.audit(admin.email, "Set " + kind + " " + id, status);
    },
    async approvals() {
      need("admin");
      return DB.all("approvals").sort((a, b) => b.at - a.at);
    },
    async decideApproval(id, decision, note) {
      const admin = need("admin");
      const a = DB.find("approvals", id);
      if (!a || a.status !== "pending") throw new Error("This request was already reviewed.");
      if (decision === "rejected" && (!note || note.trim().length < 5))
        throw new Error("Add a short reason so the applicant knows what to fix.");
      const ok = decision === "approved";
      if (a.type === "space")
        DB.patch("spaces", a.refId, { status: ok ? "approved" : "rejected", isNew: ok });
      if (a.type === "expert")
        DB.patch("experts", a.refId, { status: ok ? "approved" : "rejected" });
      if (a.type === "company")
        DB.patch("companies", a.refId, { status: ok ? "approved" : "rejected" });
      DB.patch("approvals", id, {
        status: decision,
        decidedAt: nowMs(),
        note: (note || "").trim(),
      });
      NX.Auth.audit(admin.email, (ok ? "Approved " : "Rejected ") + a.type, a.title);
    },
    async payouts() {
      need("admin");
      return DB.all("payouts").sort((a, b) => b.at - a.at);
    },
    async decidePayout(id, decision, note) {
      const admin = need("admin");
      const p = DB.find("payouts", id);
      if (!p || p.status !== "requested") throw new Error("This payout was already processed.");
      if (decision === "rejected" && (!note || note.trim().length < 5))
        throw new Error("Add a short reason for rejecting.");
      DB.patch("payouts", id, {
        status: decision === "paid" ? "paid" : "rejected",
        resolvedAt: nowMs(),
        note: (note || "").trim(),
      });
      NX.Auth.audit(
        admin.email,
        decision === "paid" ? "Paid payout" : "Rejected payout",
        id + " · JOD " + p.amount,
      );
    },
    async adminFinance() {
      need("admin");
      const rows = [];
      DB.all("bookings")
        .filter((b) => b.status === "completed" || b.status === "confirmed")
        .forEach((b) =>
          rows.push({
            id: b.id,
            kind: "Desk booking",
            date: b.date,
            gross: b.fee,
            cut: b.cut,
            who: spaceName(b.spaceId),
            status: b.status,
          }),
        );
      DB.all("consultations")
        .filter((c) => c.status === "completed" || c.status === "confirmed")
        .forEach((c) =>
          rows.push({
            id: c.id,
            kind: "Expert session",
            date: c.date,
            gross: c.fee,
            cut: c.cut,
            who: (DB.find("experts", c.expertId) || {}).name,
            status: c.status,
          }),
        );
      rows.sort((a, b) => (a.date < b.date ? 1 : -1));
      return rows;
    },
    async allThreadsCount() {
      return DB.all("threads").length;
    },
    async settings() {
      return Object.assign({}, clone(settings()), {
        commission: expertCommissionRate(),
        expertCommission: expertCommissionRate(),
        workspaceCommission: workspaceCommissionRate(),
      });
    },
    async saveSettings(p) {
      const admin = need("admin");
      const c = Number(p.commission);
      if (!(c >= 0 && c <= 40)) throw new Error("Commission must be between 0% and 40%.");
      if (!(Number(p.minPayout) >= 1)) throw new Error("Minimum payout must be at least JOD 1.");
      if (!(Number(p.cancelHours) >= 0 && Number(p.cancelHours) <= 168))
        throw new Error("Cancellation window must be 0–168 hours.");
      if (!(Number(p.bookingWindow) >= 1 && Number(p.bookingWindow) <= 120))
        throw new Error("Booking window must be 1–120 days.");
      const next = Object.assign({}, settings(), {
        commission: c,
        expertCommission: c,
        workspaceCommission: workspaceCommissionRate(),
        minPayout: Number(p.minPayout),
        cancelHours: Number(p.cancelHours),
        bookingWindow: Number(p.bookingWindow),
        maintenance: !!p.maintenance,
        allowSignups: !!p.allowSignups,
        supportEmail: p.supportEmail || "hello@nexus.jo",
      });
      DB.save("settings", next);
      NX.Auth.audit(admin.email, "Updated platform settings", "Commission " + c + "%");
      return next;
    },
    async resetDemo() {
      need("admin");
      DB.reset();
      NX.Auth.logout();
    },
    async publicSettings() {
      return {
        maintenance: !!settings().maintenance,
        allowSignups: settings().allowSignups !== false,
        cancelHours: settings().cancelHours,
        bookingWindow: Number(settings().bookingWindow) || 30,
        commission: expertCommissionRate(),
        workspaceCommission: workspaceCommissionRate(),
        expertCommission: expertCommissionRate(),
      };
    },
  };
  NX.Api = Api;
})();

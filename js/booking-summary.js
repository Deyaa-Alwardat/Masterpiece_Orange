/* NEXUS — booking summary: review stage before checkout (?space=&desks=&date=) or booking detail (?id=) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const id = NX.qs("id");
  const pg = NX.Portal.init({
    role: ["user", "company"],
    page: "{role}-bookings",
    title: id ? "Booking details" : "Booking summary",
    sub: id
      ? "Everything about this reservation."
      : "Step 1 of 2 — review your booking before you pay.",
    actions: `<button class="btn btn-ghost" id="backBtn" type="button">${NX.ic("arrow-l")}<span>Back</span></button>`,
  });
  if (!pg) return;
  const role = NX.Auth.role();
  NX.$("#backBtn").addEventListener("click", () =>
    history.length > 1 ? history.back() : (location.href = NX.page(role + "-bookings")),
  );

  const steps = (n) =>
    `<ol class="steps" aria-label="Booking steps">${["Choose desk", "Review", "Pay", "Done"].map((s, i) => `<li class="${i < n ? "done" : i === n ? "now" : ""}"><span>${i < n ? "✓" : i + 1}</span>${s}</li>`).join("")}</ol>`;

  try {
    if (id) await detail(id);
    else await review();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }

  /* ---------- review ---------- */
  async function review() {
    const spaceId = NX.qs("space");
    const desks = (NX.qs("desks") || "").split(",").filter(Boolean);
    const date = NX.qs("date") || NX.todayISO;
    const durationType = NX.qs("durationType") === "hourly" ? "hourly" : "daily";
    const startTime = NX.qs("startTime") || "";
    const endTime = NX.qs("endTime") || "";
    const slot = { durationType, startTime, endTime };
    if (!spaceId || !desks.length) {
      pg.innerHTML = NX.empty(
        "desk",
        "No desks selected",
        "Choose a space and pick your desks first.",
        `<a class="btn btn-primary" href="${NX.page("spaces")}">Browse spaces</a>`,
      );
      return;
    }
    let q;
    try {
      q = await NX.Api.quote(spaceId, desks, date, slot);
    } catch (e) {
      pg.innerHTML = NX.empty(
        "alert",
        "We can't prepare this booking",
        e.message,
            `<a class="btn btn-primary" href="${NX.page("space", { id: spaceId, date, durationType, ...(durationType === "hourly" ? { startTime, endTime } : {}) })}">Back to space</a>`,
      );
      return;
    }
    const taken = q.desks.filter((d) => d.busy || d.blocked);
    const cfg = await NX.Api.publicSettings();
    pg.innerHTML = `${steps(1)}
      <div class="g-main">
        <div class="stack">
          <div class="panel card">
            <div class="panel-h"><h2>${esc(q.space.name)}</h2><a class="link" href="${NX.page("space", { id: q.space.id, date, zone: q.desks[0]?.zone, durationType, ...(durationType === "hourly" ? { startTime, endTime } : {}) })}">Change desks</a></div>
            <div class="row"><span class="muted">Location</span><b>${esc(q.space.area)}, ${esc(q.space.city)}</b></div>
            <div class="row"><span class="muted">Date</span><b>${NX.fmtDate(date)}</b></div>
            <div class="row"><span class="muted">Booking length</span><b>${durationType === "hourly" ? `${esc(NX.fmtTime(startTime))}–${esc(NX.fmtTime(endTime))} · ${q.durationHours} ${q.durationHours === 1 ? "hour" : "hours"}` : "Full day"}</b></div>
            <div class="row"><span class="muted">Hours</span><b>${esc(q.space.hours.replace(/\b\d{1,2}:\d{2}\b/g, (time) => NX.fmtTime(time)))}</b></div>
            <div class="row"><span class="muted">Desks</span><b>${q.desks.map((d) => esc(d.id) + " (" + d.zone + ")").join(", ")}</b></div>
            <div class="row"><span class="muted">Confirmation</span><b>${q.instant ? "Instant" : "Needs owner approval"}</b></div>
          </div>
          ${taken.length ? `<div class="banner">${NX.ic("alert")}<span>Desk ${taken.map((d) => esc(d.id)).join(", ")} is no longer available. Go back and pick another desk.</span></div>` : ""}
          ${q.instant ? "" : `<div class="banner info">${NX.ic("clock")}<span>This space reviews each booking. You are charged now and refunded automatically if the owner declines.</span></div>`}
          <div class="panel card"><div class="panel-h"><h3>Cancellation policy</h3></div>
            <p class="muted">Cancel at least ${cfg.cancelHours} hours before the booking day for a full refund. Later cancellations are not refunded. If the owner cancels, you are always refunded in full.</p></div>
        </div>
        <aside class="stack">
          <div class="panel card">
            <div class="panel-h"><h3>Price</h3></div>
            <div class="row"><span class="muted">Base price</span><b>${NX.jod(q.baseFee)}</b></div>
            <div class="row"><span class="muted">Workspace commission (${q.rate}%)</span><b>${NX.jod(q.commission)}</b></div>
            <div class="row"><span>Total</span><span class="total">${NX.jod(q.fee)}</span></div>
            <a class="btn btn-primary btn-lg btn-block${taken.length ? " disabled" : ""}" ${taken.length ? 'aria-disabled="true"' : ""} href="${taken.length ? "#" : NX.page("checkout", { space: spaceId, desks: desks.join(","), date, durationType, ...(durationType === "hourly" ? { startTime, endTime } : {}) })}">Continue to checkout ${NX.ic("arrow-r")}</a>
            <p class="hint" style="margin-top:.8rem">Demo checkout — no real payment.</p>
          </div>
        </aside>
      </div>`;
  }

  /* ---------- detail ---------- */
  async function detail(bid) {
    const b = await NX.Api.booking(bid);
    const reviews = await NX.Api.pendingReviews();
    const canReview = reviews.some((r) => r.refId === b.id);
    const canCancel = ["confirmed", "pending"].includes(b.status);
    const stage = { pending: 1, confirmed: 2, completed: 3, cancelled: -1 }[b.status];
    const tl =
      b.status === "cancelled"
        ? `<div class="banner">${NX.ic("alert")}<span>This booking was cancelled${b.cancelledBy ? " by the " + (b.cancelledBy === "owner" ? "space owner" : "member") : ""}${b.refunded ? " and refunded." : "."}</span></div>`
        : `<ol class="steps">${["Requested", "Awaiting owner", "Confirmed", "Completed"]
            .map((s, i) => {
              const n = { pending: 1, confirmed: 2, completed: 3 }[b.status];
              return `<li class="${i < n ? "done" : i === n ? "now" : ""}"><span>${i < n ? "✓" : i + 1}</span>${s}</li>`;
            })
            .join("")}</ol>`;
    pg.innerHTML = `
      ${tl}
      <div class="g-main">
        <div class="stack">
          <div class="panel card">
            <div class="panel-h"><h2>${esc(b.spaceName)}</h2>${NX.status(b.status)}</div>
            <div class="row"><span class="muted">Booking ID</span><b>${esc(b.id)}</b></div>
            <div class="row"><span class="muted">Date</span><b>${NX.fmtDate(b.date)}</b></div>
            ${b.durationType === "hourly" ? `<div class="row"><span class="muted">Time</span><b>${esc(NX.fmtTime(b.startTime))}–${esc(NX.fmtTime(b.endTime))} (${b.durationHours} ${b.durationHours === 1 ? "hour" : "hours"})</b></div>` : `<div class="row"><span class="muted">Booking length</span><b>Full day</b></div>`}
            <div class="row"><span class="muted">Desks</span><b>${esc(b.deskIds.map((deskId) => b.deskZones?.[deskId] ? `${deskId} (${b.deskZones[deskId]})` : deskId).join(", "))}</b></div>
            <div class="row"><span class="muted">Location</span><b>${esc(b.spaceArea)}, ${esc(b.spaceCity)}</b></div>
            ${b.bookedBy ? `<div class="row"><span class="muted">Booked for</span><b>${esc(b.bookedBy)}</b></div>` : ""}
            <div class="row"><span class="muted">Payment</span><b>${b.method === "wallet" ? "NEXUS demo wallet" : "Legacy simulated card payment"}</b></div>
            ${Number.isFinite(b.baseFee) ? `<div class="row"><span class="muted">Base price</span><b>${NX.jod(b.baseFee)}</b></div><div class="row"><span class="muted">Workspace commission (${b.rate}%)</span><b>${NX.jod(b.commission || b.cut)}</b></div>` : ""}
            <div class="row"><span>Total</span><span class="total">${NX.jod(b.fee)}</span></div>
          </div>
        </div>
        <aside class="stack">
          <div class="panel card"><div class="panel-h"><h3>Actions</h3></div>
            <div class="stack">
              <a class="btn btn-ghost btn-block" href="${NX.page("space", { id: b.spaceId, date: b.date, durationType: b.durationType || "daily", ...(b.durationType === "hourly" ? { startTime: b.startTime, endTime: b.endTime } : {}) })}">${NX.ic("building")}<span>View space</span></a>
              ${b.status !== "cancelled" ? `<button class="btn btn-ghost btn-block" id="ics" type="button">${NX.ic("calendar")}<span>Add to calendar</span></button>` : ""}
              <button class="btn btn-ghost btn-block" id="inv" type="button">${NX.ic("receipt")}<span>View invoice</span></button>
              ${b.ownerEmail ? `<a class="btn btn-ghost btn-block" href="${NX.page(role + "-messages", { to: b.ownerEmail, subject: "Booking " + b.id })}">${NX.ic("inbox")}<span>Message the owner</span></a>` : ""}
              ${["confirmed"].includes(b.status) && b.date <= NX.todayISO ? `<a class="btn btn-ghost btn-block" href="${NX.page("services")}">${NX.ic("zap")}<span>Request a desk service</span></a>` : ""}
              ${canReview ? `<button class="btn btn-primary btn-block" id="rev" type="button">${NX.ic("star")}<span>Leave feedback</span></button>` : ""}
              ${canCancel ? `<button class="btn btn-danger btn-block" id="cx" type="button">Cancel booking</button>` : ""}
            </div></div>
        </aside>
      </div>`;
    const on = (sel, fn) => {
      const el = NX.$(sel, pg);
      if (el) el.addEventListener("click", fn);
    };
    on("#ics", () =>
      NX.downloadICS({
        title: "NEXUS desk · " + b.spaceName,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        durationType: b.durationType,
        location: b.spaceArea + ", " + b.spaceCity,
        desc: "Desks: " + b.deskIds.join(", ") + (b.durationType === "hourly" ? " · " + NX.fmtTime(b.startTime) + "–" + NX.fmtTime(b.endTime) : " · Full day"),
      }),
    );
    on("#inv", () => NX.openInvoice(b.id));
    on("#rev", () =>
      NX.Feedback.open(
        {
          kind: "space",
          refId: b.id,
          targetId: b.spaceId,
          title: b.spaceName,
          bookedBy: b.bookedBy,
        },
        () => location.reload(),
      ),
    );
    on("#cx", async (e) => {
      const cfg = await NX.Api.publicSettings();
      const refund =
        (new Date(b.date + "T09:00:00").getTime() - Date.now()) / 3600000 > cfg.cancelHours;
      if (
        !(await NX.confirm(
          "Cancel this booking?",
          refund
            ? "You will be refunded " + NX.jod(b.fee) + "."
            : "This is inside the " + cfg.cancelHours + "-hour window, so no refund applies.",
          "Cancel booking",
          true,
        ))
      )
        return;
      await NX.run(e.currentTarget, async () => {
        await NX.Api.cancelBooking(b.id);
        NX.toast("Booking cancelled.");
        location.reload();
      });
    });
  }
});

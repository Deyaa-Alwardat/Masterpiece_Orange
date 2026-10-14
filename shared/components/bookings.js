/* NEXUS — shared component: member/company bookings list (desk bookings + expert sessions).
   NX.BookingsView.mount(root, { company: true|false }) — needs account.js (feedback) and wallet.js (invoice). */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;

  NX.BookingsView = {
    async mount(root, o) {
      o = o || {};
      let tab = NX.qs("tab") === "sessions" ? "sessions" : "spaces";
      let status = "";
      let q = "";
      let data = null;
      let bookingGroup = "upcoming";

      async function load() {
        const [bookingsResult, consultsResult, reviewsResult] = await Promise.allSettled([
          NX.Api.bookings(),
          NX.Api.consults(),
          NX.Api.pendingReviews(),
        ]);
        if (bookingsResult.status === "rejected") throw bookingsResult.reason;
        data = {
          bookings: bookingsResult.value,
          consults: consultsResult.status === "fulfilled" ? consultsResult.value : [],
          reviewIds: reviewsResult.status === "fulfilled" ? reviewsResult.value.map((r) => r.refId) : [],
          sessionsError:
            consultsResult.status === "rejected"
              ? consultsResult.reason
              : reviewsResult.status === "rejected"
                ? reviewsResult.reason
                : null,
        };
        draw();
      }

      function draw() {
        const B = data.bookings,
          C = data.consults;
        const bookingGroups = {
          upcoming: B.filter(
            (booking) =>
              booking.status !== "cancelled" &&
              booking.status !== "completed" &&
              booking.date >= NX.todayISO,
          ),
          past: B.filter(
            (booking) =>
              booking.status !== "cancelled" &&
              (booking.status === "completed" || booking.date < NX.todayISO),
          ),
          cancelled: B.filter((booking) => booking.status === "cancelled"),
        };
        const visibleBookings = o.company ? B : bookingGroups[bookingGroup];
        const sourceList = tab === "spaces" ? visibleBookings : C;
        const list = sourceList.filter((x) => {
          const hay =
            tab === "spaces"
              ? [
                  x.spaceName,
                  x.spaceArea,
                  x.spaceCity,
                  (x.deskIds || []).join(" "),
                  x.bookedBy,
                  x.id,
                ].join(" ")
              : x.expertName + " " + x.bookedBy + " " + x.topic + " " + x.id;
          return (!status || x.status === status) && (!q || hay.toLowerCase().includes(q));
        });
        const statuses =
          tab === "spaces"
            ? ["confirmed", "pending", "completed", "cancelled"]
            : ["requested", "approved", "confirmed", "completed", "declined", "cancelled"];
        root.innerHTML = `
          <div class="tabs" role="tablist">
            <button class="tab" role="tab" data-tab="spaces" aria-selected="${tab === "spaces"}">${NX.ic("desk")} Desk bookings <span class="n">${B.length}</span></button>
            <button class="tab" role="tab" data-tab="sessions" aria-selected="${tab === "sessions"}">${NX.ic("briefcase")} Expert sessions <span class="n">${C.length}</span></button>
          </div>
          ${!o.company && tab === "spaces" ? `<nav class="booking-groups" aria-label="Filter desk bookings">
            ${[
              ["upcoming", "Upcoming"],
              ["past", "Past"],
              ["cancelled", "Cancelled"],
            ]
              .map(
                ([key, label]) =>
                  `<button class="booking-group" type="button" data-booking-group="${key}" aria-pressed="${bookingGroup === key}">${label}<span>${bookingGroups[key].length}</span></button>`,
              )
              .join("")}
          </nav>` : ""}
          ${data.sessionsError ? `<div class="banner" role="status">${NX.ic("alert")}<span>Some related booking details could not be loaded. Your desk bookings are still available. ${esc(data.sessionsError.message || "Please try again later.")}</span></div>` : ""}
          <div class="toolbar">
            <div class="grow"><label class="sr" for="bvQ">Search</label>${NX.ic("search")}<input id="bvQ" type="search" placeholder="Search by name, person or ID…" value="${esc(q)}"></div>
            <label class="sr" for="bvS">Status</label>
            <select id="bvS"><option value="">All statuses</option>${statuses.map((s) => `<option value="${s}"${s === status ? " selected" : ""}>${s === "requested" ? "Pending Approval" : s === "approved" ? "Approved — Awaiting Payment" : s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select>
            <button class="btn btn-ghost" id="bvCsv" type="button">${NX.ic("download")}<span>Export CSV</span></button>
          </div>
          <div class="panel card">${list.length ? (tab === "spaces" ? spaceTable(list) : sessionTable(list)) : empty(list, bookingGroups)}</div>`;
        NX.$$(".tab", root).forEach((b) =>
          b.addEventListener("click", () => {
            tab = b.dataset.tab;
            status = "";
            draw();
          }),
        );
        NX.$$("[data-booking-group]", root).forEach((b) =>
          b.addEventListener("click", () => {
            bookingGroup = b.dataset.bookingGroup;
            status = "";
            draw();
          }),
        );
        NX.$("#bvQ", root).addEventListener("input", (e) => {
          q = e.target.value.trim().toLowerCase();
          draw();
          const i = NX.$("#bvQ", root);
          i.focus();
          i.setSelectionRange(q.length, q.length);
        });
        NX.$("#bvS", root).addEventListener("change", (e) => {
          status = e.target.value;
          draw();
        });
        NX.$("#bvCsv", root).addEventListener("click", () => exportCsv(list));
        bind();
      }

      const empty = (list, bookingGroups) => {
        if (tab === "sessions" && data.sessionsError)
          return NX.empty(
            "briefcase",
            "Expert sessions are unavailable",
            "We couldn't load your expert-session data. Please try again later.",
          );
        if (tab === "spaces" && !o.company && bookingGroup && !data.bookings.length)
          return NX.empty(
            "desk",
            "No desk bookings yet",
            "Pick a space and reserve your first desk.",
            `<a class="btn btn-primary" href="${NX.page("spaces")}">Browse spaces</a>`,
          );
        if (
          tab === "spaces" &&
          !o.company &&
          !status &&
          !q &&
          bookingGroups[bookingGroup].length === 0
        ) {
          const labels = { upcoming: "upcoming", past: "past", cancelled: "cancelled" };
          return NX.empty(
            "desk",
            `No ${labels[bookingGroup]} bookings`,
            bookingGroup === "upcoming"
              ? "Your next desk reservation will appear here."
              : bookingGroup === "past"
                ? "Completed and previous desk reservations will appear here."
                : "Bookings you cancel will appear here.",
            bookingGroup === "upcoming"
              ? `<a class="btn btn-primary" href="${NX.page("spaces")}">Browse spaces</a>`
              : "",
          );
        }
        return list.length === 0 &&
          (tab === "spaces" ? data.bookings.length === 0 : data.consults.length === 0)
          ? NX.empty(
              tab === "spaces" ? "desk" : "briefcase",
              tab === "spaces" ? "No desk bookings yet" : "No expert sessions yet",
              tab === "spaces"
                ? "Pick a space and reserve your first desk."
                : "Describe your problem and book an expert.",
              `<a class="btn btn-primary" href="${tab === "spaces" ? NX.page(o.company ? "company-booking" : "spaces") : NX.page(o.company ? "company-booking" : "user-matchmaking")}">${tab === "spaces" ? "Book a desk" : "Find an expert"}</a>`,
            )
          : NX.empty(
              "filter",
              "Nothing matches your filters",
              "Clear the search or choose another status.",
            );
      };

      function spaceTable(list) {
        return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Date</th>${o.company ? "<th>Booked for</th>" : ""}<th>Desks</th><th>Status</th><th class="num">Total</th><th></th></tr></thead><tbody>
          ${list
            .map((b) => {
              const canCancel = ["confirmed", "pending"].includes(b.status);
              const canReview = b.status === "completed" && data.reviewIds.includes(b.id);
              const deskLabel = (b.deskIds || [])
                .map((id) => (b.deskZones?.[id] ? `${id} (${b.deskZones[id]})` : id))
                .join(", ");
              const timeLabel =
                b.durationType === "hourly"
                  ? ` · Hourly: ${esc(NX.fmtTime(b.startTime))}–${esc(NX.fmtTime(b.endTime))}`
                  : " · Full day";
              const hasPriceBreakdown =
                Number.isFinite(b.baseFee) &&
                (Number.isFinite(b.commission) || Number.isFinite(b.cut));
              const commission = Number.isFinite(b.commission)
                ? b.commission
                : Number.isFinite(b.cut) && hasPriceBreakdown
                  ? b.cut
                  : 0;
              const basePrice = hasPriceBreakdown ? b.baseFee : b.fee;
              const priceCell = o.company
                ? `<td class="num">${NX.jod(b.fee)}</td>`
                : `<td class="booking-price"><span>Base ${NX.jod(basePrice)}</span>${hasPriceBreakdown ? `<small>Workspace commission${Number.isFinite(b.rate) ? ` (${b.rate}%)` : ""} ${NX.jod(commission)}</small>` : '<small>Commission was not itemized on this older booking</small>'}<strong>Total ${NX.jod(b.fee)}</strong></td>`;
              return `<tr><td><b>${esc(b.spaceName)}</b><small class="cell-sub">${esc(b.id)} · ${esc([b.spaceArea, b.spaceCity].filter(Boolean).join(", "))}</small></td><td>${NX.dateShort(b.date)}<small class="cell-sub">${esc(timeLabel)}</small></td>${o.company ? `<td>${esc(b.bookedBy)}</td>` : ""}<td>${esc(deskLabel || "—")}</td><td>${NX.status(b.status)}<small class="cell-sub">Payment · ${NX.status(b.paymentStatus || (b.method === "wallet" ? "paid" : "pending"))}</small></td>${priceCell}
            <td><div class="acts"><a class="btn btn-ghost btn-sm" href="${NX.page("booking-summary", { id: b.id })}">Details</a>
              ${canReview ? `<button class="btn btn-primary btn-sm" data-rev="${b.id}" type="button">Review</button>` : ""}
              ${canCancel ? `<button class="btn btn-danger btn-sm" data-cancel="${b.id}" type="button">Cancel</button>` : ""}</div></td></tr>`;
            })
            .join("")}</tbody></table></div>`;
      }
      function sessionTable(list) {
        const bookingStatus = (c) =>
          c.status === "requested"
            ? '<span class="sts sts-requested">Pending Approval</span>'
            : c.status === "approved"
              ? '<span class="sts sts-approved">Approved — Awaiting Payment</span>'
              : NX.status(c.status);
        return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Expert</th><th>When</th>${o.company ? "<th>Booked for</th>" : ""}<th>Type</th><th>Booking / payment</th><th class="num">Fee</th><th></th></tr></thead><tbody>
          ${list
            .map((c) => {
              const canCancel = ["requested", "approved", "confirmed"].includes(c.status);
              const canReview = c.status === "completed" && data.reviewIds.includes(c.id);
              const payLabel = NX.status(c.paymentStatus || "not_started");
              const stateNote =
                c.status === "approved"
                  ? ["Request approved", "The expert has approved your request. Complete your payment from My Bookings to confirm the session."]
                  : c.status === "declined"
                    ? ["Request declined", "Your consultation request was declined. You can choose another expert or select a different time."]
                    : null;
              return `<tr><td><b>${esc(c.expertName)}</b><small class="cell-sub">${esc(c.topic)}</small></td><td>${NX.dateShort(c.date)} · ${esc(c.time)}</td>${o.company ? `<td>${esc(c.bookedBy)}</td>` : ""}<td>${esc((MODES[c.mode] && MODES[c.mode].en) || c.mode || "Session")}</td><td>${bookingStatus(c)}<small class="cell-sub">${payLabel}</small>${stateNote ? `<small class="cell-sub"><b>${stateNote[0]}</b><br>${stateNote[1]}</small>` : ""}</td><td class="num"><b>${NX.jod(c.fee)}</b><small class="cell-sub">Base ${NX.jod(c.baseFee ?? c.fee)} + ${NX.jod(c.commission ?? c.cut ?? 0)} commission</small></td>
            <td><div class="acts"><button class="btn btn-ghost btn-sm" data-cinv="${c.id}" type="button">Invoice</button>
              ${c.status === "approved" ? `<button class="btn btn-primary btn-sm" data-pay-consult="${c.id}" type="button">Pay now</button>` : ""}
              ${canReview ? `<button class="btn btn-primary btn-sm" data-rev="${c.id}" type="button">Review</button>` : ""}
              ${canCancel ? `<button class="btn btn-danger btn-sm" data-ccancel="${c.id}" type="button">Cancel</button>` : ""}</div></td></tr>`;
            })
            .join("")}</tbody></table></div>`;
      }

      async function payConsultation(rec) {
        const wallet = await NX.Api.wallet();
        const walletInsufficient = wallet.balance < rec.fee;
        const fundsLink = NX.page(
          o.company ? "company-settings" : "user-wallet",
          o.company ? { tab: "billing" } : { topup: 1 },
        );
        NX.dlg.open(`${NX.dlg.head("Complete consultation payment", esc(rec.expertName))}
          <form class="dlg-b" id="consultPayForm" novalidate>
            <div class="panel card">
              <div class="row"><span>Expert</span><b>${esc(rec.expertName)}</b></div>
              <div class="row"><span>Date &amp; time</span><b>${NX.fmtDate(rec.date, { weekday: "long", day: "numeric", month: "long" })} · ${esc(rec.time)}</b></div>
              <div class="row"><span>Session type</span><b>${esc(MODES[rec.mode].en)}</b></div>
              <div class="row"><span>Base session price</span><b>${NX.jod(rec.baseFee ?? rec.fee)}</b></div>
              <div class="row"><span>Expert commission (${Number.isFinite(rec.rate) ? rec.rate : 8}%)</span><b>${NX.jod(rec.commission ?? rec.cut ?? 0)}</b></div>
              <div class="row"><span>Total</span><b>${NX.jod(rec.fee)}</b></div>
            </div>
            <div class="field"><span class="lb">Payment method</span><div class="pay-opts">
              <label class="pay"><input type="radio" name="consultPayMethod" value="wallet"${walletInsufficient ? " disabled" : " checked"}><span><b>NEXUS demo wallet</b><small>Available balance: ${NX.jod(wallet.balance)}</small></span></label>
              <label class="pay payment-unavailable"><input type="radio" name="consultPayMethod" value="card" disabled><span><b>Bank card · hosted checkout</b><small>External provider not connected · unavailable</small></span></label>
            </div></div>
            ${walletInsufficient ? `<div class="banner" role="status"><span>Insufficient demo wallet balance. You need ${NX.jod(rec.fee - wallet.balance)} more. <a href="${fundsLink}">Add demo funds</a></span></div>` : ""}
            <p class="hint">Wallet transactions are simulated. Card details are never requested or stored.</p>
            <div class="note" id="consultPayError" role="alert" hidden></div>
            <button class="btn btn-primary btn-lg btn-block" type="submit"${walletInsufficient ? " disabled" : ""}>Pay ${NX.jod(rec.fee)} from demo wallet</button>
          </form>`);
        const form = NX.$("#consultPayForm");
        const errorBox = NX.$("#consultPayError", form);
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (walletInsufficient) return;
          const submit = event.submitter || form.querySelector('button[type="submit"]');
          await NX.run(submit, async () => {
            const paid = await NX.Api.payConsult(rec.id, { method: "wallet" });
            NX.dlg.open(
              `${NX.dlg.head("Demo wallet payment recorded", "No real funds were transferred")}
              <div class="dlg-b done-box"><span class="ok-ic">${NX.ic("check")}</span><h3>Your consultation is confirmed in the NEXUS demo.</h3>
              <div class="row"><span>Expert</span><b>${esc(paid.expertName)}</b></div>
              <div class="row"><span>Date &amp; time</span><b>${NX.fmtDate(paid.date, { weekday: "long", day: "numeric", month: "long" })} · ${esc(paid.time)}</b></div>
              <div class="row"><span>Base price</span><b>${NX.jod(paid.baseFee ?? paid.fee)}</b></div>
              <div class="row"><span>Expert commission (${Number.isFinite(paid.rate) ? paid.rate : 8}%)</span><b>${NX.jod(paid.commission ?? paid.cut ?? 0)}</b></div>
              <div class="row"><span>Demo wallet total</span><b>${NX.jod(paid.fee)}</b></div>
              <p class="hint">The wallet balance is sample data; this is not a real payment.</p>
              <a class="btn btn-primary" href="${NX.page(o.company ? "company-bookings" : "user-bookings", { tab: "sessions" })}">View my sessions</a></div>`,
            );
            await load();
          }, "Recording demo wallet payment…");
        });
      }

      function exportCsv(list) {
        if (tab === "spaces")
          NX.csv(
            "nexus-bookings.csv",
            [["ID", "Space", "Area", "Date", "Duration", "Desks", "Booked for", "Status", "Base price (JOD)", "Workspace commission (JOD)", "Commission rate", "Total (JOD)"]].concat(
              list.map((b) => [
                b.id,
                b.spaceName,
                [b.spaceArea, b.spaceCity].filter(Boolean).join(", "),
                b.date,
                b.durationType === "hourly"
                  ? `${NX.fmtTime(b.startTime)}–${NX.fmtTime(b.endTime)}`
                  : "Full day",
                (b.deskIds || []).join(" "),
                b.bookedBy,
                b.status,
                Number.isFinite(b.baseFee) ? b.baseFee : b.fee,
                Number.isFinite(b.commission) ? b.commission : Number.isFinite(b.baseFee) && Number.isFinite(b.cut) ? b.cut : "Not itemized",
                Number.isFinite(b.rate) ? `${b.rate}%` : "Not itemized",
                b.fee,
              ]),
            ),
          );
        else
          NX.csv(
            "nexus-sessions.csv",
            [["ID", "Expert", "Date", "Time", "Topic", "Booking status", "Payment status", "Fee (JOD)"]].concat(
              list.map((c) => [c.id, c.expertName, c.date, c.time, c.topic, c.status, c.paymentStatus, c.fee]),
            ),
          );
      }

      function bind() {
        NX.$$("[data-pay-consult]", root).forEach((b) =>
          b.addEventListener("click", async () => {
            const rec = data.consults.find((x) => x.id === b.dataset.payConsult);
            if (!rec) return;
            await NX.run(b, () => payConsultation(rec));
          }),
        );
        NX.$$("[data-cancel]", root).forEach((b) =>
          b.addEventListener("click", async () => {
            const rec = data.bookings.find((x) => x.id === b.dataset.cancel);
            const cfg = await NX.Api.publicSettings();
            const hrs = (new Date(rec.date + "T09:00:00").getTime() - Date.now()) / 3600000;
            const refund = hrs > cfg.cancelHours;
            if (
              !(await NX.confirm(
                "Cancel this booking?",
                refund
                  ? "You will be refunded " + NX.jod(rec.fee) + " to your original payment method."
                  : "This booking is inside the " +
                      cfg.cancelHours +
                      "-hour cancellation window, so it will not be refunded.",
                "Cancel booking",
                true,
              ))
            )
              return;
            await NX.run(b, async () => {
              const r = await NX.Api.cancelBooking(rec.id);
              NX.toast(r.refunded ? "Booking cancelled and refunded." : "Booking cancelled.");
              await load();
            });
          }),
        );
        NX.$$("[data-ccancel]", root).forEach((b) =>
          b.addEventListener("click", async () => {
            const rec = data.consults.find((x) => x.id === b.dataset.ccancel);
            const paidFromWallet = rec.paymentStatus === "paid" && rec.method === "wallet";
            const wasPaid = ["paid", "demo_success"].includes(rec.paymentStatus);
            if (
              !(await NX.confirm(
                "Cancel this session?",
                paidFromWallet
                  ? "The session fee of " + NX.jod(rec.fee) + " will be refunded to your NEXUS wallet."
                  : wasPaid
                    ? "This demo card payment did not charge real money. The session will be cancelled."
                    : "No payment has been taken for this session.",
                "Cancel session",
                true,
              ))
            )
              return;
            await NX.run(b, async () => {
              await NX.Api.setConsultStatus(rec.id, "cancelled");
              NX.toast(paidFromWallet ? "Session cancelled and wallet payment refunded." : "Session cancelled.");
              await load();
            });
          }),
        );
        NX.$$("[data-rev]", root).forEach((b) =>
          b.addEventListener("click", () => {
            const rec =
              tab === "spaces"
                ? data.bookings.find((x) => x.id === b.dataset.rev)
                : data.consults.find((x) => x.id === b.dataset.rev);
            NX.Feedback.open(
              tab === "spaces"
                ? {
                    kind: "space",
                    refId: rec.id,
                    targetId: rec.spaceId,
                    title: rec.spaceName,
                    bookedBy: rec.bookedBy,
                  }
                : {
                    kind: "expert",
                    refId: rec.id,
                    targetId: rec.expertId,
                    title: rec.expertName,
                    bookedBy: rec.bookedBy,
                  },
              load,
            );
          }),
        );
        NX.$$("[data-cinv]", root).forEach((b) =>
          b.addEventListener("click", () => NX.openInvoice(b.dataset.cinv)),
        );
      }

      try {
        await load();
      } catch (e) {
        root.innerHTML = NX.errorBox(e.message);
      }
    },
  };
})();

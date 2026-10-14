/* NEXUS — services.js (request a service, track tickets) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX,
    $ = NX.$,
    $$ = NX.$$,
    esc = NX.esc,
    ic = NX.ic;
  const root = $("#svcRoot");
  const user = NX.Auth.user() || NX.Auth.demo();
  if (!user || !["user", "company"].includes(user.role)) {
    root.innerHTML = `<div class="empty">${ic("lock")}<h3>Sign in to request services</h3><p>Desk services are linked to your booking at a space${user ? ". Use a member or company account." : "."}</p><div style="display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center"><a class="btn btn-primary" href="${NX.page("login", { next: "services.html" })}">Member sign in</a><a class="btn btn-ghost" href="${NX.page("company-login", { next: "services.html" })}">Company sign in</a></div></div>`;
    return;
  }

  let bks0;
  let spaces;
  try {
    [bks0, spaces] = await Promise.all([NX.Api.bookings(), NX.Api.spaces(NX.todayISO)]);
  } catch (error) {
    root.innerHTML = NX.errorBox(error.message || "Your current booking could not be loaded.");
    return;
  }
  const bks = bks0
    .filter((b) => {
      if (b.date !== NX.todayISO || b.status !== "confirmed") return false;
      if (b.durationType !== "hourly") return true;
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const toMinutes = (time) => {
        const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
        return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
      };
      return currentMinute >= toMinutes(b.startTime) && currentMinute < toMinutes(b.endTime);
    })
    .flatMap((b) =>
      b.deskIds.map((deskId) => ({
        id: b.id + ":" + deskId,
        bookingId: b.id,
        spaceId: b.spaceId,
        deskId,
      })),
    );
  const sname = (id) => (spaces.find((s) => s.id === id) || { name: id }).name;
  const label = (b) => `${sname(b.spaceId)} — Desk ${b.deskId}`;
  const ST = { new: "Received", progress: "In progress", done: "Done" };
  const NOTE_PROMPTS = {
    wifi: "e.g. Wi-Fi disconnects when I join a video call",
    projector: "e.g. Please set up the screen for a laptop presentation",
    maintenance: "e.g. The desk lamp is not turning on",
    hospitality: "e.g. One coffee, no sugar, please",
    printing: "e.g. 4 pages, black and white, double-sided",
  };
  let bid = bks.length ? bks[bks.length - 1].id : null;
  let type = null;
  let confirmation = null;
  const cur = () => bks.find((b) => b.id === bid);

  function renderTicket(t) {
    const service = SERVICES[t.type] || SERVICES.maintenance;
    const status = ST[t.status] ? t.status : "new";
    const level = ["new", "progress", "done"].indexOf(status);
    const steps = ["Received", "In progress", "Done"];
    const booking = t.bookingId
      ? `<span class="tk-booking">Booking ${esc(t.bookingId)}</span>`
      : "";
    const fee = Number.isFinite(t.fee) ? t.fee : Number(service.price || 0);
    const paymentStatus = t.paymentStatus || (fee > 0 ? "pending" : "not_required");
    const paymentLabel =
      paymentStatus === "not_required"
        ? "No payment required"
        : paymentStatus === "paid"
          ? "Paid"
          : paymentStatus === "refunded"
            ? "Refunded"
            : "Payment pending";
    const note = t.note ? `<p class="tk-note">${esc(t.note)}</p>` : "";
    return `<article class="tk">
      <span class="ico">${ic(service.icon)}</span>
      <div class="tk-body">
        <div class="tk-heading"><b>${esc(service.en)}</b><span class="tk-id">Request #${esc(t.id)}</span></div>
        <p class="tk-location">${esc(sname(t.spaceId))} · Desk ${esc(t.deskId)}</p>
        <div class="tk-meta"><time datetime="${new Date(t.at).toISOString()}">${esc(NX.dt(t.at))}</time>${booking}</div>
        <div class="tk-cost"><span>Cost <b>${NX.jod(fee)}</b>${fee === 0 ? " · Free" : ""}</span><span>Payment <b>${paymentLabel}</b></span></div>
        ${note}
        <ol class="tk-progress" aria-label="Request progress: ${ST[status]}">
          ${steps
            .map(
              (step, index) =>
                `<li class="${index < level ? "is-done" : ""}${index === level ? " is-current" : ""}"><span class="tk-stage-dot" aria-hidden="true"></span><span>${step}</span></li>`,
            )
            .join("")}
        </ol>
      </div>
      <span class="pill-st ${status}">${ST[status]}</span>
    </article>`;
  }

  async function render() {
    const tks = (await NX.Api.tickets({ mine: true })).sort((a, b) => b.at - a.at);
    const booking = cur();
    const noBooking = !booking;
    root.innerHTML = `
      <section class="card here${noBooking ? " no-booking" : ""}" aria-label="Today's desk booking">
        <div class="here-info">
          <span class="here-label">${noBooking ? "Booking needed" : "You're at"}</span>
          <div class="h3 here-location">${booking ? '<span class="pulse" aria-hidden="true"></span>' : ""}<b id="loc">${booking ? esc(label(booking)) : "No active desk booking today"}</b></div>
          <p class="here-help">${noBooking ? "Choose a confirmed desk booking for today to request an at-desk service." : "Your service request will be linked to this booking."}</p>
        </div>
        ${
          bks.length > 1
            ? `<div class="field booking-field"><label for="bSel">Choose today's booking</label><select id="bSel">${bks.map((b) => `<option value="${esc(b.id)}" ${b.id === bid ? "selected" : ""}>${esc(label(b))}</option>`).join("")}</select></div>`
            : ""
        }
        ${
          noBooking
            ? `<div class="here-actions"><a class="btn btn-primary btn-sm" href="${NX.page("spaces")}">Browse spaces</a><a class="btn btn-ghost btn-sm" href="${NX.page(user.role + "-bookings")}">My bookings</a></div>`
            : ""
        }
      </section>
      <div class="two">
        <section class="card pad svc-form-card" aria-labelledby="svc-form-title">
          <div class="svc-section-heading"><span class="svc-section-overline">At your desk</span><h2 class="h3" id="svc-form-title">What do you need?</h2></div>
          ${
            noBooking
              ? `<div class="svc-booking-note" role="status">${ic("desk")}<span>Service requests are available when you have a confirmed booking for today.</span></div>`
              : ""
          }
          <div class="tiles" id="tiles">${Object.entries(SERVICES)
            .map(
              ([key, service]) =>
                `<button type="button" class="tile" data-k="${key}" aria-pressed="${type === key}"${noBooking ? " disabled" : ""}>
                  <span class="tile-check" aria-hidden="true">${ic("check")}</span>
                  <span class="eta">${esc(service.eta)}</span><span class="ti">${ic(service.icon)}</span>
                  <b>${esc(service.en)}</b><small>${esc(service.hint)}</small><span class="svc-price">${service.price ? NX.jod(service.price) : "Free"}</span>
                </button>`,
            )
            .join("")}</div>
          <p class="err svc-error" id="svcErr" role="alert"></p>
          <div class="field svc-note-field"><label for="sNote">Add a note <span>(optional)</span></label><input id="sNote" maxlength="240" placeholder="${type ? esc(NOTE_PROMPTS[type]) : "Choose a service to see a helpful example"}"${noBooking ? " disabled" : ""}><small class="svc-note-help" id="svcNoteHelp">${type ? `Add details to help explain your ${esc(SERVICES[type].en.toLowerCase())} request.` : "The example changes based on the service you choose."}</small></div>
          <button class="btn btn-primary btn-lg svc-send" id="sSend" type="button"${noBooking ? " disabled" : ""}>Request service ${ic("arrow-r")}</button>
          <p class="svc-demo-note">All five services are free in this demo. No service commission is added. Requests are recorded in this browser and do not notify staff.</p>
        </section>

        <section class="card pad svc-requests-card" aria-labelledby="svc-requests-title">
          <div class="svc-requests-heading"><div><span class="svc-section-overline">Request history</span><h2 class="h3" id="svc-requests-title">Your Requests</h2></div><span class="svc-request-count">${tks.length} ${tks.length === 1 ? "request" : "requests"}</span></div>
          ${
            confirmation
              ? `<div class="svc-confirmation" role="status" aria-live="polite">${ic("check")}<div><b>Request recorded in this demo</b><span>Request #${esc(confirmation.id)} is now at the top of Your Requests. No staff were notified.</span></div></div>`
              : ""
          }
          ${
            tks.length
              ? `<div class="svc-ticket-list">${tks.map(renderTicket).join("")}</div>`
              : `<div class="svc-empty">${ic("clipboard")}<h3>No requests yet</h3><p>Your service requests will appear here. Choose one of the services to get started.</p></div>`
          }
        </section>
      </div>`;
  }

  root.addEventListener("click", async (event) => {
    const tile = event.target.closest(".tile");
    if (tile && !tile.disabled) {
      type = tile.dataset.k;
      $$(".tile", root).forEach((button) =>
        button.setAttribute("aria-pressed", String(button === tile)),
      );
      $("#sNote", root).placeholder = NOTE_PROMPTS[type];
      $("#svcNoteHelp", root).textContent =
        `Add details to help explain your ${SERVICES[type].en.toLowerCase()} request.`;
      $("#svcErr", root).textContent = "";
      return;
    }

    if (event.target.closest("#sSend")) {
      const button = $("#sSend", root);
      const error = $("#svcErr", root);
      if (!type) {
        error.textContent = "Choose one of the services before continuing.";
        return;
      }
      if (Number(SERVICES[type].price) > 0) {
        error.textContent = "Paid desk services are not available in this demo. Your request was not recorded.";
        return;
      }
      const booking = cur();
      if (!booking) {
        error.textContent = "Choose a confirmed desk booking for today before requesting a service.";
        return;
      }

      button.disabled = true;
      error.textContent = "";
      try {
        const made = await NX.Api.addTickets([
          {
            bookingId: booking.bookingId,
            spaceId: booking.spaceId,
            deskId: booking.deskId,
            type,
            note: $("#sNote", root).value.trim(),
          },
        ]);
        confirmation = made[0];
        type = null;
        await render();
      } catch (err) {
        button.disabled = false;
        NX.toast(err.message, true);
      }
    }
  });

  root.addEventListener("change", (event) => {
    if (event.target.id === "bSel") {
      bid = event.target.value;
      const booking = cur();
      $("#loc", root).textContent = booking ? label(booking) : "";
    }
  });

  await render();
});

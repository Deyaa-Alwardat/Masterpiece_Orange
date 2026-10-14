/* NEXUS — workspace checkout. Wallet charges are demo-only; card checkout waits for a verified backend session. */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: ["user", "company"],
    page: "{role}-bookings",
    title: "Checkout & payment",
    sub: "Review your total before confirming.",
    actions: "",
  });
  if (!pg) return;

  const user = NX.Auth.user();
  const paymentId = NX.qs("payment_id");
  if (paymentId) {
    try {
      const result = await NX.Api.paymentStatus(paymentId);
      const copy = {
        pending: ["Payment pending", "The payment provider has not confirmed this transaction yet. Your booking is not marked paid."],
        paid: ["Payment verified", "The server confirmed this payment. Refresh My Bookings to see the latest booking status."],
        failed: ["Payment failed", "The provider did not complete this payment. No booking is confirmed."],
        cancelled: ["Payment cancelled", "The payment was cancelled. No booking is confirmed."],
      }[result.status];
      pg.innerHTML = `<section class="panel card done-box" role="status"><h2>${copy[0]}</h2><p>${copy[1]}</p><p class="hint">Verified with the server · ${esc(result.paymentId)}</p><a class="btn btn-primary" href="${NX.page((user && user.role === "company" ? "company" : "user") + "-bookings")}">View my bookings</a></section>`;
    } catch (error) {
      pg.innerHTML = `<section class="panel card" role="alert"><h2>Payment status not verified</h2><p>${esc(error.message || "The server could not verify this payment.")}</p><p class="hint">A redirect alone does not confirm payment. Contact support before retrying.</p><a class="btn btn-ghost" href="${NX.page((user && user.role === "company" ? "company" : "user") + "-bookings")}">Back to bookings</a></section>`;
    }
    return;
  }

  const spaceId = NX.qs("space");
  const desks = (NX.qs("desks") || "").split(",").filter(Boolean);
  const date = NX.qs("date") || NX.todayISO;
  const durationType = NX.qs("durationType") === "hourly" ? "hourly" : "daily";
  const startTime = NX.qs("startTime") || "";
  const endTime = NX.qs("endTime") || "";
  const slot = { durationType, startTime, endTime };
  const steps = (n) =>
    `<ol class="steps">${["Choose desk", "Review", "Pay", "Done"].map((s, i) => `<li class="${i < n ? "done" : i === n ? "now" : ""}"><span>${i < n ? "✓" : i + 1}</span>${s}</li>`).join("")}</ol>`;

  if (!spaceId || !desks.length) {
    pg.innerHTML = NX.empty("desk", "Nothing to pay for", "Choose your desks first.", `<a class="btn btn-primary" href="${NX.page("spaces")}">Browse spaces</a>`);
    return;
  }

  try {
    const [quote, wallet] = await Promise.all([NX.Api.quote(spaceId, desks, date, slot), NX.Api.wallet()]);
    const company = user.role === "company" ? await NX.Api.myCompany() : null;
    const blocked = company && company.status !== "approved";
    const sufficient = wallet.balance >= quote.fee;
    const fundsLink = user.role === "company"
      ? NX.page("company-settings", { tab: "billing" })
      : NX.page("user-wallet", { topup: 1 });
    let submitting = false;
    const attemptStorageKey = `nexus-checkout:${user.email}:${spaceId}:${desks.join(",")}:${date}:${durationType}:${startTime}:${endTime}`;
    let idempotencyKey = sessionStorage.getItem(attemptStorageKey);
    if (!idempotencyKey) {
      idempotencyKey = window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(attemptStorageKey, idempotencyKey);
    }

    pg.innerHTML = `${steps(2)}
      <div class="g-main">
        <form class="stack" id="payForm" novalidate>
          ${blocked ? `<div class="banner" role="alert">Your company account is waiting for admin approval, so booking is locked.</div>` : ""}
          ${company ? `<div class="panel card"><div class="panel-h"><h3>Who is this for?</h3></div><div class="field"><label class="sr" for="who">Team member</label><select id="who">${company.team.map((member) => `<option>${esc(member.name)}</option>`).join("")}</select></div></div>` : ""}
          <div class="panel card">
            <div class="panel-h"><h3>Payment method</h3></div>
            <div class="pay-opts">
              <label class="pay"><input type="radio" name="pm" value="wallet"${sufficient ? " checked" : " disabled"}><span><b>NEXUS demo wallet</b><small>Available ${NX.jod(wallet.balance)}${sufficient ? "" : " · insufficient balance"}</small></span></label>
              <label class="pay payment-unavailable"><input type="radio" name="pm" value="card" disabled><span><b>Bank card · hosted checkout</b><small>Provider integration required · unavailable</small></span></label>
            </div>
            ${!sufficient ? `<div class="banner" role="status"><span>Your demo wallet balance is ${NX.jod(wallet.balance)}; the total is ${NX.jod(quote.fee)}. <a href="${fundsLink}">${user.role === "company" ? "View billing options" : "Add demo funds"}</a></span></div>` : ""}
            <p class="hint">Wallet activity is simulated sample data. Card payments remain unavailable until a secure provider and backend verification are connected.</p>
          </div>
          <label class="chk"><input type="checkbox" id="agree"> I accept the cancellation policy and demo terms.</label>
          <div class="err" id="agree-e" role="alert"></div>
          <button class="btn btn-primary btn-lg" id="paySubmit" type="submit"${blocked || !sufficient ? " disabled" : ""}>Pay ${NX.jod(quote.fee)} from demo wallet</button>
        </form>
        <aside class="stack"><div class="panel card">
          <div class="panel-h"><h3>Order summary</h3><span class="sts sts-pending">JOD</span></div>
          <div class="row"><span class="muted">Space</span><b>${esc(quote.space.name)}</b></div>
          <div class="row"><span class="muted">Date</span><b>${NX.fmtDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b></div>
          <div class="row"><span class="muted">Duration</span><b>${durationType === "hourly" ? `${esc(NX.fmtTime(startTime))}–${esc(NX.fmtTime(endTime))} · ${quote.durationHours} ${quote.durationHours === 1 ? "hour" : "hours"}` : "Full day"}</b></div>
          <div class="row"><span class="muted">Desks</span><b>${esc(desks.join(", "))}</b></div>
          <div class="row"><span class="muted">Base price</span><b>${NX.jod(quote.baseFee)}</b></div>
          <div class="row"><span class="muted">NEXUS workspace commission (${quote.rate}%)</span><b>${NX.jod(quote.commission)}</b></div>
          <div class="row"><span>Total</span><span class="total">${NX.jod(quote.fee)}</span></div>
          <p class="hint">The 8% workspace commission is added to the base price. Demo wallet only; no real funds are transferred.</p>
          <a class="link" href="${NX.page("booking-summary", { space: spaceId, desks: desks.join(","), date, durationType, ...(durationType === "hourly" ? { startTime, endTime } : {}) })}">← Back to summary</a>
        </div></aside>
      </div>`;

    const form = NX.$("#payForm", pg);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting) return;
      const agree = NX.$("#agree", form);
      NX.$("#agree-e", form).textContent = agree.checked ? "" : "Please accept to continue.";
      if (!agree.checked || !sufficient || blocked) return;
      submitting = true;
      const submit = event.submitter || NX.$("#paySubmit", form);
      await NX.run(submit, async () => {
        const booking = await NX.Api.bookSpace({
          spaceId,
          deskIds: desks,
          date,
          durationType,
          startTime,
          endTime,
          method: "wallet",
          idempotencyKey,
          bookedBy: NX.$("#who", form)?.value,
        });
        sessionStorage.removeItem(attemptStorageKey);
        pg.innerHTML = `${steps(4)}<section class="panel card done-box" role="status" style="padding:2.5rem 1.5rem">
          <span class="ok-ic">${NX.ic("check")}</span><h2>${booking.status === "pending" ? "Booking requested" : "Booking confirmed"}</h2>
          <p>${esc(booking.spaceName)} · ${NX.fmtDate(booking.date)} · ${booking.durationType === "hourly" ? `${esc(NX.fmtTime(booking.startTime))}–${esc(NX.fmtTime(booking.endTime))}` : "Full day"} · desks ${esc(booking.deskIds.join(", "))}</p>
          <div class="row"><span>Base price</span><b>${NX.jod(booking.baseFee)}</b></div><div class="row"><span>Workspace commission (${booking.rate}%)</span><b>${NX.jod(booking.commission)}</b></div><div class="row"><span>Demo wallet total</span><b>${NX.jod(booking.fee)}</b></div>
          <p class="hint">Recorded in the local demo wallet. This is not a real card or bank payment.</p>
          <div class="acts"><a class="btn btn-primary" href="${NX.page(user.role + "-bookings")}">View my bookings</a></div><p class="hint">Reference ${esc(booking.id)} · Payment status: ${esc(booking.paymentStatus || "paid")}</p></section>`;
      }, "Recording demo wallet payment…");
      submitting = false;
    });

  } catch (error) {
    pg.innerHTML = NX.empty("alert", "We can't continue with this booking", error.message, `<a class="btn btn-primary" href="${NX.page("space", { id: spaceId })}">Back to space</a>`);
  }
});
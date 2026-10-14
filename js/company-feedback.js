/* NEXUS — company feedback: rate finished bookings and review what you sent */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-feedback",
    title: "Feedback",
    sub: "Rate completed bookings and sessions so owners and experts can improve.",
  });
  if (!pg) return;
  async function draw() {
    const [pending, given] = await Promise.all([NX.Api.pendingReviews(), NX.Api.feedbackList()]);
    const avg = given.length
      ? Math.round((given.reduce((a, f) => a + f.rating, 0) / given.length) * 10) / 10
      : 0;
    pg.innerHTML = `
      <div class="g3">
        ${NX.statCard("Waiting for feedback", pending.length, { icon: "clock", cls: pending.length ? "warn" : "", sub: "Completed, not yet rated" })}
        ${NX.statCard("Feedback given", given.length, { icon: "star", sub: "All time" })}
        ${NX.statCard("Average rating given", avg || "—", { icon: "trend", sub: "Out of 5" })}
      </div>
      <div class="g2 mt">
        <div class="panel card"><div class="panel-h"><h2>Rate now</h2></div>
          ${pending.length ? pending.map((r, i) => `<div class="li">${NX.dayBox(r.date)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="s">${r.kind === "space" ? "Desk booking" : "Expert session"} · ${esc(r.bookedBy)}</div></div><button class="btn btn-primary btn-sm" data-r="${i}" type="button">Rate</button></div>`).join("") : NX.empty("check-c", "All caught up", "Completed bookings and sessions will show here for rating.")}
          <div class="form-foot"><button class="btn btn-ghost btn-sm" id="plat" type="button">Give feedback about NEXUS</button></div>
        </div>
        <div class="panel card"><div class="panel-h"><h2>Your feedback</h2></div>
          ${given.length ? given.map((f) => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t" style="white-space:normal">${esc(f.targetName || "NEXUS")} ${NX.stars(f.rating)}</div><div class="s" style="white-space:normal">“${esc(f.text)}”</div><div class="s">${esc(f.fromName)} · ${NX.dshort(f.at)}${f.tags.length ? " · " + esc(f.tags.join(", ")) : ""}</div></div></div>`).join("") : '<p class="hint">You have not left feedback yet.</p>'}
        </div>
      </div>`;
    NX.observe();
    NX.$$("[data-r]", pg).forEach((b) =>
      b.addEventListener("click", () => NX.Feedback.open(pending[+b.dataset.r], draw)),
    );
    NX.$("#plat").addEventListener("click", () =>
      NX.Feedback.open({ kind: "platform", title: "NEXUS" }, draw),
    );
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

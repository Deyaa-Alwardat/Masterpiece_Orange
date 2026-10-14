/* NEXUS — expert dashboard */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const user = NX.Auth.user();
  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-dashboard",
    title: "Expert dashboard",
    sub: user
      ? "Hello " + user.name.split(" ")[0] + " — here are your requests and upcoming sessions."
      : "",
    actions: `<a class="btn btn-primary" href="${NX.page("expert-calendar")}">${NX.ic("calendar")}<span>Manage availability</span></a>`,
  });
  if (!pg) return;

  async function draw() {
    const [ex, consults, earn, fb] = await Promise.all([
      NX.Api.myExpert(),
      NX.Api.consults(),
      NX.Api.earnings(),
      NX.Api.feedbackList(),
    ]);
    const reqs = consults
      .filter((c) => c.status === "requested")
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    const up = consults
      .filter((c) => c.status === "confirmed")
      .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
    const avg = fb.length
      ? Math.round((fb.reduce((a, f) => a + f.rating, 0) / fb.length) * 10) / 10
      : 0;
    const banner =
      ex.status === "pending"
        ? `<div class="banner">${NX.ic("clock")}<span><b>Profile under review.</b> An admin is checking your profile. You will appear in the matchmaker and expert directory once approved.</span></div>`
        : ex.status === "rejected"
          ? `<div class="banner">${NX.ic("alert")}<span><b>Profile not approved.</b> Update your <a href="${NX.page("expert-profile")}">profile</a> and contact support.</span></div>`
          : "";
    pg.innerHTML = `${banner}
      <div class="g4">
        ${NX.statCard("New requests", reqs.length, { icon: "inbox", sub: "Waiting for your answer", cls: reqs.length ? "warn" : "" })}
        ${NX.statCard("Upcoming sessions", up.length, { icon: "calendar", sub: "Confirmed" })}
        ${NX.statCard("Available balance", earn.available, { icon: "wallet", money: true, sub: "Ready to withdraw" })}
        ${NX.statCard("Average rating", avg || "—", { icon: "star", sub: fb.length + " review" + (fb.length === 1 ? "" : "s") })}
      </div>
      <div class="g-main mt">
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Session requests</h2></div>
            ${reqs.length ? reqs.map((c) => `<div class="li">${NX.dayBox(c.date)}<div class="grow"><div class="t">${esc(c.bookedBy)}${c.companyId ? " · company" : ""}</div><div class="s">${esc(c.time)} · ${esc(MODES[c.mode].en)} · ${esc(c.topic)}</div></div><span class="acts"><button class="btn btn-primary btn-sm" data-act="approved" data-id="${c.id}" type="button">Accept</button><button class="btn btn-danger btn-sm" data-act="declined" data-id="${c.id}" type="button">Decline</button></span></div>`).join("") : NX.empty("inbox", "No pending requests", "New session requests from members appear here.")}
          </div>
          <div class="panel card"><div class="panel-h"><h2>Upcoming sessions</h2><a class="link" href="${NX.page("expert-calendar")}">Calendar ${NX.ic("arrow-r")}</a></div>
            ${
              up.length
                ? up
                    .slice(0, 6)
                    .map(
                      (c) =>
                        `<div class="li">${NX.dayBox(c.date)}<div class="grow"><div class="t">${esc(c.bookedBy)}</div><div class="s">${esc(c.time)} · ${esc(MODES[c.mode].en)}${c.spaceName ? " · " + esc(c.spaceName) : ""} · ${esc(c.topic)}</div></div>${c.date <= NX.todayISO ? `<button class="btn btn-ghost btn-sm" data-act="completed" data-id="${c.id}" type="button">Mark completed</button>` : NX.status(c.status)}</div>`,
                    )
                    .join("")
                : '<p class="hint">No confirmed sessions yet.</p>'
            }
          </div>
        </div>
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Recent feedback</h2></div>
            ${
              fb.length
                ? fb
                    .slice(0, 3)
                    .map(
                      (f) =>
                        `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t" style="white-space:normal">${NX.stars(f.rating)}</div><div class="s" style="white-space:normal">“${esc(f.text)}”</div><div class="s">— ${esc(f.fromName)}</div></div></div>`,
                    )
                    .join("")
                : '<p class="hint">Reviews appear after completed sessions.</p>'
            }
          </div>
          <div class="panel card"><div class="panel-h"><h2>Earnings this month</h2></div>
            <div class="row"><span class="muted">Completed (net)</span><b>${NX.jod(earn.earned)}</b></div>
            <div class="row"><span class="muted">Upcoming (net)</span><b>${NX.jod(earn.upcoming)}</b></div>
            <a class="btn btn-ghost btn-block" style="margin-top:.8rem" href="${NX.page("expert-wallet")}">Open wallet</a></div>
        </div>
      </div>`;
    NX.observe();
    NX.$$("[data-act]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        const st = b.dataset.act;
        if (
          st === "declined" &&
          !(await NX.confirm(
            "Decline this request?",
            "The member is refunded automatically.",
            "Decline",
            true,
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.setConsultStatus(b.dataset.id, st);
          NX.toast(
            st === "approved"
              ? "Request approved. Awaiting member payment."
              : st === "completed"
                ? "Session marked completed."
                : "Request declined.",
          );
          await draw();
        });
      }),
    );
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

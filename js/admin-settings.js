/* NEXUS — admin platform settings */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "admin",
    page: "admin-settings",
    title: "Platform settings",
    sub: "Commission, booking rules and maintenance. Changes apply to new activity immediately.",
  });
  if (!pg) return;
  async function draw() {
    const [c, stats] = await Promise.all([NX.Api.settings(), NX.Api.adminStats()]);
    pg.innerHTML = `
      <div class="g-main">
        <form class="panel card" id="sf" novalidate>
          <div class="panel-h"><h2>Rules &amp; fees</h2></div>
          <div class="form-grid">
            ${NX.field("sCom", "Expert session commission (%)", `<input id="sCom" type="number" min="0" max="40" step="0.5" value="${c.commission}">`)}
            <div class="field"><span class="lb">Workspace booking fee</span><b>8% added to the member's base price</b></div>
            ${NX.field("sMin", "Minimum payout (JOD)", `<input id="sMin" type="number" min="1" step="1" value="${c.minPayout}">`)}
            ${NX.field("sCan", "Free cancellation window (hours before)", `<input id="sCan" type="number" min="0" max="168" value="${c.cancelHours}">`)}
            ${NX.field("sWin", "Booking window (days ahead)", `<input id="sWin" type="number" min="1" max="120" value="${c.bookingWindow}">`)}
            ${NX.field("sMail", "Support email", `<input id="sMail" type="email" value="${esc(c.supportEmail)}">`, "full")}
          </div>
          <label class="opt"><span><b>Allow new sign-ups</b><span class="d">Off blocks registration of new accounts</span></span><span class="switch"><input type="checkbox" id="sUp"${c.allowSignups ? " checked" : ""}><i></i></span></label>
          <label class="opt"><span><b>Maintenance mode</b><span class="d">Pauses new bookings and sessions platform-wide</span></span><span class="switch"><input type="checkbox" id="sMt"${c.maintenance ? " checked" : ""}><i></i></span></label>
          <div class="form-foot"><button class="btn btn-primary" type="submit">Save settings</button></div>
          <p class="hint">Expert commission changes apply to future sessions only. Workspace bookings use a separate 8% fee shown to members before payment.</p>
        </form>
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h3>Demo data</h3></div>
            <p class="muted">Sample data is rebuilt on every page load. Resetting restores it right now and returns you to the home page.</p>
            <div class="form-foot"><button class="btn btn-danger" id="reset" type="button">${NX.ic("refresh")}<span>Reset demo data</span></button></div></div>
          <div class="panel card"><div class="panel-h"><h3>Recent admin activity</h3></div>
            ${stats.audit.map((a) => `<div class="li"><div class="grow"><div class="t">${esc(a.action)}</div><div class="s">${esc(a.detail)}</div></div><span class="hint">${NX.ago(a.at)}</span></div>`).join("") || '<p class="hint">No activity.</p>'}</div>
        </div>
      </div>`;
    NX.$("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const g = (id) => NX.$("#" + id);
      const checks = [
        NX.fieldErr(
          g("sCom"),
          +g("sCom").value >= 0 && +g("sCom").value <= 40 ? "" : "Between 0% and 40%.",
        ),
        NX.fieldErr(g("sMin"), +g("sMin").value >= 1 ? "" : "At least 1 JOD."),
        NX.fieldErr(
          g("sCan"),
          +g("sCan").value >= 0 && +g("sCan").value <= 168 ? "" : "0–168 hours.",
        ),
        NX.fieldErr(
          g("sWin"),
          +g("sWin").value >= 1 && +g("sWin").value <= 120 ? "" : "1–120 days.",
        ),
        NX.fieldErr(
          g("sMail"),
          /^\S+@\S+\.\S+$/.test(g("sMail").value) ? "" : "Enter a valid email.",
        ),
      ];
      if (checks.includes(false)) return;
      await NX.run(e.submitter, async () => {
        await NX.Api.saveSettings({
          commission: g("sCom").value,
          minPayout: g("sMin").value,
          cancelHours: g("sCan").value,
          bookingWindow: g("sWin").value,
          supportEmail: g("sMail").value,
          allowSignups: g("sUp").checked,
          maintenance: g("sMt").checked,
        });
        NX.toast("Settings saved.");
        await draw();
      });
    });
    NX.$("#reset").addEventListener("click", async (e) => {
      if (
        !(await NX.confirm(
          "Reset all demo data?",
          "Every change made on this page is discarded.",
          "Reset",
          true,
        ))
      )
        return;
      await NX.run(e.currentTarget, async () => {
        await NX.Api.resetDemo();
        location.href = NX.page("admin-login");
      });
    });
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

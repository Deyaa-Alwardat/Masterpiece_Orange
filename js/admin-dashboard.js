/* NEXUS — admin dashboard */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "admin",
    page: "admin-dashboard",
    title: "Admin dashboard",
    sub: "Platform health at a glance.",
  });
  if (!pg) return;
  try {
    const [s, fin, settings] = await Promise.all([
      NX.Api.adminStats(),
      NX.Api.adminFinance(),
      NX.Api.settings(),
    ]);
    const months = NX.lastMonths(6).map((m) => ({
      label: m.label,
      value: NX.sum(
        fin.filter((r) => r.date.startsWith(m.key)),
        (r) => r.cut,
      ),
    }));
    const todo = [
      [s.pendingApprovals, "approvals waiting for review", "admin-approvals"],
      [s.pendingPayouts, "payout requests to process", "admin-financials"],
      [s.openSupport, "open support requests", "admin-management"],
    ];
    pg.innerHTML = `
      ${settings.maintenance ? `<div class="banner">${NX.ic("alert")}<span><b>Maintenance mode is on.</b> New bookings are paused. <a href="${NX.page("admin-settings")}">Change</a></span></div>` : ""}
      <div class="g4">
        ${NX.statCard("Gross volume", s.gmv, { icon: "chart", money: true, sub: "Confirmed + completed" })}
        ${NX.statCard("Platform revenue", s.revenue, { icon: "wallet", money: true, sub: settings.commission + "% commission" })}
        ${NX.statCard("Members", s.members, { icon: "users", sub: s.owners + " owners · " + s.companies + " companies" })}
        ${NX.statCard("Live spaces", s.spaces, { icon: "building", sub: s.experts + " experts" })}
      </div>
      <div class="g-main mt">
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Platform revenue</h2><span class="sub">Commission per month, JOD</span></div>${NX.bars(months, { label: "Revenue per month", fmt: NX.jod })}</div>
          <div class="panel card"><div class="panel-h"><h2>Recent activity</h2></div>
            ${s.audit.length ? s.audit.map((a) => `<div class="li"><div class="grow"><div class="t">${esc(a.action)}</div><div class="s">${esc(a.actor)}${a.detail ? " · " + esc(a.detail) : ""}</div></div><span class="hint">${NX.ago(a.at)}</span></div>`).join("") : '<p class="hint">No activity yet.</p>'}</div>
        </div>
        <div class="stack"><div class="panel card"><div class="panel-h"><h2>Needs attention</h2></div>
          ${todo.map(([n, l, p]) => `<a class="li" href="${NX.page(p)}"><div class="grow"><div class="t"><b class="${n ? "" : "pos"}">${n}</b> ${l}</div></div>${NX.ic("arrow-r")}</a>`).join("")}</div>
          <div class="panel card"><div class="panel-h"><h2>Activity totals</h2></div>
            <div class="row"><span class="muted">Desk bookings</span><b>${s.bookings}</b></div><div class="row"><span class="muted">Expert sessions</span><b>${s.consults}</b></div></div></div>
      </div>`;
    NX.observe();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

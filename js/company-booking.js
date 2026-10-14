/* NEXUS — company booking: desks for the team, or an expert session */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-booking",
    title: "Book for the team",
    sub: "Reserve desks for teammates or book an expert session.",
  });
  if (!pg) return;
  let tab = NX.qs("tab") === "expert" ? "expert" : "desks";
  const state = { space: NX.qs("space") || "", date: NX.todayISO, desks: [] };

  async function draw() {
    const co = await NX.Api.myCompany();
    pg.innerHTML = `
      ${co.status !== "approved" ? `<div class="banner">${NX.ic("clock")}<span>Your company account is awaiting approval — you can explore, but payment is locked until an admin approves it.</span></div>` : ""}
      <div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="desks" aria-selected="${tab === "desks"}">${NX.ic("desk")} Workspace desks</button><button class="tab" role="tab" data-tab="expert" aria-selected="${tab === "expert"}">${NX.ic("briefcase")} Expert session</button></div>
      <div id="tabBody"></div>`;
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      }),
    );
    const body = NX.$("#tabBody", pg);
    if (tab === "expert") await NX.Matchmaker.mount(body);
    else await desks(body);
  }

  async function desks(body) {
    const spaces = await NX.Api.spaces(state.date);
    if (!spaces.length) {
      body.innerHTML = NX.empty("building", "No spaces available", "Check back soon.");
      return;
    }
    if (!spaces.some((s) => s.id === state.space)) state.space = spaces[0].id;
    const sp = spaces.find((s) => s.id === state.space);
    state.desks = state.desks.filter((id) =>
      sp.desks.some((d) => d.id === id && !d.busy && !d.blocked),
    );
    const free = sp.desks.filter((d) => !d.busy && !d.blocked).length;
    body.innerHTML = `
      <div class="g-main">
        <div class="panel card">
          <div class="form-grid">
            ${NX.field("cbSpace", "Space", `<select id="cbSpace">${spaces.map((s) => `<option value="${s.id}"${s.id === state.space ? " selected" : ""}>${esc(s.name)} — ${esc(s.city)} · ${NX.jod(s.price)}/day</option>`).join("")}</select>`)}
            ${NX.field("cbDate", "Date", `<input id="cbDate" type="date" min="${NX.todayISO}" max="${NX.addDays(NX.todayISO, 60)}" value="${state.date}">`)}
          </div>
          <div class="panel-h" style="margin-top:1.2rem"><h3>Pick desks <span class="sub">(${free} of ${sp.desks.length} free)</span></h3></div>
          <div class="desk-grid" id="cbGrid">${sp.desks.map((d) => `<button type="button" class="dk ${d.zone}${d.busy || d.blocked ? " busy" : ""}${state.desks.includes(d.id) ? " picked" : ""}" data-d="${d.id}" ${d.busy || d.blocked ? "disabled" : ""} aria-pressed="${state.desks.includes(d.id)}" title="${d.id} · ${d.zone}${d.busy ? " · taken" : ""}">${d.id.slice(1)}</button>`).join("")}</div>
          <div class="cal-legend"><span><i style="background:var(--cyan)"></i>Quiet</span><span><i style="background:var(--violet)"></i>Social</span><span><i style="background:var(--amber)"></i>Unavailable</span><span><i style="background:#fff;outline:2px solid var(--accent)"></i>Selected</span></div>
        </div>
        <aside class="stack"><div class="panel card"><div class="panel-h"><h3>Your selection</h3></div>
          <div class="row"><span class="muted">Desks</span><b>${state.desks.length ? esc(state.desks.join(", ")) : "—"}</b></div>
          <div class="row"><span class="muted">Date</span><b>${NX.fmtDate(state.date, { weekday: "short", day: "numeric", month: "short" })}</b></div>
          <div class="row"><span>Total</span><span class="total">${NX.jod(sp.price * state.desks.length)}</span></div>
          <a class="btn btn-primary btn-lg btn-block${state.desks.length ? "" : " disabled"}" id="cbGo" ${state.desks.length ? "" : 'aria-disabled="true"'} href="${state.desks.length ? NX.page("booking-summary", { space: sp.id, desks: state.desks.join(","), date: state.date }) : "#"}">Review &amp; pay ${NX.ic("arrow-r")}</a>
          <p class="hint" style="margin-top:.7rem">You choose who the booking is for at checkout.</p></div></aside>
      </div>`;
    NX.$("#cbSpace", body).addEventListener("change", (e) => {
      state.space = e.target.value;
      state.desks = [];
      draw();
    });
    NX.$("#cbDate", body).addEventListener("change", (e) => {
      const v = e.target.value;
      state.date = v >= NX.todayISO ? v : NX.todayISO;
      state.desks = [];
      draw();
    });
    NX.$("#cbGrid", body).addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b || b.disabled) return;
      const id = b.dataset.d;
      state.desks = state.desks.includes(id)
        ? state.desks.filter((x) => x !== id)
        : state.desks.concat(id);
      desks(body);
    });
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

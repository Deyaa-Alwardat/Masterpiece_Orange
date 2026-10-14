/* NEXUS — company reports: spend and usage across the team */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-reports",
    title: "Reports",
    sub: "Spend and usage across your team. Cancelled and declined items are excluded.",
    actions: `<button class="btn btn-ghost" id="rCsv" type="button">${NX.ic("download")}<span>Export CSV</span></button>`,
  });
  if (!pg) return;
  let range = 90;
  let all = null;

  async function load() {
    const [b, c] = await Promise.all([NX.Api.bookings(), NX.Api.consults()]);
    all = {
      b: b.filter((x) => x.status !== "cancelled"),
      c: c.filter((x) => !["cancelled", "declined"].includes(x.status)),
    };
    draw();
  }

  function draw() {
    const from = NX.addDays(NX.todayISO, -range);
    const B = all.b.filter((x) => x.date >= from && x.date <= NX.todayISO);
    const C = all.c.filter((x) => x.date >= from && x.date <= NX.todayISO);
    const deskSpend = NX.sum(B, (x) => x.fee);
    const sesSpend = NX.sum(C, (x) => x.fee);
    const total = NX.sum([{ v: deskSpend }, { v: sesSpend }], (x) => x.v);
    const deskDays = B.reduce((a, x) => a + x.deskIds.length, 0);
    const bySpace = {};
    B.forEach((x) => (bySpace[x.spaceName] = (bySpace[x.spaceName] || 0) + x.fee));
    const byPerson = {};
    B.forEach((x) => {
      const p = (byPerson[x.bookedBy] = byPerson[x.bookedBy] || {
        desks: 0,
        sessions: 0,
        spend: 0,
      });
      p.desks += x.deskIds.length;
      p.spend += x.fee;
    });
    C.forEach((x) => {
      const p = (byPerson[x.bookedBy] = byPerson[x.bookedBy] || {
        desks: 0,
        sessions: 0,
        spend: 0,
      });
      p.sessions += 1;
      p.spend += x.fee;
    });
    const spaceRows = Object.entries(bySpace).sort((a, b) => b[1] - a[1]);
    const maxS = Math.max(1, ...spaceRows.map((r) => r[1]));
    const months = NX.lastMonths(6).map((m) => ({
      label: m.label,
      value:
        NX.sum(
          all.b.filter((x) => x.date.startsWith(m.key)),
          (x) => x.fee,
        ) +
        NX.sum(
          all.c.filter((x) => x.date.startsWith(m.key)),
          (x) => x.fee,
        ),
    }));
    const people = Object.entries(byPerson).sort((a, b) => b[1].spend - a[1].spend);

    pg.innerHTML = `
      <div class="toolbar"><label class="sr" for="rRange">Period</label>
        <select id="rRange">${[
          [30, "Last 30 days"],
          [90, "Last 90 days"],
          [365, "Last 12 months"],
        ]
          .map(([v, l]) => `<option value="${v}"${v === range ? " selected" : ""}>${l}</option>`)
          .join("")}</select></div>
      <div class="g4">
        ${NX.statCard("Total spend", total, { icon: "chart", money: true, sub: "Desks + sessions" })}
        ${NX.statCard("Desk days", deskDays, { icon: "desk", sub: B.length + " bookings" })}
        ${NX.statCard("Expert sessions", C.length, { icon: "briefcase", sub: NX.jod(sesSpend) })}
        ${NX.statCard("Avg. per booking", B.length ? deskSpend / B.length : 0, { icon: "trend", money: true, sub: "Desk bookings" })}
      </div>
      <div class="g2 mt">
        <div class="panel card"><div class="panel-h"><h2>Monthly spend</h2><span class="sub">JOD</span></div>${NX.bars(months, { label: "Monthly spend", fmt: NX.jod })}</div>
        <div class="panel card"><div class="panel-h"><h2>Spend by space</h2></div>
          ${spaceRows.length ? spaceRows.map(([n, v]) => `<div style="margin-bottom:.9rem"><div class="row" style="padding:0 0 .3rem"><span>${esc(n)}</span><b>${NX.jod(v)}</b></div><div class="meter"><i style="--w:${(v / maxS) * 100}%"></i></div></div>`).join("") : '<p class="hint">No desk bookings in this period.</p>'}</div>
      </div>
      <div class="panel card mt"><div class="panel-h"><h2>By team member</h2></div>
        ${people.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th class="num">Desk days</th><th class="num">Sessions</th><th class="num">Spend</th></tr></thead><tbody>${people.map(([n, p]) => `<tr><td><div class="who">${NX.avatar(n)}<span>${esc(n)}</span></div></td><td class="num">${p.desks}</td><td class="num">${p.sessions}</td><td class="num"><b>${NX.jod(p.spend)}</b></td></tr>`).join("")}</tbody></table></div>` : NX.empty("chart", "No activity in this period", "Pick a longer period or book something for the team.")}
      </div>`;
    NX.observe();
    NX.$("#rRange").addEventListener("change", (e) => {
      range = +e.target.value;
      draw();
    });
    NX.$("#rCsv").onclick = () =>
      NX.csv(
        "nexus-company-report.csv",
        [["Type", "ID", "Date", "Item", "Booked for", "Amount (JOD)"]]
          .concat(B.map((x) => ["Desk", x.id, x.date, x.spaceName, x.bookedBy, x.fee]))
          .concat(C.map((x) => ["Session", x.id, x.date, x.expertName, x.bookedBy, x.fee])),
      );
  }
  try {
    await load();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

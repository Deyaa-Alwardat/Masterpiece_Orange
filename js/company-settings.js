/* NEXUS — company settings & profile: company details, team, billing wallet, account */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-settings",
    title: "Settings & profile",
    sub: "Company details, team, billing and account.",
  });
  if (!pg) return;
  let tab = ["team", "billing", "account"].includes(NX.qs("tab")) ? NX.qs("tab") : "company";
  const SIZES = ["1–10", "11–50", "51–200", "200+"];
  const INDUSTRIES = [
    "Software",
    "Consulting",
    "Marketing",
    "Finance",
    "Education",
    "Retail",
    "Other",
  ];

  async function draw() {
    pg.innerHTML = `<div class="tabs" role="tablist">${[
      ["company", "Company profile", "building"],
      ["team", "Team", "users"],
      ["billing", "Billing & wallet", "wallet"],
      ["account", "Account & support", "settings"],
    ]
      .map(
        ([k, l, i]) =>
          `<button class="tab" role="tab" data-tab="${k}" aria-selected="${tab === k}">${NX.ic(i)} ${l}</button>`,
      )
      .join("")}</div><div id="tb"></div>`;
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      }),
    );
    const tb = NX.$("#tb", pg);
    if (tab === "billing") return NX.Wallet.mount(tb);
    if (tab === "account") {
      tb.innerHTML = '<div class="stack"><div id="pf"></div><div id="st"></div></div>';
      await NX.Profile.mount(NX.$("#pf"), {
        nameLabel: "Your name (account admin)",
        bioLabel: "About you",
      });
      return NX.Settings.mount(NX.$("#st"));
    }
    const co = await NX.Api.myCompany();
    if (tab === "team") return team(tb, co);
    tb.innerHTML = `<div class="panel card"><div class="panel-h"><h2>${esc(co.name)}</h2>${NX.status(co.status === "approved" ? "approved" : co.status)}</div>
      ${co.status === "pending" ? `<div class="banner">${NX.ic("clock")}<span>Waiting for admin approval. Booking unlocks once approved.</span></div>` : ""}
      <form id="coForm" novalidate class="form-grid">
        ${NX.field("coName", "Company name", `<input id="coName" maxlength="60" value="${esc(co.name)}">`)}
        ${NX.field("coInd", "Industry", `<select id="coInd">${INDUSTRIES.map((i) => `<option${i === co.industry ? " selected" : ""}>${i}</option>`).join("")}</select>`)}
        ${NX.field("coSize", "Team size", `<select id="coSize">${SIZES.map((i) => `<option${i === co.size ? " selected" : ""}>${i}</option>`).join("")}</select>`)}
        ${NX.field("coCity", "City", `<input id="coCity" value="${esc(co.city)}">`)}
        ${NX.field("coTax", "Tax / registration number", `<input id="coTax" value="${esc(co.taxId)}" placeholder="e.g. JO‑1234567">`)}
        ${NX.field("coWeb", "Website", `<input id="coWeb" value="${esc(co.website)}" placeholder="company.com">`)}
        ${NX.field("coBud", "Monthly budget (JOD)", `<input id="coBud" type="number" min="0" step="10" value="${co.monthlyBudget}">`, "full")}
        <div class="form-foot full"><button class="btn btn-primary" type="submit">Save company profile</button></div>
      </form></div>`;
    NX.$("#coForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = NX.$("#coName");
      if (!NX.fieldErr(n, n.value.trim().length < 2 ? "Enter the company name." : "")) return;
      await NX.run(e.submitter, async () => {
        await NX.Api.updateCompany({
          name: n.value,
          industry: NX.$("#coInd").value,
          size: NX.$("#coSize").value,
          city: NX.$("#coCity").value,
          taxId: NX.$("#coTax").value,
          website: NX.$("#coWeb").value,
          monthlyBudget: NX.$("#coBud").value,
        });
        NX.toast("Company profile saved.");
        await draw();
      });
    });
  }

  function team(tb, co) {
    tb.innerHTML = `<div class="g-main"><div class="panel card"><div class="panel-h"><h2>Team members <span class="sub">(${co.team.length})</span></h2></div>
      ${co.team.map((m) => `<div class="li">${NX.avatar(m.name)}<div class="grow"><div class="t">${esc(m.name)} ${m.admin ? '<span class="tag acc">Admin</span>' : ""}</div><div class="s">${esc(m.email)} · ${esc(m.title)}</div></div>${m.admin ? "" : `<button class="btn btn-danger btn-sm" data-rm="${m.id}" type="button">Remove</button>`}</div>`).join("")}</div>
      <div class="panel card"><div class="panel-h"><h3>Add a teammate</h3></div>
        <form id="tmForm" novalidate class="stack">
          ${NX.field("tmName", "Full name", '<input id="tmName">')}${NX.field("tmMail", "Work email", '<input id="tmMail" type="email">')}${NX.field("tmTitle", "Job title", '<input id="tmTitle" placeholder="e.g. Designer">')}
          <button class="btn btn-primary" type="submit">Add to team</button>
          <p class="hint">Teammates are listed so you can book desks and sessions for them. They do not get their own login in this demo.</p>
        </form></div></div>`;
    NX.$("#tmForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = NX.$("#tmName"),
        m = NX.$("#tmMail");
      const a = NX.fieldErr(n, n.value.trim().length < 2 ? "Enter a name." : "");
      const b = NX.fieldErr(m, /^\S+@\S+\.\S+$/.test(m.value) ? "" : "Enter a valid email.");
      if (!a || !b) return;
      await NX.run(e.submitter, async () => {
        try {
          await NX.Api.addTeamMember({
            name: n.value,
            email: m.value,
            title: NX.$("#tmTitle").value,
          });
          NX.toast("Teammate added.");
          await draw();
        } catch (er) {
          NX.fieldErr(m, er.message);
        }
      });
    });
    NX.$$("[data-rm]", tb).forEach((b) =>
      b.addEventListener("click", async () => {
        if (
          !(await NX.confirm(
            "Remove teammate?",
            "They stay on past bookings but can no longer be selected.",
            "Remove",
            true,
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.removeTeamMember(b.dataset.rm);
          NX.toast("Teammate removed.");
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

/* NEXUS — admin approvals: new listings, experts and companies */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "admin",
    page: "admin-approvals",
    title: "Approvals",
    sub: "Review new spaces, expert profiles and company accounts before they go live.",
  });
  if (!pg) return;
  let tab = "pending";
  let type = "";
  const ICON = { space: "building", expert: "briefcase", company: "layers" };

  async function draw() {
    const all = await NX.Api.approvals();
    const pend = all.filter((a) => a.status === "pending");
    const done = all.filter((a) => a.status !== "pending");
    const list = (tab === "pending" ? pend : done).filter((a) => !type || a.type === type);
    pg.innerHTML = `
      <div class="toolbar">
        <div class="tabs" style="margin:0"><button class="tab" data-tab="pending" aria-selected="${tab === "pending"}">Pending <span class="n">${pend.length}</span></button><button class="tab" data-tab="done" aria-selected="${tab === "done"}">Reviewed <span class="n">${done.length}</span></button></div>
        <select id="aType" aria-label="Type"><option value="">All types</option><option value="space"${type === "space" ? " selected" : ""}>Spaces</option><option value="expert"${type === "expert" ? " selected" : ""}>Experts</option><option value="company"${type === "company" ? " selected" : ""}>Companies</option></select>
      </div>
      ${
        list.length
          ? `<div class="g2">${list
              .map(
                (
                  a,
                ) => `<article class="card panel"><div class="panel-h"><div class="profile-top"><span class="ic stat-ic" style="display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:var(--accent-bg);color:var(--accent-t)">${NX.ic(ICON[a.type])}</span><div><h3>${esc(a.title)}</h3><span class="hint">${esc(a.subtitle)}</span></div></div>${NX.status(a.status)}</div>
        <div class="row"><span class="muted">Submitted by</span><b>${esc(a.submittedBy)}</b></div><div class="row"><span class="muted">Submitted</span><b>${NX.dshort(a.at)}</b></div>
        ${a.note ? `<div class="banner info" style="margin-top:.8rem">${NX.ic("mail")}<span>${esc(a.note)}</span></div>` : ""}
        ${a.status === "pending" ? `<div class="acts" style="margin-top:1rem"><button class="btn btn-danger btn-sm" data-rj="${a.id}" type="button">Reject</button><button class="btn btn-primary btn-sm" data-ap="${a.id}" type="button">Approve</button></div>` : `<p class="hint" style="margin-top:.8rem">Reviewed ${NX.dshort(a.decidedAt)}</p>`}</article>`,
              )
              .join("")}</div>`
          : NX.empty(
              "check-c",
              tab === "pending" ? "Nothing to review" : "No reviewed items",
              tab === "pending"
                ? "New submissions will appear here."
                : "Decisions you make are listed here.",
            )
      }`;
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      }),
    );
    NX.$("#aType").addEventListener("change", (e) => {
      type = e.target.value;
      draw();
    });
    NX.$$("[data-ap]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        await NX.run(b, async () => {
          await NX.Api.decideApproval(b.dataset.ap, "approved");
          NX.toast("Approved.");
          await draw();
          if (NX.Portal.refreshBadges) NX.Portal.refreshBadges();
        });
      }),
    );
    NX.$$("[data-rj]", pg).forEach((b) =>
      b.addEventListener("click", () => {
        const a = list.find((x) => x.id === b.dataset.rj);
        NX.dlg.open(
          `${NX.dlg.head("Reject " + esc(a.title), "The applicant sees your reason.")}<form class="dlg-b" id="rjf" novalidate>${NX.field("rjn", "Reason", '<textarea id="rjn" rows="3" maxlength="300" placeholder="What should they fix?"></textarea>')}<div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-danger" type="submit">Reject</button></div></form>`,
        );
        NX.$("#rjf").addEventListener("submit", async (e) => {
          e.preventDefault();
          const n = NX.$("#rjn");
          if (
            !NX.fieldErr(n, n.value.trim().length < 5 ? "Add a short reason (5+ characters)." : "")
          )
            return;
          await NX.run(e.submitter, async () => {
            await NX.Api.decideApproval(a.id, "rejected", n.value);
            NX.dlg.close();
            NX.toast("Rejected.");
            await draw();
          });
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

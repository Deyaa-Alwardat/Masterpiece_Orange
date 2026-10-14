/* NEXUS — admin financials & payouts */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "admin",
    page: "admin-financials",
    title: "Financials & payouts",
    sub: "Platform revenue and payout requests from owners and experts.",
  });
  if (!pg) return;
  let tab = "payouts";

  async function draw() {
    const [fin, payouts, s] = await Promise.all([
      NX.Api.adminFinance(),
      NX.Api.payouts(),
      NX.Api.adminStats(),
    ]);
    const req = payouts.filter((p) => p.status === "requested");
    const paid = NX.sum(
      payouts.filter((p) => p.status === "paid"),
      (p) => p.amount,
    );
    pg.innerHTML = `
      <div class="g4">
        ${NX.statCard("Gross volume", s.gmv, { icon: "chart", money: true })}
        ${NX.statCard("Platform revenue", s.revenue, { icon: "wallet", money: true, sub: "Commission earned" })}
        ${NX.statCard(
          "Awaiting payout",
          NX.sum(req, (p) => p.amount),
          {
            icon: "clock",
            money: true,
            sub: req.length + " request" + (req.length === 1 ? "" : "s"),
            cls: req.length ? "warn" : "",
          },
        )}
        ${NX.statCard("Paid out", paid, { icon: "check-c", money: true, sub: "All time" })}
      </div>
      <div class="panel card mt">
        <div class="panel-h"><div class="tabs" style="margin:0"><button class="tab" data-tab="payouts" aria-selected="${tab === "payouts"}">Payout requests <span class="n">${payouts.length}</span></button><button class="tab" data-tab="rev" aria-selected="${tab === "rev"}">Revenue ledger <span class="n">${fin.length}</span></button></div>
          <button class="btn btn-ghost btn-sm" id="fCsv" type="button">${NX.ic("download")}<span>Export CSV</span></button></div>
        ${tab === "payouts" ? payTable(payouts) : revTable(fin)}
      </div>
      <p class="hint mt">Demo ledger: marking a payout as paid only updates its status — no real transfer happens.</p>`;
    NX.observe();
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      }),
    );
    NX.$("#fCsv").addEventListener("click", () =>
      tab === "payouts"
        ? NX.csv(
            "nexus-payouts.csv",
            [["ID", "Name", "Role", "Amount (JOD)", "Method", "Status", "Requested"]].concat(
              payouts.map((p) => [
                p.id,
                p.name,
                p.role,
                p.amount,
                p.method,
                p.status,
                new Date(p.at).toISOString().slice(0, 10),
              ]),
            ),
          )
        : NX.csv(
            "nexus-revenue.csv",
            [["ID", "Type", "Date", "Item", "Gross (JOD)", "Commission (JOD)", "Status"]].concat(
              fin.map((r) => [r.id, r.kind, r.date, r.who, r.gross, r.cut, r.status]),
            ),
          ),
    );
    NX.$$("[data-pay]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        if (
          !(await NX.confirm(
            "Mark payout as paid?",
            "This confirms the transfer was sent (demo: no money moves).",
            "Mark paid",
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.decidePayout(b.dataset.pay, "paid");
          NX.toast("Payout marked as paid.");
          await draw();
        });
      }),
    );
    NX.$$("[data-rej]", pg).forEach((b) =>
      b.addEventListener("click", () => {
        NX.dlg.open(
          `${NX.dlg.head("Reject payout", "The requester sees your reason.")}<form class="dlg-b" id="pr" novalidate>${NX.field("prn", "Reason", '<textarea id="prn" rows="3" maxlength="300"></textarea>')}<div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-danger" type="submit">Reject payout</button></div></form>`,
        );
        NX.$("#pr").addEventListener("submit", async (e) => {
          e.preventDefault();
          const n = NX.$("#prn");
          if (!NX.fieldErr(n, n.value.trim().length < 5 ? "Add a short reason." : "")) return;
          await NX.run(e.submitter, async () => {
            await NX.Api.decidePayout(b.dataset.rej, "rejected", n.value);
            NX.dlg.close();
            NX.toast("Payout rejected.");
            await draw();
          });
        });
      }),
    );
  }
  const payTable = (list) =>
    list.length
      ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Recipient</th><th>Method</th><th>Status</th><th class="num">Amount</th><th></th></tr></thead><tbody>
    ${list
      .map(
        (
          p,
        ) => `<tr><td><b>${esc(p.id)}</b><small class="cell-sub">${NX.dshort(p.at)}</small></td><td><div class="who">${NX.avatar(p.name)}<span>${esc(p.name)}<small>${esc(NX.ROLES[p.role].label)}</small></span></div></td><td>${esc(p.method)}</td><td>${NX.status(p.status)}${p.note ? `<small class="cell-sub">${esc(p.note)}</small>` : ""}</td><td class="num"><b>${NX.jod(p.amount)}</b></td>
      <td><div class="acts">${p.status === "requested" ? `<button class="btn btn-primary btn-sm" data-pay="${p.id}" type="button">Mark paid</button><button class="btn btn-danger btn-sm" data-rej="${p.id}" type="button">Reject</button>` : ""}</div></td></tr>`,
      )
      .join("")}</tbody></table></div>`
      : NX.empty("wallet", "No payout requests", "Requests from owners and experts appear here.");
  const revTable = (list) =>
    list.length
      ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Status</th><th class="num">Gross</th><th class="num">Commission</th></tr></thead><tbody>
    ${list
      .slice(0, 80)
      .map(
        (r) =>
          `<tr><td>${NX.dateShort(r.date)}</td><td>${esc(r.who)}<small class="cell-sub">${esc(r.id)}</small></td><td>${esc(r.kind)}</td><td>${NX.status(r.status)}</td><td class="num">${NX.jod(r.gross)}</td><td class="num pos">${NX.jod(r.cut)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div>${list.length > 80 ? `<p class="hint">Showing the latest 80 of ${list.length}. Export CSV for everything.</p>` : ""}`
      : NX.empty("chart", "No revenue yet", "Completed bookings generate commission.");
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

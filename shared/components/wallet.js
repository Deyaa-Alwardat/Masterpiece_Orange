/* NEXUS — shared components: invoices, member wallet (user/company
   and earnings & payouts (expert/owner).
   Demo funds are local sample data; production payment data belongs to a hosted provider and backend. */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;
  /* ---------- invoice dialog ---------- */
  NX.openInvoice = async function (ref) {
    try {
      const inv = await NX.Api.invoice(ref);
      NX.dlg.open(`${NX.dlg.head("Invoice " + esc(inv.no), "Demo invoice — not a tax document")}
        <div class="inv">
          <div class="inv-head"><div><b>NEXUS</b><div class="hint">Jubeiha, Amman — Jordan<br>hello@nexus.jo</div></div>
          <div style="text-align:right"><b>Billed to</b><div class="hint">${esc(inv.billTo)}<br>${esc(inv.billEmail)}</div></div></div>
          <div class="row"><span>Issued</span><b>${NX.dshort(inv.at)}</b></div>
          <div class="row"><span>Status</span><b>${NX.status(inv.status)}</b></div>
          <div class="row"><span>Payment</span><b>${inv.method === "wallet" ? "NEXUS demo wallet" : inv.method === "card" ? "Legacy card record · verification unavailable" : "Not paid"}</b></div>
          <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody>
            ${inv.lines.map((l) => `<tr><td>${esc(l.desc)}</td><td class="num">${l.qty}</td><td class="num">${NX.jod(l.unit)}</td><td class="num">${NX.jod(l.total)}</td></tr>`).join("")}
          </tbody></table></div>
          <div class="row"><span>${inv.lines.some((line) => line.desc === "Refund") ? "Net after refund" : inv.paymentStatus === "paid" ? "Total paid" : "Total due"}</span><span class="total">${NX.jod(inv.amount)}</span></div>
          <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Close</button><button class="btn btn-primary" type="button" id="invPrint">${NX.ic("printer")}<span>Print / save PDF</span></button></div>
        </div>`);
      NX.$("#invPrint").addEventListener("click", () => window.print());
    } catch (e) {
      NX.toast(e.message, true);
    }
  };

  /* ---------- member wallet (user + company) ---------- */
  NX.Wallet = {
    async mount(root) {
      let tab = "tx";
      async function draw() {
        const [w, invs] = await Promise.all([NX.Api.wallet(), NX.Api.invoices()]);
        const tx = w.transactions;
        root.innerHTML = `
          <div class="g4">
            <div class="card stat"><span class="ic">${NX.ic("wallet")}</span><span class="l">Wallet balance</span><span class="v" data-count-money>${NX.jod(w.balance)}</span><span class="d">Available to spend</span></div>
            <div class="card stat"><span class="ic">${NX.ic("plus")}</span><span class="l">Total top-ups</span><span class="v">${NX.jod(w.topups)}</span><span class="d">Demo funds added</span></div>
            <div class="card stat"><span class="ic">${NX.ic("receipt")}</span><span class="l">Total spent</span><span class="v">${NX.jod(w.spent)}</span><span class="d">Bookings & sessions</span></div>
            <div class="card stat"><span class="ic">${NX.ic("clipboard")}</span><span class="l">Invoices</span><span class="v">${invs.length}</span><span class="d">Issued to your account</span></div>
          </div>
          <div class="panel card mt">
            <div class="panel-h"><div class="tabs" role="tablist" style="margin:0">
              <button class="tab" role="tab" data-tab="tx" aria-selected="${tab === "tx"}">Transactions <span class="n">${tx.length}</span></button>
              <button class="tab" role="tab" data-tab="inv" aria-selected="${tab === "inv"}">Invoices <span class="n">${invs.length}</span></button></div>
              <div class="acts"><button class="btn btn-primary btn-sm" id="wTop" type="button">${NX.ic("plus")}<span>Add demo funds</span></button>
              <button class="btn btn-ghost btn-sm" id="wCsv" type="button">${NX.ic("download")}<span>Export CSV</span></button></div></div>
            ${tab === "tx" ? txTable(tx) : invTable(invs)}
          </div>
          <p class="hint mt">Demo wallet balances and invoices are simulated sample data. No actual payment is available here.</p>`;
        NX.$$(".tab", root).forEach((b) =>
          b.addEventListener("click", () => {
            tab = b.dataset.tab;
            draw();
          }),
        );
        NX.$("#wTop", root).addEventListener("click", () => topUp(draw));
        NX.$("#wCsv", root).addEventListener("click", () =>
          NX.csv(
            "nexus-transactions.csv",
            [["Date", "Description", "Type", "Method", "Base price (JOD)", "Workspace commission (JOD)", "Amount (JOD)"]].concat(
              tx.map((t) => [
                new Date(t.at).toISOString().slice(0, 10),
                t.desc,
                t.type,
                t.method,
                t.breakdown ? t.breakdown.baseFee : "",
                t.breakdown ? t.breakdown.commission ?? "Not itemized" : "",
                t.amount,
              ]),
            ),
          ),
        );
        NX.$$("[data-inv]", root).forEach((b) =>
          b.addEventListener("click", () => NX.openInvoice(b.dataset.inv)),
        );
      }
      function txTable(tx) {
        if (!tx.length)
          return NX.empty(
            "wallet",
            "No transactions yet",
            "Top up your wallet or make a booking to see activity here.",
          );
        return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>
          ${tx.map((t) => `<tr><td>${NX.dt(t.at)}</td><td>${esc(t.desc)}<small class="cell-sub">${esc(t.ref || t.id)}</small>${t.breakdown ? `<small class="cell-sub">Base price: ${NX.jod(t.breakdown.baseFee)}</small><small class="cell-sub">${t.breakdown.commission === null ? "Commission not itemized" : `${t.type === "consultation" ? "Expert" : "Workspace"} commission${t.breakdown.rate === null ? "" : ` (${t.breakdown.rate}%)`}: ${NX.jod(t.breakdown.commission)}`}</small>` : ""}</td><td>${esc({ wallet: "Demo wallet", card: "Legacy card record", transfer: "Legacy transfer record" }[t.method] || t.method)}</td><td class="num ${t.amount < 0 ? "neg" : "pos"}">${NX.jodSigned(t.amount)}</td><td class="acts">${t.ref && t.type !== "refund" ? `<button class="btn btn-ghost btn-sm" data-inv="${esc(t.ref)}" type="button">Invoice</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>`;
      }
      function invTable(list) {
        if (!list.length)
          return NX.empty(
            "receipt",
            "No invoices yet",
            "Invoices appear after your first booking or expert session.",
          );
        return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>For</th><th>Status</th><th class="num">Amount</th><th></th></tr></thead><tbody>
          ${list.map((i) => `<tr><td><b>${esc(i.no)}</b></td><td>${NX.dshort(i.at)}</td><td>${esc(i.description || i.lines[0].desc)}</td><td>${NX.status(i.status)}</td><td class="num">${NX.jod(i.amount)}</td><td class="acts"><button class="btn btn-ghost btn-sm" data-inv="${esc(i.ref)}" type="button">View</button></td></tr>`).join("")}
        </tbody></table></div>`;
      }
      function topUp(done) {
        NX.dlg.open(`${NX.dlg.head("Add demo funds", "Simulated balance only · no card details or real payment")}
          <form class="dlg-b" id="tuForm" novalidate>
            ${NX.field("tuAmt", "Amount (JOD)", '<input id="tuAmt" type="number" min="5" max="2000" step="1" value="50">')}
            <div class="chips" style="margin:.7rem 0 1rem">${[25, 50, 100, 200].map((n) => `<button class="chip" type="button" data-amt="${n}">${n}</button>`).join("")}</div>
            <p class="hint">This adds sample funds to the local demo wallet. Card and bank payments are not connected.</p>
            <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add demo funds</button></div>
          </form>`);
        const form = NX.$("#tuForm");
        NX.$$('[data-amt]', form).forEach((button) =>
          button.addEventListener("click", () => (NX.$("#tuAmt", form).value = button.dataset.amt)),
        );
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const amount = NX.$("#tuAmt", form);
          const value = Number(amount.value);
          const valid = NX.fieldErr(amount, value >= 5 && value <= 2000 ? "" : "Enter an amount between 5 and 2,000 JOD.");
          if (!valid) return;
          await NX.run(event.submitter, async () => {
            await NX.Api.topUp(value);
            NX.dlg.close();
            NX.toast("Demo funds added. No real payment was made.");
            await done();
          }, "Updating demo wallet…");
        });
      }
      try {
        const q = NX.qs("tab");
        if (q === "inv") tab = "inv";
        await draw();
        if (NX.qs("topup")) NX.$("#wTop", root).click();
      } catch (e) {
        root.innerHTML = NX.errorBox(e.message);
      }
    },
  };

  /* ---------- earnings & payouts (expert + owner) ---------- */
  NX.Earnings = {
    async mount(root, o) {
      o = o || {};
      async function draw() {
        const e = await NX.Api.earnings();
        root.innerHTML = `
          <div class="g4">
            <div class="card stat"><span class="ic">${NX.ic("wallet")}</span><span class="l">Available to withdraw</span><span class="v">${NX.jod(e.available)}</span><span class="d">After platform fees</span></div>
            <div class="card stat"><span class="ic">${NX.ic("clock")}</span><span class="l">Upcoming earnings</span><span class="v">${NX.jod(e.upcoming)}</span><span class="d">Confirmed, not yet completed</span></div>
            <div class="card stat"><span class="ic">${NX.ic("send")}</span><span class="l">Payout requested</span><span class="v">${NX.jod(e.requested)}</span><span class="d">Waiting for admin</span></div>
            <div class="card stat"><span class="ic">${NX.ic("check-c")}</span><span class="l">Paid out</span><span class="v">${NX.jod(e.paid)}</span><span class="d">Lifetime payouts</span></div>
          </div>
          <div class="g-main mt">
            <div class="panel card"><div class="panel-h"><h2>Earnings ledger</h2><span class="sub">Gross ${NX.jod(e.gross)} · platform fees ${NX.jod(e.fees)}</span></div>
              ${
                e.items.length
                  ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>${esc(o.itemLabel || "Item")}</th><th>Status</th><th class="num">Gross</th><th class="num">Fee</th><th class="num">Net</th></tr></thead><tbody>
                ${e.items.map((i) => `<tr><td>${NX.dateShort(i.date)}</td><td>${esc(i.label)}<small class="cell-sub">${esc(i.id)}</small></td><td>${NX.status(i.status)}</td><td class="num">${NX.jod(i.gross)}</td><td class="num neg">−${NX.jod(i.cut)}</td><td class="num"><b>${NX.jod(i.net)}</b></td></tr>`).join("")}
              </tbody></table></div>`
                  : NX.empty(
                      "chart",
                      "No earnings yet",
                      o.emptyText || "Completed work shows up here.",
                    )
              }
            </div>
            <div class="stack">
              <div class="panel card"><div class="panel-h"><h2>Request a payout</h2></div>
                <form id="poForm" novalidate>
                  ${NX.field("poAmt", "Amount (JOD)", `<input id="poAmt" type="number" step="0.5" min="1" max="${e.available}" placeholder="max ${e.available.toFixed(2)}">`)}
                  <div style="height:.8rem"></div>
                  ${NX.field("poBank", "Bank account (IBAN)", '<input id="poBank" placeholder="JO94 CBJO 0010 …" autocomplete="off">')}
                  <div class="form-foot"><button class="btn btn-primary btn-block" type="submit"${e.available <= 0 ? " disabled" : ""}>Request payout</button></div>
                  <p class="hint">Demo payout: an admin reviews the request in Admin → Financials. No money moves.</p>
                </form></div>
              <div class="panel card"><div class="panel-h"><h2>Payout history</h2></div>
                ${e.payouts.length ? e.payouts.map((p) => `<div class="li"><div class="grow"><div class="t">${NX.jod(p.amount)}</div><div class="s">${esc(p.method)} · ${NX.dshort(p.at)}${p.note ? " · " + esc(p.note) : ""}</div></div>${NX.status(p.status)}</div>`).join("") : '<p class="hint">No payouts requested yet.</p>'}
              </div>
            </div>
          </div>`;
        NX.$("#poForm", root).addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const amt = NX.$("#poAmt", root),
            bank = NX.$("#poBank", root);
          const a = +amt.value;
          const okA = NX.fieldErr(amt, a > 0 ? "" : "Enter an amount.");
          const okB = NX.fieldErr(
            bank,
            bank.value.trim().length >= 8 ? "" : "Enter your IBAN (at least 8 characters).",
          );
          if (!okA || !okB) return;
          await NX.run(ev.submitter, async () => {
            await NX.Api.requestPayout(a, "Bank transfer ••" + bank.value.trim().slice(-4));
            NX.toast("Payout requested — waiting for admin approval.");
            await draw();
          });
        });
      }
      try {
        await draw();
      } catch (e) {
        root.innerHTML = NX.errorBox(e.message);
      }
    },
  };
})();

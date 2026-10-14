/* NEXUS — company dashboard */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-dashboard",
    title: "Company dashboard",
    sub: "Team bookings, spend and requests in one place.",
    actions: `<a class="btn btn-primary" href="${NX.page("company-booking")}">${NX.ic("plus")}<span>Book for the team</span></a>`,
  });
  if (!pg) return;
  try {
    const [co, bookings, consults, wallet, reviews] = await Promise.all([
      NX.Api.myCompany(),
      NX.Api.bookings(),
      NX.Api.consults(),
      NX.Api.wallet(),
      NX.Api.pendingReviews(),
    ]);
    const monthKey = NX.todayISO.slice(0, 7);
    const liveB = bookings.filter((b) => b.status !== "cancelled");
    const liveC = consults.filter((c) => !["cancelled", "declined"].includes(c.status));
    const spend =
      NX.sum(
        liveB.filter((b) => b.date.startsWith(monthKey)),
        (b) => b.fee,
      ) +
      NX.sum(
        liveC.filter((c) => c.date.startsWith(monthKey)),
        (c) => c.fee,
      );
    const left = Math.max(0, co.monthlyBudget - spend);
    const pct = co.monthlyBudget ? Math.min(100, Math.round((spend / co.monthlyBudget) * 100)) : 0;
    const up = []
      .concat(
        bookings.filter(NX.isUpcoming).map((b) => ({
          date: b.date,
          html: NX.bookingLi(b, NX.page("booking-summary", { id: b.id })),
        })),
      )
      .concat(
        consults
          .filter(NX.isUpcoming)
          .map((c) => ({ date: c.date, html: NX.consultLi(c, c.expertName + " · " + c.bookedBy) })),
      )
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(0, 6);
    const months = NX.lastMonths(6).map((m) => ({
      label: m.label,
      value:
        NX.sum(
          liveB.filter((b) => b.date.startsWith(m.key)),
          (b) => b.fee,
        ) +
        NX.sum(
          liveC.filter((c) => c.date.startsWith(m.key)),
          (c) => c.fee,
        ),
    }));
    pg.innerHTML = `
      ${co.status !== "approved" ? `<div class="banner">${NX.ic("clock")}<span><b>Account under review.</b> NEXUS is verifying ${esc(co.name)}. You can set up your team and profile now; booking unlocks after approval.</span></div>` : ""}
      <div class="g4">
        ${NX.statCard("Spend this month", spend, { icon: "chart", money: true, sub: co.monthlyBudget ? pct + "% of budget" : "No budget set" })}
        ${NX.statCard("Budget left", left, { icon: "shield", money: true, sub: co.monthlyBudget ? "of " + NX.jod(co.monthlyBudget) : "Set one in settings" })}
        ${NX.statCard("Upcoming", bookings.filter(NX.isUpcoming).length + consults.filter(NX.isUpcoming).length, { icon: "calendar", sub: "Desks and sessions" })}
        ${NX.statCard("Wallet balance", wallet.balance, { icon: "wallet", money: true, sub: "Company wallet" })}
      </div>
      <div class="g-main mt">
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Upcoming for your team</h2><a class="link" href="${NX.page("company-bookings")}">All bookings ${NX.ic("arrow-r")}</a></div>
            ${up.length ? up.map((u) => u.html).join("") : NX.empty("calendar", "Nothing scheduled", "Book desks or an expert session for your team.", `<a class="btn btn-primary" href="${NX.page("company-booking")}">Book now</a>`)}</div>
          <div class="panel card"><div class="panel-h"><h2>Monthly spend</h2><span class="sub">JOD, desks + sessions</span></div>${NX.bars(months, { label: "Spend per month", fmt: NX.jod })}</div>
        </div>
        <div class="stack">
          ${co.monthlyBudget ? `<div class="panel card"><div class="panel-h"><h3>Budget</h3></div><div class="meter"><i style="--w:${pct}%"></i></div><p class="hint" style="margin-top:.6rem">${NX.jod(spend)} of ${NX.jod(co.monthlyBudget)} used (${pct}%)</p></div>` : ""}
          <div class="panel card"><div class="panel-h"><h3>Feedback to give</h3></div>
            ${
              reviews.length
                ? reviews
                    .slice(0, 3)
                    .map(
                      (r) =>
                        `<div class="li"><div class="grow"><div class="t">${esc(r.title)}</div><div class="s">${NX.dateShort(r.date)} · ${esc(r.bookedBy)}</div></div></div>`,
                    )
                    .join("") +
                  `<a class="btn btn-primary btn-block" style="margin-top:.6rem" href="${NX.page("company-feedback")}">Leave feedback</a>`
                : '<p class="hint">All completed bookings are reviewed.</p>'
            }</div>
          <div class="panel card"><div class="panel-h"><h3>Team</h3><a class="link" href="${NX.page("company-settings", { tab: "team" })}">Manage</a></div>
            ${
              co.team.length
                ? co.team
                    .slice(0, 5)
                    .map(
                      (m) =>
                        `<div class="li">${NX.avatar(m.name)}<div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.title)}</div></div></div>`,
                    )
                    .join("")
                : '<p class="hint">No team members yet.</p>'
            }</div>
        </div>
      </div>`;
    NX.observe();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

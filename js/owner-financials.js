/* NEXUS — owner: financials & payouts */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-financials",
    title: "Financials & payouts",
    sub: "Net earnings after the platform fee, and your payout requests.",
  });
  if (pg)
    NX.Earnings.mount(pg, {
      itemLabel: "Reservation",
      emptyText: "Completed and confirmed reservations appear here.",
    });
});

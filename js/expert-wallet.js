/* NEXUS — expert: wallet (earnings & payouts) */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-wallet",
    title: "Wallet",
    sub: "Earnings from completed sessions, platform fees and payouts.",
  });
  if (pg)
    NX.Earnings.mount(pg, {
      itemLabel: "Session",
      emptyText: "Completed and upcoming sessions appear here.",
    });
});

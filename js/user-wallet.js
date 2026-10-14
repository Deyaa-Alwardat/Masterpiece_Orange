/* NEXUS — user: wallet & invoices */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-wallet",
    title: "Wallet & invoices",
    sub: "Demo balance, transactions and invoices.",
  });
  if (pg) NX.Wallet.mount(pg);
});

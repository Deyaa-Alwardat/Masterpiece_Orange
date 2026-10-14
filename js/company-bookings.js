/* NEXUS — company: all team bookings */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-bookings",
    title: "Bookings",
    sub: "Every desk booking and expert session made for your team.",
    actions: `<a class="btn btn-primary" href="${NX.page("company-booking")}">${NX.ic("plus")}<span>Book for the team</span></a>`,
  });
  if (pg) NX.BookingsView.mount(pg, { company: true });
});

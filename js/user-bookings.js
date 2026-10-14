/* NEXUS — user: my bookings */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-bookings",
    title: "My bookings",
    sub: "Desk bookings and expert sessions in one place.",
    actions: `<a class="btn btn-primary" href="${NX.page("spaces")}">${NX.ic("plus")}<span>New booking</span></a>`,
  });
  if (pg) NX.BookingsView.mount(pg, { company: false });
});

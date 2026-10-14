/* NEXUS — owner: settings */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-settings",
    title: "Settings",
    sub: "Notifications, password and support.",
  });
  if (pg) NX.Settings.mount(pg);
});

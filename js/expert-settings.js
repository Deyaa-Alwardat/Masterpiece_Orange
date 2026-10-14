/* NEXUS — expert: settings */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-settings",
    title: "Settings",
    sub: "Notifications, password and support.",
  });
  if (pg) NX.Settings.mount(pg);
});

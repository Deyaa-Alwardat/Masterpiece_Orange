/* NEXUS — user: settings & support */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-settings",
    title: "Settings & support",
    sub: "Manage your notifications and get help when you need it.",
  });
  if (pg) NX.Settings.mount(pg, { hidePassword: true });
});

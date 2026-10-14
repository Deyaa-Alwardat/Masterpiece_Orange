/* NEXUS — owner: inbox */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-messages",
    title: "Inbox",
    sub: "Conversations with guests and NEXUS support.",
  });
  if (pg) NX.Messages.mount(pg);
});

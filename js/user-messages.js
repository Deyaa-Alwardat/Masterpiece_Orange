/* NEXUS — user: inbox & messages */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-messages",
    title: "Messages",
    sub: "Conversations with experts, space owners and NEXUS support.",
  });
  if (pg) NX.Messages.mount(pg);
});

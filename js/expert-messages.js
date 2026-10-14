/* NEXUS — expert: messages */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-messages",
    title: "Messages",
    sub: "Conversations with your clients and NEXUS support.",
  });
  if (pg) NX.Messages.mount(pg);
});

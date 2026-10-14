/* NEXUS — company: messages */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "company",
    page: "company-messages",
    title: "Messages",
    sub: "Conversations with space owners, experts and NEXUS support.",
  });
  if (pg) NX.Messages.mount(pg);
});

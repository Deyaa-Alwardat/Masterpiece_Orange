/* NEXUS — public experts page: AI matchmaker, directory and consultation booking (shared component) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const root = NX.$("#mmRoot");
  try {
    await NX.Matchmaker.mount(root, { showUpcomingSessions: false });
    await NX.MatchStudio.decorate(root);
  } catch (error) {
    root.innerHTML = NX.errorBox(error.message);
  }
});

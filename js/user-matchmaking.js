/* NEXUS — user: AI matchmaking (shared matchmaker component) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-matchmaking",
    title: "AI Match Studio",
    sub: "A focused workspace to turn your challenge into a shortlist of experts.",
  });
  if (!pg) return;

  try {
    await NX.Matchmaker.mount(pg, { showUpcomingSessions: false });
    await NX.MatchStudio.decorate(pg);
  } catch (error) {
    pg.innerHTML = NX.errorBox(error.message);
  }
});

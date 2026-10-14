/* NEXUS — user: saved spaces and experts */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "user",
    page: "user-saved",
    title: "Saved",
    sub: "Spaces and experts you saved for later.",
  });
  if (!pg) return;
  let tab = "spaces";

  async function draw() {
    const [fav, spaces, experts] = await Promise.all([
      NX.Api.favorites(),
      NX.Api.spaces(NX.todayISO),
      NX.Api.experts(),
    ]);
    const sp = spaces.filter((s) => fav.spaces.includes(s.id));
    const ex = experts.filter((e) => fav.experts.includes(e.id));
    pg.innerHTML = `
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" data-tab="spaces" aria-selected="${tab === "spaces"}">${NX.ic("building")} Spaces <span class="n">${sp.length}</span></button>
        <button class="tab" role="tab" data-tab="experts" aria-selected="${tab === "experts"}">${NX.ic("briefcase")} Experts <span class="n">${ex.length}</span></button>
      </div>
      <div class="g3">${tab === "spaces" ? spaceCards(sp) : expertCards(ex)}</div>`;
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        draw();
      }),
    );
    NX.$$("[data-un]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        await NX.Api.toggleFavorite(b.dataset.k, b.dataset.un);
        NX.toast("Removed from saved.");
        draw();
      }),
    );
  }
  function spaceCards(list) {
    if (!list.length)
      return `<div style="grid-column:1/-1">${NX.empty("heart", "No saved spaces", "Tap the heart on a space to keep it here.", `<a class="btn btn-primary" href="${NX.page("spaces")}">Explore spaces</a>`)}</div>`;
    return list
      .map(
        (
          s,
        ) => `<article class="card panel" data-spot><div class="profile-top" style="margin-bottom:.8rem"><span class="avatar" style="--h:${s.hue}">${esc(NX.initials(s.name))}</span><div><h3>${esc(s.name)}</h3><span class="hint">${esc(s.area)}, ${esc(s.city)}</span></div></div>
      <div class="row"><span class="muted">From</span><b>${NX.jod(s.price)} / day</b></div><div class="row"><span class="muted">Rating</span><b>${s.rating || "New"}</b></div><div class="row"><span class="muted">Free desks today</span><b>${s.desks.filter((d) => !d.busy && !d.blocked).length} of ${s.desks.length}</b></div>
      <div class="acts" style="margin-top:.8rem;justify-content:space-between"><button class="btn btn-ghost btn-sm" data-k="space" data-un="${s.id}" type="button">${NX.ic("trash")}<span>Remove</span></button><a class="btn btn-primary btn-sm" href="${NX.page("space", { id: s.id })}">View &amp; book</a></div></article>`,
      )
      .join("");
  }
  function expertCards(list) {
    if (!list.length)
      return `<div style="grid-column:1/-1">${NX.empty("heart", "No saved experts", "Tap the heart on an expert to keep them here.", `<a class="btn btn-primary" href="${NX.page("user-matchmaking")}">Find an expert</a>`)}</div>`;
    return list
      .map(
        (
          e,
        ) => `<article class="card panel" data-spot><div class="profile-top" style="margin-bottom:.8rem">${NX.avatar(e.name)}<div><h3>${esc(e.name)}</h3><span class="hint">${esc(e.title)}</span></div></div>
      <div class="row"><span class="muted">Rate</span><b>${NX.jod(e.rate)} / session</b></div><div class="row"><span class="muted">Rating</span><b>${e.rating || "New"}</b></div>
      <div class="acts" style="margin-top:.8rem;justify-content:space-between"><button class="btn btn-ghost btn-sm" data-k="expert" data-un="${e.id}" type="button">${NX.ic("trash")}<span>Remove</span></button><a class="btn btn-primary btn-sm" href="${NX.page("user-matchmaking", { expert: e.id })}">Book session</a></div></article>`,
      )
      .join("");
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

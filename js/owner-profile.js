/* NEXUS — owner: profile */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-profile",
    title: "Owner profile",
    sub: "Your host details shown to guests.",
  });
  if (!pg) return;
  const spaces = await NX.Api.mySpaces();
  pg.innerHTML = `<div class="stack"><div id="pBox"></div><div class="panel card"><div class="panel-h"><h2>Your spaces</h2><a class="link" href="${NX.page("owner-inventory")}">Manage ${NX.ic("arrow-r")}</a></div>${
    spaces.length
      ? spaces
          .map(
            (s) =>
              `<div class="li"><span class="avatar" style="--h:${s.hue};width:42px;height:42px;border-radius:14px;font-size:.85rem">${NX.esc(NX.initials(s.name))}</span><div class="grow"><div class="t">${NX.esc(s.name)}</div><div class="s">${NX.esc(s.area)}, ${NX.esc(s.city)}</div></div>${NX.status(s.paused ? "paused" : s.status)}</div>`,
          )
          .join("")
      : '<p class="hint">You have not listed a space yet.</p>'
  }</div></div>`;
  NX.Profile.mount(NX.$("#pBox"), {
    bioLabel: "About you as a host",
    bioHint: "Tell guests about your space and community",
  });
});

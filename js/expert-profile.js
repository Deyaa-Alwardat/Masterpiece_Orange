/* NEXUS — expert profile: personal details + public expert card */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-profile",
    title: "Expert profile",
    sub: "Your personal details and how members see you.",
  });
  if (!pg) return;
  try {
    const ex = await NX.Api.myExpert();
    pg.innerHTML = `<div class="stack"><div id="pBox"></div>
      <div class="panel card"><div class="panel-h"><h2>Public expert profile</h2>${NX.status(ex.status === "approved" ? "approved" : ex.status)}</div>
        <form id="exForm" novalidate class="form-grid">
          ${NX.field("exTitle", "Professional headline", `<input id="exTitle" maxlength="70" value="${esc(ex.title)}">`, "full")}
          ${NX.field("exRate", "Session rate (JOD)", `<input id="exRate" type="number" min="5" max="300" value="${ex.rate}">`)}
          ${NX.field("exWhy", "One-line pitch", `<input id="exWhy" maxlength="120" value="${esc(ex.why || "")}">`)}
          <div class="field full"><span class="lb">Specialties</span><div class="chips">${Object.entries(
            NEEDS,
          )
            .map(
              ([k, n]) =>
                `<label class="chip"><input type="checkbox" name="skill" value="${k}"${ex.skills.includes(k) ? " checked" : ""}>${n.en}</label>`,
            )
            .join("")}</div><div class="err" id="skill-e"></div></div>
          <div class="field full"><span class="lb">Session types</span><div class="chips">${Object.entries(
            MODES,
          )
            .map(
              ([k, m]) =>
                `<label class="chip"><input type="checkbox" name="mode" value="${k}"${ex.modes.includes(k) ? " checked" : ""}>${m.en}</label>`,
            )
            .join("")}</div><div class="err" id="mode-e"></div></div>
          ${NX.field("exBio", "About your experience", `<textarea id="exBio" rows="5" maxlength="600">${esc(ex.bio || "")}</textarea>`, "full")}
          <div class="form-foot full"><button class="btn btn-primary" type="submit">Save expert profile</button></div>
        </form>
        ${ex.status !== "approved" ? '<p class="hint">Changes are saved immediately, but your profile appears publicly only after admin approval.</p>' : ""}
      </div></div>`;
    NX.Profile.mount(NX.$("#pBox"), {
      nameLabel: "Display name",
      bioHint: "A short personal introduction",
    });
    NX.$("#exForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = NX.$("#exTitle"),
        rate = NX.$("#exRate");
      const skills = NX.$$("[name=skill]:checked", pg).map((i) => i.value);
      const modes = NX.$$("[name=mode]:checked", pg).map((i) => i.value);
      const a = NX.fieldErr(
        title,
        title.value.trim().length < 4 ? "Add a professional headline." : "",
      );
      const b = NX.fieldErr(
        rate,
        +rate.value >= 5 && +rate.value <= 300 ? "" : "Rate must be 5–300 JOD.",
      );
      NX.$("#skill-e").textContent = skills.length ? "" : "Pick at least one specialty.";
      NX.$("#mode-e").textContent = modes.length ? "" : "Pick at least one session type.";
      if (!a || !b || !skills.length || !modes.length) return;
      await NX.run(e.submitter, async () => {
        await NX.Api.updateExpert({
          title: title.value,
          rate: rate.value,
          skills,
          modes,
          bio: NX.$("#exBio").value,
          why: NX.$("#exWhy").value,
        });
        NX.toast("Expert profile saved.");
      });
    });
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

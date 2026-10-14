/* NEXUS — owner: space inventory (listings, desks, availability) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-inventory",
    title: "Space inventory",
    sub: "Manage your listings, desks and availability.",
    actions: `<button class="btn btn-primary" id="addBtn" type="button">${NX.ic("plus")}<span>Add a space</span></button>`,
  });
  if (!pg) return;
  const CITIES = ["Amman", "Irbid", "Aqaba", "Zarqa", "Madaba", "Salt"];
  let spaces = [];

  async function load() {
    spaces = await NX.Api.mySpaces();
    draw();
  }
  const amChips = (sel) =>
    Object.entries(AMENITIES)
      .map(
        ([k, n]) =>
          `<label class="chip"><input type="checkbox" name="am" value="${k}"${sel.includes(k) ? " checked" : ""}>${esc(n)}</label>`,
      )
      .join("");

  function draw() {
    if (!spaces.length) {
      pg.innerHTML = NX.empty(
        "building",
        "No spaces yet",
        "List your first workspace. An admin reviews it before it goes live.",
        '<button class="btn btn-primary" id="addBtn2" type="button">Add a space</button>',
      );
      NX.$("#addBtn2").addEventListener("click", () => wizard());
      return;
    }
    pg.innerHTML = `<div class="g2">${spaces
      .map((s) => {
        const free = s.desks.filter((d) => !d.busy && !d.blocked).length;
        const blocked = s.desks.filter((d) => d.blocked).length;
        return `<article class="card panel" data-spot>
        <div class="panel-h"><div class="profile-top"><span class="avatar" style="--h:${s.hue};width:48px;height:48px;border-radius:16px;font-size:.95rem">${esc(NX.initials(s.name))}</span><div><h3>${esc(s.name)}</h3><span class="hint">${esc(s.area)}, ${esc(s.city)}</span></div></div>${NX.status(s.paused && s.status === "approved" ? "paused" : s.status)}</div>
        ${s.status === "pending" ? `<div class="banner" style="margin-bottom:.8rem">${NX.ic("clock")}<span>Waiting for admin approval — not visible to members yet.</span></div>` : ""}
        ${s.status === "rejected" ? `<div class="banner" style="margin-bottom:.8rem">${NX.ic("alert")}<span>Not approved. Check the admin note in your inbox, edit the listing and contact support.</span></div>` : ""}
        <div class="g3" style="gap:.6rem;margin-bottom:.6rem">
          <div><span class="hint">Price</span><div><b>${NX.jod(s.price)}</b>/day · <b>${NX.jod(s.hourlyPrice)}</b>/hour</div></div>
          <div><span class="hint">Desks</span><div><b>${s.raw.desks}</b> · ${free} free today</div></div>
          <div><span class="hint">Rating</span><div><b>${s.rating || "New"}</b>${s.reviews ? " (" + s.reviews + ")" : ""}</div></div>
        </div>
        ${blocked ? `<p class="hint">${blocked} desk${blocked > 1 ? "s" : ""} blocked from booking.</p>` : ""}
        <label class="opt"><span><b>Instant booking</b><span class="d">Off = you approve each reservation</span></span><span class="switch"><input type="checkbox" data-inst="${s.id}"${s.instant ? " checked" : ""}><i></i></span></label>
        <label class="opt"><span><b>Listing visible</b><span class="d">Pause to hide the space from search</span></span><span class="switch"><input type="checkbox" data-vis="${s.id}"${!s.paused ? " checked" : ""}${s.status !== "approved" ? " disabled" : ""}><i></i></span></label>
        <div class="acts" style="margin-top:.8rem;justify-content:flex-start"><button class="btn btn-ghost btn-sm" data-desks="${s.id}" type="button">${NX.ic("desk")}<span>Manage desks</span></button><button class="btn btn-ghost btn-sm" data-edit="${s.id}" type="button">${NX.ic("edit")}<span>Edit details</span></button>${s.status === "approved" ? `<a class="btn btn-ghost btn-sm" href="${NX.page("space", { id: s.id })}">${NX.ic("external")}<span>Public page</span></a>` : ""}</div>
      </article>`;
      })
      .join("")}</div>`;
    NX.$$("[data-inst]", pg).forEach((i) =>
      i.addEventListener("change", async () => {
        await NX.Api.updateSpace(i.dataset.inst, { instant: i.checked });
        NX.toast(i.checked ? "Instant booking on." : "You will approve each reservation.");
      }),
    );
    NX.$$("[data-vis]", pg).forEach((i) =>
      i.addEventListener("change", async () => {
        await NX.Api.updateSpace(i.dataset.vis, { paused: !i.checked });
        NX.toast(i.checked ? "Listing is visible." : "Listing paused.");
        load();
      }),
    );
    NX.$$("[data-edit]", pg).forEach((b) =>
      b.addEventListener("click", () => edit(spaces.find((s) => s.id === b.dataset.edit))),
    );
    NX.$$("[data-desks]", pg).forEach((b) =>
      b.addEventListener("click", () => deskManager(b.dataset.desks)),
    );
  }

  /* ----- edit dialog ----- */
  function edit(s) {
    NX.dlg.open(`${NX.dlg.head("Edit " + esc(s.name), "Changes apply immediately.")}
      <form class="dlg-b form-grid" id="edForm" novalidate>
        ${NX.field("edName", "Space name", `<input id="edName" maxlength="50" value="${esc(s.name)}">`, "full")}
        ${NX.field("edArea", "Neighbourhood", `<input id="edArea" value="${esc(s.area)}">`)}
        ${NX.field("edCity", "City", `<select id="edCity">${CITIES.map((c) => `<option${c === s.city ? " selected" : ""}>${c}</option>`).join("")}</select>`)}
        ${NX.field("edPrice", "Price per desk / day (JOD)", `<input id="edPrice" type="number" min="1" max="200" step="0.5" value="${s.price}">`)}
        ${NX.field("edHourlyPrice", "Price per desk / hour (JOD)", `<input id="edHourlyPrice" type="number" min="0.5" max="50" step="0.25" value="${s.hourlyPrice}">`)}
        ${NX.field("edHours", "Opening hours", `<input id="edHours" value="${esc(s.hours)}">`)}
        ${NX.field("edDesc", "Description", `<textarea id="edDesc" rows="3" maxlength="300">${esc(s.description)}</textarea>`, "full")}
        <div class="field full"><span class="lb">Amenities</span><div class="chips">${amChips(s.am)}</div></div>
        <div class="dlg-actions full"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form>`);
    NX.$("#edForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const n = NX.$("#edName"),
        p = NX.$("#edPrice"),
        hp = NX.$("#edHourlyPrice");
      const a = NX.fieldErr(n, n.value.trim().length < 3 ? "Give your space a name." : "");
      const b = NX.fieldErr(
        p,
        +p.value >= 1 && +p.value <= 200 ? "" : "Enter a price between 1 and 200.",
      );
      const c = NX.fieldErr(
        hp,
        +hp.value >= 0.5 && +hp.value <= 50 ? "" : "Enter an hourly price between 0.5 and 50.",
      );
      if (!a || !b || !c) return;
      await NX.run(e.submitter, async () => {
        await NX.Api.updateSpace(s.id, {
          name: n.value,
          area: NX.$("#edArea").value,
          city: NX.$("#edCity").value,
          price: p.value,
          hourlyPrice: hp.value,
          hours: NX.$("#edHours").value,
          description: NX.$("#edDesc").value,
          am: NX.$$("[name=am]:checked").map((i) => i.value),
        });
        NX.dlg.close();
        NX.toast("Listing updated.");
        await load();
      });
    });
  }

  /* ----- desk manager ----- */
  async function deskManager(id) {
    const s = (await NX.Api.mySpaces()).find((x) => x.id === id);
    const upcoming = (await NX.Api.bookings()).filter(
      (b) =>
        b.spaceId === id && b.date >= NX.todayISO && ["confirmed", "pending"].includes(b.status),
    );
    const booked = new Set(upcoming.flatMap((b) => b.deskIds));
    NX.dlg
      .open(`${NX.dlg.head("Desks · " + esc(s.name), "Tap a desk to block or unblock it. Blocked desks cannot be booked.")}
      <div class="dlg-b">
        <div class="desk-grid" id="dg">${s.desks.map((d) => `<button type="button" class="dk ${d.zone}${d.blocked ? " blocked" : ""}${d.busy && !d.blocked ? " busy" : ""}" data-d="${d.id}" aria-pressed="${d.blocked}" title="${d.id} · ${d.zone}${d.busy ? " · taken today" : ""}">${d.id.slice(1)}</button>`).join("")}</div>
        <div class="cal-legend"><span><i style="background:var(--cyan)"></i>Quiet</span><span><i style="background:var(--violet)"></i>Social</span><span><i style="background:var(--amber)"></i>Taken today</span><span><i style="background:var(--pink)"></i>Blocked</span></div>
        <form id="cnt" class="toolbar" novalidate style="margin:0"><div class="field" style="flex:1"><label for="cntN">Total desks</label><input id="cntN" type="number" min="1" max="80" value="${s.raw.desks}"></div><button class="btn btn-ghost" type="submit">Update desk count</button></form>
        <div class="err" id="cntE" role="alert"></div>
        <div class="dlg-actions"><button class="btn btn-primary" type="button" data-close>Done</button></div>
      </div>`);
    NX.$("#dg").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      if (on && booked.has(b.dataset.d)) {
        NX.toast("This desk has upcoming bookings — cancel them first.", true);
        return;
      }
      await NX.Api.setDeskBlocked(id, b.dataset.d, on);
      b.setAttribute("aria-pressed", on);
      b.classList.toggle("blocked", on);
    });
    NX.$("#cnt").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await NX.Api.setDeskCount(id, NX.$("#cntN").value);
        NX.toast("Desk count updated.");
        deskManager(id);
        load();
      } catch (er) {
        NX.$("#cntE").textContent = er.message;
      }
    });
  }

  /* ----- add wizard ----- */
  function wizard() {
    const d = {
      name: "",
      area: "",
      city: "Amman",
      desks: 10,
      price: 8,
      hourlyPrice: 1.5,
      quiet: 50,
      am: ["wifi"],
      description: "",
    };
    let step = 1;
    const render = () => {
      const body =
        step === 1
          ? `${NX.field("wName", "Space name", `<input id="wName" maxlength="50" value="${esc(d.name)}" placeholder="e.g. Rainbow Street Studio">`)}
           ${NX.field("wArea", "Neighbourhood", `<input id="wArea" value="${esc(d.area)}" placeholder="e.g. Jabal Amman">`)}
           ${NX.field("wCity", "City", `<select id="wCity">${CITIES.map((c) => `<option${c === d.city ? " selected" : ""}>${c}</option>`).join("")}</select>`)}`
          : step === 2
            ? `${NX.field("wDesks", "Number of desks", `<input id="wDesks" type="number" min="1" max="80" value="${d.desks}">`)}
           ${NX.field("wPrice", "Price per desk / day (JOD)", `<input id="wPrice" type="number" min="1" max="200" step="0.5" value="${d.price}">`)}
           ${NX.field("wHourlyPrice", "Price per desk / hour (JOD)", `<input id="wHourlyPrice" type="number" min="0.5" max="50" step="0.25" value="${d.hourlyPrice}">`)}
           <div class="field"><label for="wQuiet">Quiet zone: <b id="wQv">${d.quiet}%</b> of desks</label><input id="wQuiet" type="range" min="0" max="100" step="10" value="${d.quiet}"></div>`
            : `<div class="field"><span class="lb">Amenities</span><div class="chips">${amChips(d.am)}</div></div>
           ${NX.field("wDesc", "Short description", `<textarea id="wDesc" rows="3" maxlength="300" placeholder="What makes your space special?">${esc(d.description)}</textarea>`)}
           <div class="banner info">${NX.ic("shield")}<span>An admin reviews every new listing. You will see it as <b>Pending</b> until it is approved.</span></div>`;
      NX.dlg.open(`${NX.dlg.head("Add a space", "Step " + step + " of 3")}
        <form class="dlg-b" id="wz" novalidate><div class="steps" style="margin:0">${["Basics", "Desks & price", "Amenities"].map((s, i) => `<li class="${i + 1 < step ? "done" : i + 1 === step ? "now" : ""}"><span>${i + 1 < step ? "✓" : i + 1}</span>${s}</li>`).join("")}</div>${body}
        <div class="dlg-actions">${step > 1 ? '<button class="btn btn-ghost" type="button" id="wBack">Back</button>' : '<button class="btn btn-ghost" type="button" data-close>Cancel</button>'}<button class="btn btn-primary" type="submit">${step < 3 ? "Continue" : "Submit for review"}</button></div></form>`);
      const q = NX.$("#wQuiet");
      if (q) q.addEventListener("input", () => (NX.$("#wQv").textContent = q.value + "%"));
      if (NX.$("#wBack"))
        NX.$("#wBack").addEventListener("click", () => {
          collect();
          step--;
          render();
        });
      NX.$("#wz").addEventListener("submit", async (e) => {
        e.preventDefault();
        collect();
        if (step === 1) {
          const a = NX.fieldErr(
            NX.$("#wName"),
            d.name.trim().length < 3 ? "Give your space a name (3+ characters)." : "",
          );
          const b = NX.fieldErr(
            NX.$("#wArea"),
            d.area.trim().length < 2 ? "Enter the neighbourhood." : "",
          );
          if (a && b) {
            step = 2;
            render();
          }
        } else if (step === 2) {
          const a = NX.fieldErr(
            NX.$("#wDesks"),
            d.desks >= 1 && d.desks <= 80 ? "" : "Between 1 and 80 desks.",
          );
          const b = NX.fieldErr(
            NX.$("#wPrice"),
            d.price >= 1 && d.price <= 200 ? "" : "Between 1 and 200 JOD.",
          );
          const c = NX.fieldErr(
            NX.$("#wHourlyPrice"),
            d.hourlyPrice >= 0.5 && d.hourlyPrice <= 50 ? "" : "Between 0.5 and 50 JOD.",
          );
          if (a && b && c) {
            step = 3;
            render();
          }
        } else {
          await NX.run(
            e.submitter,
            async () => {
              await NX.Api.addSpace({
                name: d.name,
                area: d.area,
                city: d.city,
                desks: d.desks,
                price: d.price,
                hourlyPrice: d.hourlyPrice,
                quiet: d.quiet / 100,
                am: d.am,
                description: d.description,
              });
              NX.dlg.close();
              NX.toast("Submitted for admin review.");
              await load();
            },
            "Submitting…",
          );
        }
      });
    };
    const collect = () => {
      const g = (id) => NX.$("#" + id);
      if (g("wName")) {
        d.name = g("wName").value;
        d.area = g("wArea").value;
        d.city = g("wCity").value;
      }
      if (g("wDesks")) {
        d.desks = +g("wDesks").value;
        d.price = +g("wPrice").value;
        d.hourlyPrice = +g("wHourlyPrice").value;
        d.quiet = +g("wQuiet").value;
      }
      if (g("wDesc")) {
        d.description = g("wDesc").value;
        d.am = NX.$$("[name=am]:checked").map((i) => i.value);
      }
    };
    render();
  }

  NX.$("#addBtn").addEventListener("click", () => wizard());
  try {
    await load();
    if (NX.qs("add")) wizard();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

/* NEXUS — spaces.js (browse & filter spaces) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX,
    $ = NX.$,
    esc = NX.esc,
    ic = NX.ic;
  const all = await NX.Api.spaces(NX.todayISO),
    st = { q: "", city: "", vibe: "", sort: "rating" };
  const governorates = [
    { id: "amman", name: "Amman", cities: ["amman"] },
    { id: "irbid", name: "Irbid", cities: ["irbid"] },
    { id: "zarqa", name: "Zarqa", cities: ["zarqa"] },
    { id: "balqa", name: "Balqa", cities: ["balqa", "salt"] },
    { id: "madaba", name: "Madaba", cities: ["madaba"] },
    { id: "karak", name: "Karak", cities: ["karak"] },
    { id: "tafilah", name: "Tafilah", cities: ["tafilah"] },
    { id: "ma-an", name: "Ma'an", cities: ["ma'an", "maan"] },
    { id: "aqaba", name: "Aqaba", cities: ["aqaba"] },
    { id: "mafraq", name: "Mafraq", cities: ["mafraq"] },
    { id: "jerash", name: "Jerash", cities: ["jerash"] },
    { id: "ajloun", name: "Ajloun", cities: ["ajloun"] },
  ];
  const governorateOf = (city) => {
    const normalizedCity = NX.norm(city);
    return governorates.find((g) => g.cities.includes(normalizedCity));
  };
  const governorateDropdown = $("#governorateDropdown"),
    governorateOptions = $("#governorateOptions"),
    governorateValue = $("#governorateValue"),
    vibeDropdown = $("#vibeDropdown"),
    vibeOptions = $("#vibeOptions"),
    vibeValue = $("#vibeValue"),
    sortDropdown = $("#sortDropdown"),
    sortOptions = $("#sortOptions"),
    sortValue = $("#sortValue"),
    list = $("#spList"),
    count = $("#spCount");
  const free = (sp) => sp.desks.filter((d) => !d.busy && !d.blocked).length;
  const governorateCounts = new Map(governorates.map((g) => [g.id, 0]));
  all.forEach((space) => {
    const governorate = governorateOf(space.city);
    if (governorate) governorateCounts.set(governorate.id, governorateCounts.get(governorate.id) + 1);
  });
  const governorateChoices = [
    { id: "", label: `All governorates (${all.length} spaces)` },
    ...governorates.map((g) => {
      const total = governorateCounts.get(g.id);
      return {
        id: g.id,
        label: `${g.name} (${total} ${total === 1 ? "space" : "spaces"})`,
        disabled: total === 0,
      };
    }),
  ];
  const vibeChoices = [
    { id: "", label: "Any vibe" },
    { id: "quiet", label: "Quiet" },
    { id: "social", label: "Social" },
  ];
  const sortChoices = [
    { id: "rating", label: "Top rated" },
    { id: "price", label: "Lowest price" },
    { id: "free", label: "Most available" },
  ];
  const renderChoices = (container, choices, selected) => {
    container.innerHTML = choices
      .map(
        (choice) =>
          `<button type="button" class="dropdown-option" data-value="${esc(choice.id)}" aria-pressed="${choice.id === selected}"${choice.disabled ? " disabled" : ""}>${esc(choice.label)}</button>`,
      )
      .join("");
  };
  renderChoices(governorateOptions, governorateChoices, st.city);
  renderChoices(vibeOptions, vibeChoices, st.vibe);
  renderChoices(sortOptions, sortChoices, st.sort);

  /* radar pins: one per city, placed by a stable hash */
  const map = $("#radarMap"),
    byCity = {};
  all.forEach((s) => (byCity[s.city] = byCity[s.city] || []).push(s));
  Object.keys(byCity).forEach((c, i) => {
    const h = NX.hue(c),
      a = i * 2.3 + 0.6,
      r = 20 + (i % 2) * 12;
    const p = document.createElement("div");
    p.className = "pin";
    p.style.cssText = `left:${50 + Math.cos(a) * r}%;top:${50 + Math.sin(a) * r}%;--c:hsl(${h},90%,62%)`;
    p.innerHTML = `<i></i><span>${esc(c)}</span>`;
    map.append(p);
  });

  const card = (sp, n) => {
    const f = free(sp),
      sorted = sp.desks.slice().sort((a, b) => a.busy - b.busy);
    const mini = sorted
      .map((d) => `<i class="${d.busy ? "b" : ""} ${d.zone === "quiet" ? "q" : ""}"></i>`)
      .join("");
    const tags =
      (sp.owner ? "" : "") +
      sp.am
        .slice(0, 3)
        .map((a) => `<span class="tag">${esc(AMENITIES[a] || a)}</span>`)
        .join("");
    return `<a class="card sc" data-spot style="--h:${sp.hue};--n:${n}" href="${NX.page("space", { id: sp.id })}">
      <div class="sc-top"><h3>${esc(sp.name)}</h3>${sp.rating ? `<span class="rate">${ic("star")}${sp.rating}</span>` : '<span class="tag acc">New</span>'}</div>
      <p class="muted">${ic("pin")} ${esc(sp.area)}, ${esc(sp.city)}</p>
      <div class="mini" aria-hidden="true">${mini}</div>
      <div class="avail"><b>${f}</b> of ${sp.desks.length} desks free today</div>
      <div class="tags-row">${tags}</div>
      <div class="sc-foot"><div class="price"><b>${NX.jod(sp.price)}</b><span>per desk / day · ${NX.jod(sp.hourlyPrice)} / hour</span></div><span class="go-c">${ic("arrow-r")}</span></div></a>`;
  };
  function render() {
    const t = NX.norm(st.q.trim());
    const l = all.filter(
      (sp) =>
        (!t || NX.norm(sp.name + " " + sp.area + " " + sp.city).includes(t)) &&
        (!st.city || governorateOf(sp.city)?.id === st.city) &&
        (!st.vibe || sp.desks.some((d) => !d.busy && d.zone === st.vibe)),
    );
    l.sort((a, b) =>
      st.sort === "price"
        ? a.price - b.price
        : st.sort === "free"
          ? free(b) - free(a)
          : (b.rating || 0) - (a.rating || 0),
    );
    count.textContent = l.length + (l.length === 1 ? " space" : " spaces");
    list.innerHTML = l.length
      ? l.map(card).join("")
      : `<div style="grid-column:1/-1"><div class="empty">${ic("search")}<h3>No spaces match</h3><p>Try another city or vibe.</p></div></div>`;
    if (NX.spot) NX.spot();
  }
  governorateOptions.addEventListener("click", (e) => {
    const option = e.target.closest("button[data-value]");
    if (!option || option.disabled) return;
    st.city = option.dataset.value;
    governorateValue.textContent = governorateChoices.find((choice) => choice.id === st.city).label;
    renderChoices(governorateOptions, governorateChoices, st.city);
    governorateDropdown.open = false;
    render();
  });
  vibeOptions.addEventListener("click", (e) => {
    const option = e.target.closest("button[data-value]");
    if (!option || option.disabled) return;
    st.vibe = option.dataset.value;
    vibeValue.textContent = vibeChoices.find((choice) => choice.id === st.vibe).label;
    renderChoices(vibeOptions, vibeChoices, st.vibe);
    vibeDropdown.open = false;
    render();
  });
  sortOptions.addEventListener("click", (e) => {
    const option = e.target.closest("button[data-value]");
    if (!option || option.disabled) return;
    st.sort = option.dataset.value;
    sortValue.textContent = sortChoices.find((choice) => choice.id === st.sort).label;
    renderChoices(sortOptions, sortChoices, st.sort);
    sortDropdown.open = false;
    render();
  });
  [governorateDropdown, vibeDropdown, sortDropdown].forEach((dropdown) => {
    dropdown.addEventListener("toggle", () => {
      if (!dropdown.open) return;
      [governorateDropdown, vibeDropdown, sortDropdown].forEach((other) => {
        if (other !== dropdown) other.open = false;
      });
    });
  });
  $("#fQ").addEventListener("input", (e) => {
    st.q = e.target.value;
    render();
  });
  render();
});

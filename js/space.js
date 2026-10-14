/* NEXUS — space.js (interactive floor plan + booking) */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX,
    $ = NX.$,
    esc = NX.esc,
    ic = NX.ic;
  const root = $("#spaceRoot");
  try {
  const id = NX.qs("id");
  const user = NX.Auth.user() || NX.Auth.demo();
  const canBook = !!user && (user.role === "user" || user.role === "company");
  let date = NX.qs("date") && NX.qs("date") >= NX.todayISO ? NX.qs("date") : NX.todayISO,
    durationType = NX.qs("durationType") === "hourly" ? "hourly" : "daily",
    startTime = NX.qs("startTime") || "",
    endTime = NX.qs("endTime") || "",
    selectedZone = ["quiet", "social"].includes(NX.qs("zone")) ? NX.qs("zone") : "",
    scheduleError = "",
    sp = await NX.Api.space(id, date, { durationType, startTime, endTime }),
    picked = [],
    fav = false;
  if (canBook) fav = (await NX.Api.favorites()).spaces.includes(id);
  if (!sp) {
    root.innerHTML = `<div class="empty">${ic("search")}<h3>Space not found</h3><p>The link may have changed, or the space is not live yet.</p><a class="btn btn-primary" href="${NX.page("spaces")}">All spaces</a></div>`;
    return;
  }
  const bookingSettings = await NX.Api.publicSettings();
  const bookingWindow = Number(bookingSettings.bookingWindow) || 30;
  const workspaceCommissionRate = bookingSettings.spaceCommission / 100;
  document.title = sp.name + " | NEXUS";
  let hint = null;
  try {
    hint = NX.Store.get("selected_desk", null);
    NX.Store.del("selected_desk");
  } catch (e) {}
  const dayChips = () =>
    Array.from({ length: 10 }, (_, i) => {
      const d = NX.addDays(NX.todayISO, i),
        o = new Date(d + "T12:00:00");
      return `<button type="button" class="dchip" data-date="${d}" aria-pressed="${d === date}"><small>${i === 0 ? "Today" : o.toLocaleDateString("en-GB", { weekday: "short" })}</small><b>${o.getDate()}</b></button>`;
    }).join("");
  const zone = (z, label) => {
    const ds = sp.desks.filter((d) => d.zone === z);
    if (!ds.length) return "<p class=\"hint\">No desks in this zone.</p>";
    return `<div class="zone ${z === "quiet" ? "q" : "s"}"><h3 class="zone-t">${label}</h3><div class="desks">${ds
      .map(
        (d) =>
          `<button type="button" class="desk${picked.includes(d.id) ? " sel" : ""}" data-desk="${d.id}" ${d.busy || d.blocked ? "disabled" : ""} aria-pressed="${picked.includes(d.id)}" aria-label="Desk ${+d.id.slice(1)}, ${d.busy || d.blocked ? "unavailable" : "available"}">${+d.id.slice(1)}</button>`,
      )
      .join("")}</div></div>`;
  };
  const unavailable = (d) => d.busy || d.blocked;
  const freeN = () => sp.desks.filter((d) => !unavailable(d)).length;
  const zoneDesks = (z) => sp.desks.filter((d) => d.zone === z);
  const zoneFreeN = (z) => zoneDesks(z).filter((d) => !unavailable(d)).length;
  const here = () => NX.page("space", { id, date, durationType, ...(selectedZone ? { zone: selectedZone } : {}), ...(durationType === "hourly" ? { startTime, endTime } : {}) });

  const rangeMinutes = () => {
    if (/24\/7/i.test(sp.hours || "")) return [0, 1440];
    const match = String(sp.hours || "").match(/(\d{1,2}:\d{2})\s*[\u2013\u2014-]\s*(\d{1,2}:\d{2})/);
    if (!match) return [9 * 60, 18 * 60];
    const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    return [toMinutes(match[1].padStart(5, "0")), toMinutes(match[2].padStart(5, "0"))];
  };
  const fmtTime = (minutes) => (minutes === 1440 ? "24:00" : String(Math.floor(minutes / 60)).padStart(2, "0") + ":00");
  const timeOptions = (minimum, maximum, current) =>
    Array.from({ length: Math.max(0, (maximum - minimum) / 60 + 1) }, (_, i) => fmtTime(minimum + i * 60))
      .map((time) => `<option value="${time}"${time === current ? " selected" : ""}>${esc(NX.fmtTime(time))}</option>`)
      .join("");
  const hourlyRange = () => {
    const [open, close] = rangeMinutes();
    return { first: Math.ceil(open / 60) * 60, last: Math.floor(close / 60) * 60 };
  };
  const canShowDesks = () => selectedZone && !scheduleError && (durationType === "daily" || (startTime && endTime && startTime < endTime));
  const unitCount = () => durationType === "hourly" ? (Number(endTime.slice(0, 2)) - Number(startTime.slice(0, 2))) : 1;
  const baseAmount = () => (durationType === "hourly" ? sp.hourlyPrice * unitCount() : sp.price) * picked.length;
  const commissionAmount = () => Math.round(baseAmount() * workspaceCommissionRate * 100) / 100;
  const totalAmount = () => Math.round((baseAmount() + commissionAmount()) * 100) / 100;

  function cta() {
    const period = durationType === "hourly" ? `${esc(NX.fmtTime(startTime))}–${esc(NX.fmtTime(endTime))} (${unitCount()} ${unitCount() === 1 ? "hour" : "hours"})` : "Full day";
    const summary = `<div class="row"><span class="muted">Date & time</span><b>${NX.fmtDate(date)} · ${period}</b></div>
       <div class="row"><span class="muted">Desks</span><b>${picked.length ? esc(picked.map((p) => +p.slice(1)).join(", ")) : "Not selected"}</b></div>
       <div class="row"><span class="muted">Base price</span><b>${NX.jod(baseAmount())}</b></div>
       <div class="row"><span class="muted">Workspace fee (${workspaceCommissionRate * 100}%)</span><b>${NX.jod(commissionAmount())}</b></div>
       <div class="row"><span>Total</span><span class="total">${NX.jod(totalAmount())}</span></div>`;
    let action;
    if (!user)
      action = `<a class="btn btn-primary btn-lg btn-block" href="${NX.page("login", { next: "space.html?id=" + id + "&date=" + date })}">Sign in to book</a><p class="hint" style="margin-top:.6rem;text-align:center">Booking companies? <a class="link" href="${NX.page("company-login", { next: "space.html?id=" + id })}">Company sign in</a></p>`;
    else if (!canBook)
      action = `<div class="note">You are signed in as ${esc(NX.ROLES[user.role].label.toLowerCase())}. Use a member or company account to book desks.</div>`;
    else
      action = `<a class="btn btn-primary btn-lg btn-block${picked.length ? "" : " disabled"}" id="bGo" ${picked.length ? "" : 'aria-disabled="true"'} href="${picked.length ? NX.page("booking-summary", { space: sp.id, desks: picked.join(","), date, durationType, ...(durationType === "hourly" ? { startTime, endTime } : {}) }) : "#"}">${picked.length ? "Review booking" : "Choose a desk"}</a>`;
    return `<div class="card pad"><h2 class="h3">Booking summary</h2>${summary}<div style="margin-top:1rem">${action}</div>
      ${sp.instant ? "" : '<p class="hint" style="margin-top:.6rem">This space confirms each booking manually.</p>'}</div>
      <div class="card pad"><h2 class="h3">Need help first?</h2><div class="stack" style="display:grid;gap:.6rem">
        ${sp.ownerEmail && canBook ? `<a class="btn btn-ghost btn-block" href="${NX.page(user.role + "-messages", { to: sp.ownerEmail, subject: "Question about " + sp.name, returnTo: here() })}">${ic("inbox")} Message the owner</a>` : ""}
        <a class="btn btn-ghost btn-block" href="${NX.page("services")}">${ic("zap")} Desk services</a>
        <a class="btn btn-ghost btn-block" href="${NX.page("experts")}">${ic("spark")} I need an expert</a></div></div>`;
  }

  const stars = (n) => NX.stars(n);
  const reviews = () =>
    sp.feedback && sp.feedback.length
      ? `<div class="card pad"><h2 class="h3">Guest reviews</h2>${sp.feedback
          .slice(0, 4)
          .map(
            (f) =>
              `<div class="row" style="display:block"><div>${stars(f.rating)} <b>${esc(f.fromName)}</b></div><p class="muted" style="margin-top:.2rem">“${esc(f.text)}”</p></div>`,
          )
          .join("")}</div>`
      : "";

  function render() {
    root.innerHTML = `<a class="back" href="${NX.page("spaces")}">${ic("arrow-l")} All spaces</a>
    <header class="sx-hero" style="--h:${sp.hue}"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start"><h1>${esc(sp.name)}</h1>
      ${canBook ? `<button class="fav-b${fav ? " on" : ""}" id="favBtn" type="button" aria-pressed="${fav}" aria-label="Save space">${ic("heart")}</button>` : ""}</div>
      <div class="meta"><span>${ic("pin")} ${esc(sp.area)}, ${esc(sp.city)}</span>${sp.rating ? `<span class="rate">${ic("star")}${sp.rating}</span>` : ""}<span><b>${freeN()}</b> of ${sp.desks.length} desks free</span><span><b>${NX.jod(sp.price)}</b> / desk / day</span><span><b>${NX.jod(sp.hourlyPrice)}</b> / desk / hour</span></div>
      ${sp.description ? `<p class="muted" style="max-width:46rem;margin-top:.6rem">${esc(sp.description)}</p>` : ""}
      <div class="chips-i">${sp.am.map((a) => `<span class="tag">${esc(AMENITIES[a] || a)}</span>`).join("")}${sp.hours ? `<span class="tag">${ic("clock")} ${esc(sp.hours.replace(/\b\d{1,2}:\d{2}\b/g, (time) => NX.fmtTime(time)))}</span>` : ""}</div></header>
    <div class="detail"><div class="stack-l" style="display:grid;gap:1.2rem;align-content:start"><div class="card pad">
      <h2 class="h3">Choose a zone, then your desk</h2>
      ${hint ? `<div class="hint-d">You were looking at the “${esc(hint)}” — pick any free desk that suits you.</div>` : ""}
      <div class="zone-options" role="group" aria-label="Choose a desk zone">
        <a class="zone-choice zone-choice-quiet${selectedZone === "quiet" ? " is-selected" : ""}" href="${NX.page("space", { id, date, durationType, zone: "quiet", ...(durationType === "hourly" && startTime && endTime ? { startTime, endTime } : {}) })}"${selectedZone === "quiet" ? ' aria-current="true"' : ""}><span class="zone-choice-icon">${ic("desk")}</span><span class="zone-choice-copy"><b>Quiet</b><small>Focus and uninterrupted work</small></span><span class="zone-choice-count">${zoneFreeN("quiet")} free</span></a>
        <a class="zone-choice zone-choice-social${selectedZone === "social" ? " is-selected" : ""}" href="${NX.page("space", { id, date, durationType, zone: "social", ...(durationType === "hourly" && startTime && endTime ? { startTime, endTime } : {}) })}"${selectedZone === "social" ? ' aria-current="true"' : ""}><span class="zone-choice-icon">${ic("users")}</span><span class="zone-choice-copy"><b>Social</b><small>Connect and collaborate</small></span><span class="zone-choice-count">${zoneFreeN("social")} free</span></a>
      </div>
      ${selectedZone ? `<div class="booking-period">
        <div class="field"><label for="durationType">Booking length</label><select id="durationType"><option value="daily"${durationType === "daily" ? " selected" : ""}>By day</option><option value="hourly"${durationType === "hourly" ? " selected" : ""}>By the hour</option></select></div>
        <div class="field"><label for="bookingDate">Date</label><input id="bookingDate" type="date" min="${NX.todayISO}" max="${NX.addDays(NX.todayISO, bookingWindow)}" value="${esc(date)}" required></div>
        ${durationType === "hourly" ? (() => { const range = hourlyRange(); return `<div class="field"><label for="startTime">Start time</label><select id="startTime">${timeOptions(range.first, Math.max(range.first, range.last - 60), startTime)}</select></div><div class="field"><label for="endTime">End time</label><select id="endTime">${timeOptions(range.first + 60, range.last, endTime)}</select></div>`; })() : `<div class="field"><span class="lb">Daily rate</span><b>${NX.jod(sp.price)} / desk</b></div>`}
      </div>${scheduleError ? `<p class="err" role="alert">${esc(scheduleError)}</p>` : ""}
      ${canShowDesks() ? `<h3 class="zone-t">${selectedZone === "quiet" ? "Quiet" : "Social"} desks</h3><div class="plan"><i class="win"></i><div class="zones">${zone(selectedZone, selectedZone === "quiet" ? "Quiet zone" : "Social zone")}</div><i class="door"></i></div><div class="legend"><span><i></i>Available</span><span><i class="b"></i>Taken / blocked</span><span><i class="s"></i>Your pick</span></div>` : `<p class="hint">Choose a valid date and time to see desk availability.</p>`}` : `<p class="hint">Choose Quiet or Social to continue.</p>`}
    </div>${reviews()}</div><aside class="sticky" id="side">${cta()}</aside></div>`;
  }
  function setDefaultHourRange() {
    const range = hourlyRange();
    const now = new Date();
    const nowMinutes = date === NX.todayISO ? now.getHours() * 60 + now.getMinutes() : range.first - 60;
    const next = Math.max(range.first, Math.floor(nowMinutes / 60 + 1) * 60);
    startTime = fmtTime(next);
    endTime = fmtTime(Math.min(range.last, next + 60));
    if (next >= range.last) {
      startTime = "";
      endTime = "";
    }
  }
  async function refreshAvailability() {
    scheduleError = "";
    if (!date || date < NX.todayISO || date > NX.addDays(NX.todayISO, bookingSettings.bookingWindow)) {
      scheduleError = !date
        ? "Choose a booking date."
        : date < NX.todayISO
          ? "Pick today or a future date."
          : `You can book up to ${bookingWindow} days ahead.`;
      picked = [];
      render();
      return;
    }
    if (durationType === "hourly" && (!startTime || !endTime || startTime >= endTime)) {
      scheduleError = "Choose a valid start and end time.";
      picked = [];
      render();
      return;
    }
    try {
      sp = await NX.Api.space(id, date, { durationType, startTime, endTime });
      picked = picked.filter((deskId) => !unavailable(sp.desks.find((desk) => desk.id === deskId) || { busy: true }));
    } catch (error) {
      scheduleError = error.message;
      picked = [];
    }
    render();
  }
  root.addEventListener("click", async (e) => {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement;
    const dc = target?.closest("[data-date]");
    if (dc) {
      date = dc.dataset.date;
      sp = await NX.Api.space(id, date);
      history.replaceState(null, "", here());
      picked = picked.filter(
        (p) => !unavailable(sp.desks.find((d) => d.id === p) || { busy: true }),
      );
      render();
      return;
    }
    const d = target?.closest("[data-desk]");
    if (d && !d.disabled) {
      const k = d.dataset.desk;
      picked = picked.includes(k) ? picked.filter((x) => x !== k) : picked.concat(k);
      if (picked.length > 8) {
        picked.pop();
        NX.toast("You can book up to 8 desks at once.", true);
      }
      render();
      const s = $(`[data-desk="${k}"]`, root);
      if (s) s.focus();
      return;
    }
    if (target?.closest("#favBtn")) {
      fav = await NX.Api.toggleFavorite("space", id);
      render();
      NX.toast(fav ? "Saved to favourites." : "Removed from favourites.");
    }
  });
  root.addEventListener("change", async (event) => {
    if (event.target.id === "durationType") {
      durationType = event.target.value;
      picked = [];
      if (durationType === "hourly") setDefaultHourRange();
      else { startTime = ""; endTime = ""; }
      await refreshAvailability();
    } else if (event.target.id === "bookingDate") {
      date = event.target.value;
      if (durationType === "hourly") setDefaultHourRange();
      history.replaceState(null, "", here());
      await refreshAvailability();
    } else if (event.target.id === "startTime" || event.target.id === "endTime") {
      startTime = $("#startTime", root)?.value || "";
      endTime = $("#endTime", root)?.value || "";
      if (event.target.id === "startTime" && startTime >= endTime) {
        const next = Number(startTime.slice(0, 2)) + 1;
        endTime = next === 24 ? "24:00" : String(next).padStart(2, "0") + ":00";
      }
      history.replaceState(null, "", here());
      await refreshAvailability();
    }
  });
  render();
  } catch (error) {
    console.error("NEXUS space page failed to load:", error);
    if (root) {
      root.innerHTML = `<div class="card pad"><h2 class="h3">We couldn’t load this space</h2><p class="hint">${esc(error?.message || "Please refresh the page and try again.")}</p><a class="btn btn-primary" href="${NX.page("spaces")}">Back to spaces</a></div>`;
    }
  }
});

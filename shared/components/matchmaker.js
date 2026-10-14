/* NEXUS — shared component: AI Expert Matchmaker + expert directory + consultation booking.
   Used by the public Experts page, the member portal (AI matchmaking) and the company booking page.
   The matching is a front-end demo (see shared/js/ai.js): it only suggests, the member decides.
   NX.Matchmaker.mount(root, { compact, onBooked, showUpcomingSessions }) */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;
  const ic = NX.ic;

  NX.Matchmaker = {
    async mount(root, opts) {
      opts = opts || {};
      const [experts, spaces] = await Promise.all([NX.Api.experts(), NX.Api.spaces(NX.todayISO)]);
      const user = NX.Auth.user() || NX.Auth.demo();
      const canBook = !!user && (user.role === "user" || user.role === "company");
      let favs = { experts: [] };
      if (canBook) favs = await NX.Api.favorites();
      const sname = (id) => (spaces.find((s) => s.id === id) || { name: "" }).name;
      let problem = "";
      let token = 0;

      root.innerHTML = `
        <div id="bookingNotice" class="booking-notice" role="status" aria-live="polite" tabindex="-1" hidden></div>
        <div class="ai-panel card" id="aiPanel">
          <div class="ai-glow" aria-hidden="true"></div>
          <label class="sr" for="mtIn">Describe your problem</label>
          <textarea id="mtIn" rows="3" placeholder="e.g. My online store gets visitors but very few orders, and I don't know why…"></textarea>
          <div class="ai-bar">
            <div class="pills" id="examples">
              <button type="button" class="pill" data-example="My online store has lots of traffic but weak sales and I don't know why.">Weak store sales</button>
              <button type="button" class="pill" data-example="Our database queries are slow and the app lags when many users log in.">Slow database</button>
              <button type="button" class="pill" data-example="I need someone to review a partnership agreement before I sign it.">Contract review</button>
              <button type="button" class="pill" data-example="I want a pricing strategy for my new startup and a clear growth plan.">Pricing strategy</button>
            </div>
            <button class="btn btn-primary" id="mtGo" type="button">${ic("zap")} Find my expert<kbd>Ctrl ↵</kbd></button>
          </div>
          <div id="mtOut" class="mt-out" aria-live="polite"></div>
        </div>
        <div id="consBox"></div>
        <section class="ex-market">
          <div class="section-head" ><h2>Browse all experts</h2><p class="muted">Filter by name or specialty and book a session directly.</p></div>
          <div class="tools-row">
            <div class="field grow"><label class="sr" for="eQ">Search</label><input id="eQ" type="search" placeholder="Search by name or title…"></div>
            <div class="field"><label class="sr" for="eNeed">Specialty</label><select id="eNeed"></select></div>
            <span class="count" id="exCount"></span>
          </div>
          <div class="ex-list" id="exList"></div>
        </section>`;

      const $ = (s) => NX.$(s, root);
      const ta = $("#mtIn"),
        out = $("#mtOut"),
        btn = $("#mtGo");
      const rate = (r) => (r ? `<span class="rate">${ic("star")}${r}</span>` : "");
      const modeTags = (e) =>
        e.modes.map((m) => `<span class="tag">${esc(MODES[m].en)}</span>`).join("");
      const heart = (e) =>
        canBook
          ? `<button class="fav${favs.experts.includes(e.id) ? " on" : ""}" data-fav="${e.id}" type="button" aria-label="Save ${esc(e.name)}" aria-pressed="${favs.experts.includes(e.id)}">${ic("heart")}</button>`
          : "";

      /* ---------- AI panel ---------- */
      const needLabel = (id) => (NEEDS[id] && NEEDS[id].en) || id;
      const matchCard = (m, i) => `<article class="match" data-expert-id="${esc(m.e.id)}" style="--n:${i}">${NX.userAvatar ? NX.userAvatar(m.e) : NX.avatar(m.e.name)}
        <div><div style="display:flex;gap:.7rem;align-items:center;flex-wrap:wrap"><h3>${esc(m.e.name)}</h3>${rate(m.e.rating)}</div><div class="sub">${esc(m.e.title || "")}</div></div>
        <div class="ring" style="--p:0" data-p="${m.pct}" aria-label="${m.pct}% demo match"><span>${m.pct}%</span></div>
        <p class="why"><b>Why this expert?</b> Listed specialties include ${esc(m.cov.map(needLabel).join(" and "))}. ${esc(m.e.why || "")}${m.here ? " Currently at your space." : ""}</p>
        <div class="m-foot"><div class="pills">${modeTags(m.e)}<a class="tag" href="${NX.page("experts", { expert: m.e.id })}">View profile</a></div><button class="btn btn-primary btn-sm" data-consult="${m.e.id}" type="button">Book a consultation</button></div></article>`;

      async function run() {
        const text = ta.value.trim();
        problem = text;
        const my = ++token;
        if (text.length < 12) {
          out.innerHTML =
            '<div class="note">Write a sentence or two: what are you trying to achieve and where are you stuck?</div>';
          ta.focus();
          return;
        }
        if (!NX.Ai || typeof NX.Ai.detect !== "function") {
          out.innerHTML =
            '<div class="note">The local matchmaker could not load. Refresh the page and try again.</div>';
          return;
        }
        btn.disabled = true;
        const steps = [
          "Reading your problem",
          "Detecting the fields involved",
          "Ranking experts by fit",
        ];
        out.innerHTML = `<div class="think">${steps.map((s) => `<div class="st"><span class="d"></span>${s}…</div>`).join("")}</div>`;
        try {
          const rows = NX.$$(".st", out);
          for (let i = 0; i < rows.length; i++) {
            rows[i].classList.add("on");
            await NX.sleep(NX.reduced ? 0 : 450);
            if (my !== token) return;
            rows[i].classList.replace("on", "ok");
          }
          const needs = NX.Ai.detect(text);
          if (!needs.length) {
            out.innerHTML =
              '<div class="note">No specialty keywords matched this description. Add the area, tool or goal — or browse experts below. This is local keyword matching, not an external AI model.</div><button class="btn btn-ghost btn-sm" type="button" id="mtRefine">Refine search</button>';
            NX.$("#mtRefine", out)?.addEventListener("click", () => ta.focus());
            return;
          }
          let mine = [];
          try {
            if (canBook) mine = (await NX.Api.bookings()).map((b) => b.spaceId);
          } catch (e) {}
          if (my !== token) return;
          const res = NX.Ai.match(needs, experts, mine);
          out.innerHTML = `<div class="needs"><b class="muted">Likely needs · local demo</b>${needs.map((n) => `<span class="tag acc">${esc(needLabel(n))}</span>`).join("")}</div>${
            res.length
              ? res.map(matchCard).join("")
              : '<div class="note">No approved expert covers this field yet. Try describing it differently.</div><button class="btn btn-ghost btn-sm" type="button" id="mtRefine">Refine search</button>'
          }<p class="muted" style="font-size:.9rem">Local keyword matching on listed specialties and ratings — not an external AI service. Suggestions only; you choose.</p>`;
          NX.$("#mtRefine", out)?.addEventListener("click", () => ta.focus());
          requestAnimationFrame(() =>
            NX.$$(".ring", out).forEach((r) => {
              r.style.transition = "none";
              let p = 0;
              const t = +r.dataset.p;
              const f = () => {
                p = Math.min(t, p + 3);
                r.style.setProperty("--p", p);
                if (p < t) requestAnimationFrame(f);
              };
              NX.reduced ? r.style.setProperty("--p", t) : f();
            }),
          );
        } catch (error) {
          out.innerHTML = `<div class="note">${esc(error.message || "Matching failed. Try again or browse the directory below.")}</div>`;
        } finally {
          if (my === token) btn.disabled = false;
        }
      }
      btn.addEventListener("click", run);
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
      });
      NX.$$("[data-example]", root).forEach((b) =>
        b.addEventListener("click", () => {
          ta.value = b.dataset.example;
          ta.focus();
        }),
      );

      /* ---------- directory ---------- */
      const fq = $("#eQ"),
        fn = $("#eNeed"),
        list = $("#exList"),
        count = $("#exCount");
      fn.innerHTML =
        '<option value="">All specialties</option>' +
        Object.entries(NEEDS)
          .map(([k, n]) => `<option value="${k}">${n.en}</option>`)
          .join("");
      const card = (
        e,
      ) => `<article class="card ex-card" data-spot><div class="ex-head">${NX.userAvatar ? NX.userAvatar(e) : NX.avatar(e.name)}<div><h3>${esc(e.name)}</h3><span class="tag acc">${esc(needLabel(e.skills && e.skills[0]))}</span></div>${heart(e)}</div>`
        <div class="row2">${rate(e.rating)}<span class="muted" style="font-size:.85rem">${e.n ? e.n + " sessions" : "New expert"}</span></div>
        <div class="ex-card-meta"><span class="ex-modes">${e.modes.map((m) => MODES[m].en).join(" · ")}</span></div>
        <div class="ex-foot"><div><b>${NX.jod(e.rate)}</b><span>/ session</span></div><button class="btn btn-ghost btn-sm" data-consult="${e.id}" type="button">Book session</button></div></article>`;
      function renderList() {
        const t = NX.norm(fq.value.trim());
        const l = experts
          .filter(
            (e) =>
              (!t || NX.norm(e.name + " " + e.title).includes(t)) &&
              (!fn.value || e.skills.includes(fn.value)),
          )
          .sort((a, b) => (b.rating || 4) - (a.rating || 4));
        count.textContent = l.length + (l.length === 1 ? " expert" : " experts");
        list.innerHTML = l.length
          ? l.map(card).join("")
          : `<div style="grid-column:1/-1"><div class="empty">${ic("search")}<h3>No experts match</h3><p>Try another specialty, or describe your problem above.</p></div></div>`;
      }
      fq.addEventListener("input", renderList);
      fn.addEventListener("change", renderList);
      renderList();

      async function renderConsults() {
        const box = $("#consBox");
        if (!canBook || opts.showUpcomingSessions === false) {
          box.innerHTML = "";
          return;
        }
        const l = (await NX.Api.consults())
          .filter((c) => ["requested", "confirmed"].includes(c.status))
          .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
        box.innerHTML = l.length
          ? `<div class="card"><h2 class="h3">Your upcoming sessions</h2>${l
              .map(
                (x) =>
                  `<div class="cons-i">${NX.avatar(x.expertName)}<div><b>${esc(x.expertName)}</b><div class="muted" style="font-size:.9rem">${NX.fmtDate(x.date, { weekday: "short", day: "numeric", month: "short" })} · ${esc(x.time)} — ${esc(MODES[x.mode].en)}</div></div>${NX.status(x.status)}</div>`,
              )
              .join("")}</div>`
          : "";
      }

      /* favourites */
      root.addEventListener("click", async (ev) => {
        const f = ev.target.closest("[data-fav]");
        if (!f) return;
        const on = await NX.Api.toggleFavorite("expert", f.dataset.fav);
        f.classList.toggle("on", on);
        f.setAttribute("aria-pressed", on);
        NX.toast(on ? "Saved to favourites." : "Removed from favourites.");
      });

      /* ---------- booking dialog ---------- */
      let c = null;
      let submitting = false;
      root.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-consult]");
        if (!b) return;
        const e = experts.find((x) => x.id === b.dataset.consult);
        if (!user) {
          NX.dlg.open(
            `${NX.dlg.head("Sign in to book", "Create a free account or sign in to book " + esc(e.name) + ".")}<div class="dlg-b"><a class="btn btn-primary btn-block" href="${NX.page("login", { next: "experts.html" })}">Sign in as a member</a><a class="btn btn-ghost btn-block" href="${NX.page("company-login", { next: "company-booking.html" })}">I book for a company</a></div>`,
          );
          return;
        }
        if (!canBook) {
          NX.toast("Switch to a member or company account to book sessions.", true);
          return;
        }
        openBooking(e, b);
      });

      async function openBooking(e, trigger) {
        const [quote, slots] = await Promise.all([NX.Api.consultQuote(e.id), NX.Api.expertSlots(e.id)]);
        const co = user.role === "company" ? await NX.Api.myCompany() : null;
        c = {
          e,
          mode: null,
          slot: null,
        };
        NX.dlg.open(`${NX.dlg.head("Book a consultation", esc(e.name) + " — " + esc(e.title))}
          <form class="dlg-b" id="cForm" novalidate>
            ${co && co.status !== "approved" ? `<div class="banner">${ic("alert")}<span>Your company account is waiting for admin approval. You can browse, but booking unlocks after approval.</span></div>` : ""}
            <div class="field"><span class="lb">Session type</span><div class="pills" id="cMode" role="group" aria-label="Session type">${e.modes.map((m) => `<button type="button" class="pill" data-mode="${m}" aria-pressed="false">${MODES[m].en}</button>`).join("")}</div><div class="err" id="cModeErr" role="alert"></div>${e.spaceId && sname(e.spaceId) ? `<p class="hint" id="cLocation" hidden></p>` : ""}</div>
            <div class="field"><span class="lb" id="cSlotLabel">Choose a time</span><div class="pills c-slot-list" id="cSlot" role="group" aria-labelledby="cSlotLabel"></div><div class="err" id="cErr" role="alert"></div><p class="hint">Availability is checked again when you submit. Your selected time is not guaranteed until your booking is confirmed.</p><p class="hint c-demo-note">Demo limitation: time slots cannot be locked across separate browsers.</p></div>
            ${co ? `<div class="field"><label for="cWho">Booked for</label><select id="cWho">${co.team.map((m) => `<option>${esc(m.name)}</option>`).join("")}</select></div>` : ""}
            <div class="field"><label for="cNote">What would you like to discuss?</label><textarea id="cNote" rows="3" maxlength="400">${esc(problem || ta.value.trim())}</textarea><div class="err" id="cNote-e" role="alert"></div></div>
            <div class="row"><span class="muted">Base session price</span><b>${NX.jod(quote.baseFee)}</b></div>
            <div class="row"><span class="muted">Expert commission (${quote.rate}%)</span><b>${NX.jod(quote.commission)}</b></div>
            <div class="row"><span>Total · payment after approval</span><b>${NX.jod(quote.fee)}</b></div>
            <p class="hint">The ${quote.rate}% expert commission is added to the base session price. No payment is taken now. If approved, the saved total is paid from My Bookings.</p>
            <button class="btn btn-primary btn-lg btn-block" type="submit"${co && co.status !== "approved" ? " disabled" : ""}>Request session</button>
          </form>`);
        const dlg = NX.dlg.el();
        let requestSucceeded = false;
        const htmlStyle = document.documentElement.style;
        const bodyStyle = document.body.style;
        const previousHtmlOverflow = htmlStyle.overflow;
        const previousBodyOverflow = bodyStyle.overflow;
        const previousBodyPaddingRight = bodyStyle.paddingRight;
        const scrollY = window.scrollY;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const bodyPaddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
        const closeOnEscape = (event) => {
          if (event.key === "Escape" && dlg.open) {
            event.preventDefault();
            NX.dlg.close();
          }
        };
        htmlStyle.overflow = "hidden";
        bodyStyle.overflow = "hidden";
        if (scrollbarWidth > 0) bodyStyle.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
        dlg.classList.add("consult-dialog");
        document.addEventListener("keydown", closeOnEscape);
        dlg.addEventListener(
          "close",
          () => {
            document.removeEventListener("keydown", closeOnEscape);
            dlg.classList.remove("consult-dialog");
            htmlStyle.overflow = previousHtmlOverflow;
            bodyStyle.overflow = previousBodyOverflow;
            bodyStyle.paddingRight = previousBodyPaddingRight;
            window.scrollTo(0, scrollY);
            if (!requestSucceeded && trigger && trigger.isConnected) trigger.focus();
          },
          { once: true },
        );
        const f = NX.$("#cForm");
        const slotBox = NX.$("#cSlot", f);
        const location = NX.$("#cLocation", f);
        const renderSlots = (available) => {
          if (c.slot && !available.some((s) => s.date === c.slot.date && s.time === c.slot.time))
            c.slot = null;
          slotBox.innerHTML = available.length
            ? available
                .slice(0, 12)
                .map(
                  (s) =>
                    `<button type="button" class="pill" data-date="${s.date}" data-time="${s.time}" aria-pressed="${!!c.slot && c.slot.date === s.date && c.slot.time === s.time}">${esc(s.label)}</button>`,
                )
                .join("")
            : '<p class="note">No open times this week. Check back soon.</p>';
        };
        renderSlots(slots);
        f.addEventListener("click", async (ev) => {
          const m = ev.target.closest("[data-mode]"),
            s = ev.target.closest("[data-date]");
          const press = (box, bb) =>
            NX.$$("button", box).forEach((x) => x.setAttribute("aria-pressed", x === bb));
          if (m) {
            c.mode = m.dataset.mode;
            press(NX.$("#cMode"), m);
            NX.$("#cModeErr").textContent = "";
            if (location) {
              const hasLocation = c.mode === "space" || c.mode === "inperson";
              location.hidden = !hasLocation;
              location.textContent = hasLocation ? "Location · " + sname(e.spaceId) : "";
            }
            try {
              renderSlots(await NX.Api.expertSlots(e.id));
            } catch (error) {
              NX.toast(error.message || "Available times could not be refreshed.", true);
            }
          }
          if (s) {
            c.slot = { date: s.dataset.date, time: s.dataset.time };
            press(NX.$("#cSlot"), s);
            NX.$("#cErr").textContent = "";
          }
        });
        f.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const note = NX.$("#cNote");
          const okS = !!c.slot;
          NX.$("#cErr").textContent = okS ? "" : "Choose a time for the session.";
          const okM = !!c.mode;
          NX.$("#cModeErr").textContent = okM ? "" : "Choose a session type.";
          const okN = NX.fieldErr(
            note,
            note.value.trim().length < 5 ? "Describe what you need help with." : "",
          );
          if (!okS || !okM || !okN || submitting) return;
          submitting = true;
          const submit = ev.submitter || NX.$('button[type="submit"]', f);
          const original = submit.textContent;
          submit.disabled = true;
          submit.textContent = "Sending…";
          try {
            const rec = await NX.Api.bookConsult({
              expertId: e.id,
              mode: c.mode,
              date: c.slot.date,
              time: c.slot.time,
              topic: note.value,
              bookedBy: NX.$("#cWho") ? NX.$("#cWho").value : undefined,
              spaceId: e.spaceId,
            });
            requestSucceeded = true;
            NX.dlg.close();
            const notice = $("#bookingNotice");
            notice.innerHTML = `<b>Request submitted successfully</b><span>Your consultation request has been sent to the expert. You’ll be notified when the expert responds. No payment has been made yet.</span>`;
            notice.hidden = false;
            requestAnimationFrame(() => {
              notice.focus({ preventScroll: true });
              notice.scrollIntoView({
                behavior: NX.reduced ? "auto" : "smooth",
                block: "center",
              });
            });
            renderConsults().catch((error) =>
              NX.toast(error.message || "Your upcoming sessions could not be refreshed.", true),
            );
            if (opts.onBooked) opts.onBooked(rec);
          } catch (error) {
            if (/time slot|no longer available/i.test(error.message || "")) {
              c.slot = null;
              NX.$("#cErr").textContent = "That time is no longer available. Please select another time.";
              try {
                renderSlots(await NX.Api.expertSlots(e.id));
              } catch (refreshError) {
                NX.toast(refreshError.message || "Available times could not be refreshed.", true);
              }
            } else {
              NX.toast(error.message || "Your request could not be submitted. Please try again.", true);
            }
          } finally {
            submitting = false;
            if (submit.isConnected) {
              submit.disabled = false;
              submit.textContent = original;
            }
          }
        });
      }

      await renderConsults();
      const q = NX.qs("q");
      if (q) {
        ta.value = q;
        run();
      }
      const pre = NX.qs("expert");
      if (pre && canBook) {
        const e = experts.find((x) => x.id === pre);
        if (e) openBooking(e);
      }
    },
  };
})();

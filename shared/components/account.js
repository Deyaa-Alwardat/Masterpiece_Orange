/* NEXUS — shared components: profile form, account settings (notifications, password, support, close account)
   and the feedback modal. Used by every portal. */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;

  /* ---------- profile form ---------- */
  NX.Profile = {
    async mount(root, o) {
      o = o || {};
      const u = await NX.Api.me();
      root.innerHTML = `
        <div class="panel card">
          <div class="profile-top">${NX.avatar(u.name, 72)}<div><h2>${esc(u.name)}</h2><span class="hint">${esc(u.email)} · ${esc(NX.ROLES[u.role].label)} · Member since ${NX.dshort(u.created)}</span></div></div>
          <form id="pfForm" novalidate class="form-grid mt">
            ${NX.field("pfName", o.nameLabel || "Full name", `<input id="pfName" value="${esc(u.name)}" autocomplete="name" maxlength="60">`)}
            ${NX.field("pfEmail", "Email (sign-in)", `<input id="pfEmail" value="${esc(u.email)}" disabled>`)}
            ${NX.field("pfPhone", "Phone", `<input id="pfPhone" value="${esc(u.phone || "")}" autocomplete="tel" placeholder="+962 7X XXX XXXX">`)}
            ${NX.field("pfCity", "City", `<select id="pfCity">${["Amman", "Irbid", "Aqaba", "Zarqa", "Madaba", "Salt", "Other"].map((c) => `<option${c === u.city ? " selected" : ""}>${c}</option>`).join("")}</select>`)}
            ${NX.field("pfBio", o.bioLabel || "About you", `<textarea id="pfBio" rows="4" maxlength="300" placeholder="${esc(o.bioHint || "A short introduction…")}">${esc(u.bio || "")}</textarea><span class="hint" id="pfCount"></span>`, "full")}
            <div class="form-foot full"><button class="btn btn-primary" type="submit">Save profile</button></div>
          </form>
        </div>`;
      const bio = NX.$("#pfBio", root),
        cnt = NX.$("#pfCount", root);
      const upd = () => (cnt.textContent = bio.value.length + " / 300");
      bio.addEventListener("input", upd);
      upd();
      NX.$("#pfForm", root).addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = NX.$("#pfName", root),
          ph = NX.$("#pfPhone", root);
        const a = NX.fieldErr(name, name.value.trim().length < 2 ? "Enter your full name." : "");
        const b = NX.fieldErr(
          ph,
          ph.value && !/^[+\d\s()-]{7,20}$/.test(ph.value) ? "Enter a valid phone number." : "",
        );
        if (!a || !b) return;
        await NX.run(e.submitter, async () => {
          await NX.Api.updateProfile({
            name: name.value,
            phone: ph.value,
            city: NX.$("#pfCity", root).value,
            bio: bio.value,
          });
          NX.toast("Profile saved.");
          const h = NX.$(".profile-top h2", root);
          if (h) h.textContent = name.value.trim();
        });
      });
      return u;
    },
  };

  /* ---------- account settings ---------- */
  NX.Settings = {
    async mount(root, o) {
      o = o || {};
      const hidePassword = !!o.hidePassword;
      const u = await NX.Api.me();
      const p = await NX.Api.prefs();
      const sw = (id, title, desc, on) =>
        `<label class="opt" for="${id}"><span><b>${title}</b><span class="d">${desc}</span></span><span class="switch"><input type="checkbox" id="${id}"${on ? " checked" : ""}><i></i></span></label>`;
      root.innerHTML = `
        <div class="g2">
          <div class="stack">
            <div class="panel card"><div class="panel-h"><h2>Notifications</h2></div>
              <div id="prefs">
                ${sw("pEmail", "Email notifications", "Booking confirmations, receipts and messages", p.emailNotif)}
                ${sw("pBook", "Booking & session alerts", "Reminders before your booking or session", p.bookingAlerts)}
                ${sw("pPush", "Browser notifications", "Demo preference — not connected to a push service", p.pushNotif)}
                ${sw("pMkt", "Product news", "Occasional tips and new features", p.marketing)}
              </div></div>
${hidePassword ? "" : `            <div class="panel card"><div class="panel-h"><h2>Change password</h2></div>
              <form id="pwForm" novalidate class="stack">
                ${NX.field("pwOld", "Current password", '<input id="pwOld" type="password" autocomplete="current-password">')}
                ${NX.field("pwNew", "New password", '<input id="pwNew" type="password" autocomplete="new-password" placeholder="8+ characters, letters and numbers">')}
                ${NX.field("pwNew2", "Repeat new password", '<input id="pwNew2" type="password" autocomplete="new-password">')}
                <div class="form-foot"><button class="btn btn-primary" type="submit">Update password</button></div>
                <p class="hint">Screens only: passwords are not stored or checked. A real backend must hash with bcrypt/argon2.</p>
              </form></div>`}
            ${
              u.role === "admin"
                ? ""
                : `<div class="panel card"><div class="panel-h"><h2>Close account</h2></div>
              <p class="muted">Closing your account signs you out and blocks sign-in. This demo does not delete stored records.</p>
              <div class="form-foot"><button class="btn btn-danger" id="closeAcc" type="button">Close my account</button></div></div>`
            }
          </div>
          <div class="stack">
            <div class="panel card"><div class="panel-h"><h2>Contact support</h2><span class="sub">We reply within one business day</span></div>
              <form id="spForm" novalidate class="stack">
                ${NX.field("spCat", "Topic", `<select id="spCat">${["General", "Billing", "Bookings", "Listings", "Account", "Bug report"].map((c) => `<option>${c}</option>`).join("")}</select>`)}
                ${NX.field("spSub", "Subject", '<input id="spSub" maxlength="80" placeholder="Short summary">')}
                ${NX.field("spMsg", "How can we help?", '<textarea id="spMsg" rows="4" maxlength="800" placeholder="Describe the problem…"></textarea>')}
                <div class="form-foot"><button class="btn btn-primary" type="submit">Send to support</button></div>
              </form></div>
            <div class="panel card"><div class="panel-h"><h2>Your requests</h2></div><div id="spList">${NX.skeleton(1)}</div></div>
            <div class="panel card"><div class="panel-h"><h2>Quick help</h2></div>
              <details class="faq"><summary>How do refunds work?</summary><p>Cancel at least the cancellation window before your booking (see Platform rules) for a full refund to the original payment method. Owners cancelling a booking always refund in full.</p></details>
              <details class="faq"><summary>Are payments real in this demo?</summary><p>No. Wallet funds and cards are simulated. No money is charged and card numbers are never stored.</p></details>
              <details class="faq"><summary>Where is my data stored?</summary><p>Nowhere. This is a screens-only demo: sample data is built in memory and resets when you refresh.</p></details>
            </div>
          </div>
        </div>`;

      const savePrefs = async () => {
        await NX.Api.savePrefs({
          emailNotif: NX.$("#pEmail").checked,
          bookingAlerts: NX.$("#pBook").checked,
          pushNotif: NX.$("#pPush").checked,
          marketing: NX.$("#pMkt").checked,
          timezone: p.timezone,
        });
        NX.toast("Preferences saved.");
      };
      NX.$$("#prefs input", root).forEach((i) => i.addEventListener("change", savePrefs));

      const passwordForm = NX.$("#pwForm", root);
      if (passwordForm) passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const o = NX.$("#pwOld"),
          n = NX.$("#pwNew"),
          n2 = NX.$("#pwNew2");
        const a = NX.fieldErr(o, o.value ? "" : "Enter your current password.");
        const b = NX.fieldErr(
          n,
          n.value.length >= 8 && /\d/.test(n.value) && /[A-Za-z]/.test(n.value)
            ? ""
            : "Use 8+ characters with letters and numbers.",
        );
        const c = NX.fieldErr(n2, n2.value === n.value ? "" : "Passwords do not match.");
        if (!a || !b || !c) return;
        await NX.run(e.submitter, async () => {
          try {
            await NX.Api.changePassword(o.value, n.value);
            e.target.reset();
            NX.toast("Password updated.");
          } catch (er) {
            NX.fieldErr(o, er.message);
          }
        });
      });

      async function drawSupport() {
        const list = await NX.Api.supportList();
        NX.$("#spList", root).innerHTML = list.length
          ? list
              .map(
                (s) =>
                  `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t" style="white-space:normal">${esc(s.subject)}</div><div class="s">${esc(s.category)} · ${NX.dshort(s.at)}</div>${s.reply ? `<div class="banner ok" style="margin:.6rem 0 0">${NX.ic("mail")}<span><b>Support:</b> ${esc(s.reply)}</span></div>` : ""}</div>${NX.status(s.status)}</div>`,
              )
              .join("")
          : '<p class="hint">You have not contacted support yet.</p>';
      }
      NX.$("#spForm", root).addEventListener("submit", async (e) => {
        e.preventDefault();
        const s = NX.$("#spSub"),
          m = NX.$("#spMsg");
        const a = NX.fieldErr(s, s.value.trim().length < 4 ? "Add a short subject." : "");
        const b = NX.fieldErr(
          m,
          m.value.trim().length < 10 ? "Describe the problem in at least 10 characters." : "",
        );
        if (!a || !b) return;
        await NX.run(e.submitter, async () => {
          await NX.Api.addSupport({
            category: NX.$("#spCat").value,
            subject: s.value,
            message: m.value,
          });
          e.target.reset();
          NX.toast("Request sent to support.");
          await drawSupport();
        });
      });
      const close = NX.$("#closeAcc", root);
      if (close)
        close.addEventListener("click", async () => {
          if (
            !(await NX.confirm(
              "Close your account?",
              "You will be signed out and will not be able to sign in again.",
              "Close account",
              true,
            ))
          )
            return;
          await NX.run(close, async () => {
            await NX.Api.closeAccount();
            location.href = NX.home();
          });
        });
      drawSupport();
    },
  };

  /* ---------- feedback modal ---------- */
  const TAGS = {
    space: ["Quiet", "Great Wi‑Fi", "Comfortable", "Friendly staff", "Good value", "Easy to find"],
    expert: ["Clear explanations", "On time", "Practical", "Well prepared", "Friendly"],
    platform: ["Easy to use", "Fast", "Good support", "Needs improvement"],
  };
  NX.Feedback = {
    /** o: {kind: space|expert|platform, refId, targetId, title, bookedBy} · done(): called after a successful submit */
    open(o, done) {
      const tags = TAGS[o.kind] || TAGS.platform;
      let rating = 0;
      NX.dlg
        .open(`${NX.dlg.head("Leave feedback", o.title ? "About " + esc(o.title) : "Tell us how it went")}
        <form class="dlg-b" id="fbForm" novalidate>
          <div class="field"><span class="lb" id="fbRL">Your rating</span>
            <div class="rate-pick" role="radiogroup" aria-labelledby="fbRL">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="rp" role="radio" aria-checked="false" aria-label="${i} star${i > 1 ? "s" : ""}" data-r="${i}">★</button>`).join("")}</div>
            <div class="err" id="fbRate-e" role="alert"></div></div>
          <div class="field" style="margin-top:1rem"><span class="lb">What stood out? <span class="hint">(optional)</span></span>
            <div class="chips">${tags.map((t) => `<label class="chip"><input type="checkbox" value="${esc(t)}">${esc(t)}</label>`).join("")}</div></div>
          ${NX.field("fbText", "Your feedback", '<textarea id="fbText" rows="4" maxlength="800" placeholder="Share a few details that would help others…"></textarea><span class="hint" id="fbCount">0 / 800</span>', "")}
          <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Submit feedback</button></div>
        </form>`);
      const f = NX.$("#fbForm");
      const paint = (hover) =>
        NX.$$(".rp", f).forEach((b) => {
          const on = +b.dataset.r <= (hover || rating);
          b.classList.toggle("on", on);
          b.setAttribute("aria-checked", +b.dataset.r === rating);
        });
      NX.$$(".rp", f).forEach((b) => {
        b.addEventListener("click", () => {
          rating = +b.dataset.r;
          NX.$("#fbRate-e").textContent = "";
          paint();
        });
        b.addEventListener("mouseenter", () => paint(+b.dataset.r));
        b.addEventListener("mouseleave", () => paint());
      });
      const t = NX.$("#fbText");
      t.addEventListener("input", () => (NX.$("#fbCount").textContent = t.value.length + " / 800"));
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const okR = rating >= 1;
        NX.$("#fbRate-e").textContent = okR ? "" : "Choose a star rating.";
        const okT = NX.fieldErr(
          t,
          t.value.trim().length < 10 ? "Please write at least 10 characters." : "",
        );
        if (!okR || !okT) return;
        await NX.run(e.submitter, async () => {
          await NX.Api.addFeedback({
            kind: o.kind,
            refId: o.refId,
            targetId: o.targetId,
            bookedBy: o.bookedBy,
            rating,
            text: t.value,
            tags: NX.$$("input:checked", f).map((i) => i.value),
          });
          NX.dlg.close();
          NX.toast("Thank you — feedback submitted.");
          if (done) done();
        });
      });
    },
  };
})();

/* NEXUS — login.js: animated sign in / create account.
   One script serves all five sign-in pages; <body data-role="user|expert|owner|company|admin"> decides
   the copy, the registration fields and which accounts may sign in (DEMO auth — see shared/js/auth.js). */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX,
    $ = NX.$,
    $$ = NX.$$;
  const ROLE_IDS = ["user", "expert", "owner", "company", "admin"];
  let ROLE = ROLE_IDS.includes(NX.qs("role")) ? NX.qs("role") : "user";
  const root = $("#authRoot"),
    tabs = $(".tabs"),
    card = $("#authCard");

  const COPIES = {
    user: {
      eyebrow: "Member sign in",
      words: ["workspaces.", "services.", "experts."],
      lead: "One account for",
      text: "Book a specific desk, request help from your seat and get matched with a local expert — all from one place.",
      perks: [
        "Choose your exact desk from a live floor plan",
        "Request services without leaving your seat",
        "AI-assisted expert matching, you stay in control",
      ],
      nouns: "member",
    },
    expert: {
      eyebrow: "Expert portal",
      words: ["clients.", "sessions.", "income."],
      lead: "Grow your practice with",
      text: "Offer paid consultations online, in person or inside a workspace — you set the hours and the rate.",
      perks: [
        "Receive session requests matched to your specialty",
        "Manage availability in a calendar",
        "Request payouts of your earnings",
      ],
      nouns: "expert",
    },
    owner: {
      eyebrow: "Space owner portal",
      words: ["desks.", "bookings.", "revenue."],
      lead: "Manage your",
      text: "List your workspace, control availability and watch reservations and payouts in one dashboard.",
      perks: [
        "List spaces and block or release desks",
        "Confirm reservations and answer guests",
        "Track earnings and request payouts",
      ],
      nouns: "space owner",
    },
    company: {
      eyebrow: "Company portal",
      words: ["teams.", "desks.", "budgets."],
      lead: "Book and report for your",
      text: "Reserve desks and expert sessions for your whole team, pay from one wallet and keep spend under control.",
      perks: [
        "Book desks for any teammate",
        "Company wallet, invoices and monthly reports",
        "Rate every booking in one place",
      ],
      nouns: "company",
    },
    admin: {
      eyebrow: "Admin console",
      words: ["approvals.", "payouts.", "platform."],
      lead: "Run the",
      text: "Review listings, manage accounts, process payouts and tune platform rules. Authorised administrators only.",
      perks: [
        "Approve spaces, experts and companies",
        "Process payout requests",
        "Platform-wide settings",
      ],
      nouns: "admin",
    },
  };
  let COPY = COPIES[ROLE];
  let CAN_REGISTER = ROLE !== "admin";
  let mode = CAN_REGISTER && NX.qs("mode") !== "login" && !NX.qs("next") ? "register" : "login";
  if (NX.qs("mode") === "register" && CAN_REGISTER) mode = "register";

  /* role switcher (one sign-in page for every account type) */
  const PICK = ["user", "expert", "owner", "company"];
  const picker = document.createElement("div");
  picker.className = "role-pick";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "Account type");
  tabs.before(picker);
  const paintPicker = () => {
    picker.innerHTML =
      PICK.map(
        (r) =>
          `<button type="button" data-r="${r}" aria-pressed="${r === ROLE}">${NX.ROLES[r].label}</button>`,
      ).join("") +
      (ROLE === "admin"
        ? '<button type="button" data-r="user" aria-pressed="false">Back to members</button>'
        : "");
  };

  /* stage copy + tabs follow the chosen role */
  function applyRole() {
    COPY = COPIES[ROLE];
    CAN_REGISTER = ROLE !== "admin";
    document.body.dataset.role = ROLE;
    document.body.dataset.portal = ROLE;
    if (!CAN_REGISTER) mode = "login";
    $(".eyebrow", $("#stage")).lastChild.textContent = COPY.eyebrow;
    $("#stage h1").innerHTML =
      `${COPY.lead}<br><span class="rotor" aria-live="off">${COPY.words.map((w) => `<b>${w}</b>`).join("")}</span>`;
    $("#stage .stage-copy > p").textContent = COPY.text;
    $("#stage .perks").innerHTML = COPY.perks
      .map((p) => `<li><span>${NX.ic("check")}</span>${NX.esc(p)}</li>`)
      .join("");
    const reg = $("[data-mode=register]", tabs);
    if (reg) reg.hidden = !CAN_REGISTER;
    tabs.classList.toggle("single", !CAN_REGISTER);
    paintPicker();
    $("#portalLinks").innerHTML = portalLinks();
    document.title = COPY.eyebrow + " | NEXUS";
  }
  picker.addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b || b.dataset.r === ROLE) return;
    ROLE = b.dataset.r;
    applyRole();
    history.replaceState(
      null,
      "",
      NX.page("login", { role: ROLE, ...(NX.qs("next") ? { next: NX.qs("next") } : {}) }),
    );
    render(true);
  });

  const field = (id, type, label, extra = "") =>
    `<div class="fl ${type === "password" ? "has-eye" : ""}"><input id="${id}" type="${type}" placeholder=" " autocomplete="${extra}" required><label for="${id}">${label}</label>${type === "password" ? `<button type="button" class="eye" aria-label="Show password"><svg class="i"><use href="#i-eye"/></svg></button>` : ""}<div class="err" role="alert"></div></div>`;
  const select = (id, label, opts) =>
    `<div class="fl"><select id="${id}" class="sel" aria-label="${label}">${opts.map((o) => `<option>${o}</option>`).join("")}</select></div>`;
  const submit = (txt) =>
    `<button class="btn btn-primary btn-lg go" type="submit" style="width:100%"><span class="lbl">${txt}</span><span class="spin"></span><span class="okc"><svg class="i"><use href="#i-check"/></svg></span></button>`;

  const portalLinks = () =>
    ROLE === "admin"
      ? ""
      : `<p class="other-portals">Platform staff? <a class="link" href="${NX.page("login", { role: "admin" })}">Admin sign in</a></p>`;

  const demoBox = () =>
    `<div class="demo-box"><div><b>Demo ${COPY.nouns} account</b><small>${NX.DEMO_ACCOUNTS[ROLE]} · Click fill-in to load demo</small></div><button class="btn btn-ghost btn-sm" type="button" id="useDemo">Fill in</button></div>`;

  function view() {
    if (mode === "login")
      return `<form class="form-stack" novalidate>
      <div><h2 class="form-title">Welcome back</h2><p class="form-sub">Sign in to the ${COPY.nouns} portal.</p></div>
      ${demoBox()}
      ${field("fEmail", "email", "Email", "email")}${field("fPass", "password", "Password", "current-password")}
      <div class="err banner" id="fErr" role="alert" hidden></div>${submit("Sign in")}</form>`;
    const extra =
      ROLE === "expert"
        ? field(
            "fTitle",
            "text",
            "Professional headline (e.g. UX consultant)",
            "organization-title",
          )
        : ROLE === "company"
          ? field("fCompany", "text", "Company name", "organization") +
            select("fIndustry", "Industry", [
              "Software",
              "Consulting",
              "Marketing",
              "Finance",
              "Education",
              "Retail",
              "Other",
            ])
          : "";
    return `<form class="form-stack" novalidate>
      <div><h2 class="form-title">Create your ${COPY.nouns} account</h2><p class="form-sub">${ROLE === "expert" || ROLE === "company" ? "New " + COPY.nouns + " accounts are reviewed by an admin before they go live." : "It takes less than a minute."}</p></div>
      ${field("fName", "text", ROLE === "company" ? "Your full name" : "Full name", "name")}${extra}${field("fEmail", "email", "Email", "email")}${field("fPass", "password", "Password (8+ characters, letters and numbers)", "new-password")}
      <div class="meter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></div>
      <div class="err banner" id="fErr" role="alert" hidden></div>${submit("Create account")}</form>`;
  }

  function render(animate) {
    const paint = () => {
      tabs.dataset.mode = mode;
      $$("[role=tab]", tabs).forEach((t) =>
        t.setAttribute("aria-selected", t.dataset.mode === mode),
      );
      root.innerHTML = view();
      root.classList.remove("out");
      root.classList.add("in");
      bind();
    };
    if (animate && !NX.reduced) {
      root.classList.add("out");
      setTimeout(paint, 180);
    } else paint();
  }

  function signedInBox() {
    const u = NX.Auth.user();
    if (!u) return false;
    const same = u.role === ROLE;
    root.innerHTML = `<div class="form-stack"><div><h2 class="form-title">You are signed in</h2><p class="form-sub">${NX.esc(u.name)} · ${NX.esc(NX.ROLES[u.role].label)} account</p></div>
      <a class="btn btn-primary btn-lg" style="width:100%" href="${NX.page(NX.ROLES[u.role].home)}">${u.role === "user" ? "Go to my bookings" : "Go to my dashboard"}</a>
      <button class="btn btn-ghost" type="button" id="signOutHere" style="width:100%">Sign out${same ? "" : " to use a different account"}</button></div>`;
    $("#signOutHere").addEventListener("click", () => {
      NX.Auth.logout();
      location.reload();
    });
    return true;
  }

  function bind() {
    const form = $("form", root);
    const demo = $("#useDemo", root);
    if (demo)
      demo.addEventListener("click", () => {
        $("#fEmail").value = NX.DEMO_ACCOUNTS[ROLE];
        $("#fPass").value = NX.DEMO_PASSWORD;
        $$(".fl", root).forEach((f) => f.classList.remove("bad"));
        $("#fPass").focus();
      });
    $$(".eye", root).forEach((b) =>
      b.addEventListener("click", () => {
        const inp = $("#fPass");
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        b.setAttribute("aria-label", show ? "Hide password" : "Show password");
        b.firstElementChild.firstElementChild.setAttribute("href", show ? "#i-lock" : "#i-eye");
      }),
    );
    const meter = $(".meter", root);
    if (meter)
      $("#fPass").addEventListener("input", (e) => {
        const v = e.target.value;
        let s = 0;
        if (v.length >= 8) s++;
        if (v.length >= 11) s++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
        if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
        if (!v) s = 0;
        meter.dataset.s = s;
        $("span", meter).textContent = ["", "Weak", "Fair", "Good", "Strong"][s];
      });
    $$("input", root).forEach((i) =>
      i.addEventListener("input", () => {
        i.closest(".fl").classList.remove("bad");
        $(".err", i.closest(".fl")).textContent = "";
        $("#fErr").hidden = true;
      }),
    );
    form.addEventListener("submit", onSubmit);
  }

  const bad = (id, msg) => {
    const f = $("#" + id).closest(".fl");
    f.classList.add("bad");
    $(".err", f).textContent = msg;
  };
  const shake = () => {
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  };

  async function onSubmit(e) {
    e.preventDefault();
    const email = $("#fEmail").value.trim(),
      pass = $("#fPass").value,
      name = mode === "register" ? $("#fName").value.trim() : "";
    let ok = true;
    if (mode === "register" && name.length < 2) {
      bad("fName", "Please enter your name.");
      ok = false;
    }
    if (mode === "register" && ROLE === "company" && $("#fCompany").value.trim().length < 2) {
      bad("fCompany", "Enter your company name.");
      ok = false;
    }
    if (mode === "register" && ROLE === "expert" && $("#fTitle").value.trim().length < 4) {
      bad("fTitle", "Add a short professional headline.");
      ok = false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      bad("fEmail", "Enter a valid email address.");
      ok = false;
    }
    if (
      mode === "register" ? !(pass.length >= 8 && /\d/.test(pass) && /[A-Za-z]/.test(pass)) : !pass
    ) {
      bad(
        "fPass",
        mode === "register"
          ? "Use 8+ characters with letters and numbers."
          : "Enter your password.",
      );
      ok = false;
    }
    if (!ok) {
      shake();
      return;
    }
    const btn = $(".go", root);
    btn.classList.add("loading");
    btn.disabled = true;
    try {
      await NX.sleep(NX.reduced ? 0 : 600);
      const u =
        mode === "register"
          ? NX.Auth.register({
              name,
              email,
              password: pass,
              role: ROLE,
              title: ROLE === "expert" ? $("#fTitle").value.trim() : undefined,
              company: ROLE === "company" ? $("#fCompany").value.trim() : undefined,
              industry: ROLE === "company" ? $("#fIndustry").value : undefined,
            })
          : NX.Auth.login(email, pass, ROLE);
      btn.classList.remove("loading");
      btn.classList.add("success");
      const r = btn.getBoundingClientRect();
      await NX.sleep(NX.reduced ? 100 : 600);
      if (!NX.reduced) {
        const w = document.createElement("div");
        w.className = "wipe";
        w.style.setProperty("--wx", r.left + r.width / 2 + "px");
        w.style.setProperty("--wy", r.top + r.height / 2 + "px");
        w.innerHTML = `<span>Welcome${u.name ? ", " + NX.esc(u.name.split(" ")[0]) : ""}!</span>`;
        document.body.append(w);
        await NX.sleep(950);
      }
      location.href = NX.Auth.landing(u.role);
    } catch (err) {
      btn.classList.remove("loading");
      btn.disabled = false;
      const b = $("#fErr");
      b.textContent = err.message || "Something went wrong.";
      b.hidden = false;
      shake();
    }
  }

  tabs.addEventListener("click", (e) => {
    const t = e.target.closest("[role=tab]");
    if (!t || t.dataset.mode === mode) return;
    mode = t.dataset.mode;
    render(true);
  });

  /* tilt + glow following the pointer */
  const wrap = $(".panel-wrap");
  if (!NX.reduced) {
    wrap.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(),
        x = (e.clientX - r.left) / r.width,
        y = (e.clientY - r.top) / r.height;
      card.style.transform = `rotateY(${(x - 0.5) * 5}deg) rotateX(${(0.5 - y) * 4}deg)`;
      card.style.setProperty("--gx", x * 100 + "%");
      card.style.setProperty("--gy", y * 100 + "%");
    });
    wrap.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  }

  applyRole();
  if (signedInBox()) card.classList.add("signed");
  else render(false);

  /* ---------- Orbit canvas ---------- */
  const cv = $("#orbit"),
    ctx = cv.getContext("2d"),
    stage = $("#stage");
  const NODES = [
    ["Space", "#29D6F0", 0],
    ["Services", "#34D6A0", 1.57],
    ["AI", "#FF5E9C", 3.14],
    ["Expert", "#9b83ff", 4.71],
  ];
  let W,
    H,
    dpr,
    mx = 0,
    my = 0,
    t0 = 0;
  const parts = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.6 + 0.4,
    s: Math.random() * 0.0004 + 0.0001,
  }));
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5;
    my = (e.clientY - r.top) / r.height - 0.5;
    $$(".aurora i", stage).forEach((a, i) => {
      a.style.transform = `translate(${mx * (i + 1) * 28}px,${my * (i + 1) * 28}px)`;
    });
  });
  let running = true;
  new IntersectionObserver((es) => {
    running = es[0].isIntersecting;
    if (running) requestAnimationFrame(frame);
  }).observe(stage);
  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= p.s * 16;
      if (p.y < 0) p.y = 1;
      ctx.fillStyle = "rgba(180,200,255,.35)";
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, 6.3);
      ctx.fill();
    }
    const cx = W * (W <= 520 ? 0.75 : 0.78) + mx * 24,
      cy = H * 0.19 + my * 24,
      R = Math.min(W, H) * (W <= 520 ? 0.17 : 0.14),
      a = NX.reduced ? 0 : t / 4200;
    [R * 0.55, R, R * 1.45].forEach((r, i) => {
      ctx.strokeStyle = "rgba(150,170,255," + (0.16 - i * 0.03) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.42, -0.3, 0, 6.3);
      ctx.stroke();
    });
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    g.addColorStop(0, "rgba(124,92,255,.9)");
    g.addColorStop(0.5, "rgba(41,214,240,.35)");
    g.addColorStop(1, "rgba(41,214,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.5 * (1 + Math.sin(a * 3) * 0.05), 0, 6.3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 " + Math.max(14, R * 0.17) + "px Unbounded, Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXUS", cx, cy);
    for (const [n, c, off] of NODES) {
      const ang = a + off,
        x = cx + Math.cos(ang) * R * 1.45 * 1,
        y = cy + Math.sin(ang) * R * 1.45 * 0.42,
        rot = -0.3;
      const rx = cx + (x - cx) * Math.cos(rot) - (y - cy) * Math.sin(rot),
        ry = cy + (x - cx) * Math.sin(rot) + (y - cy) * Math.cos(rot);
      ctx.strokeStyle = c + "55";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.shadowColor = c;
      ctx.shadowBlur = 18;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, 6.3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "600 12px Sora, sans-serif";
      ctx.fillText(n, rx, ry + 22);
    }
    if (!NX.reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});

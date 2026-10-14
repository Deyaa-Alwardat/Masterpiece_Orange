/* NEXUS — shared component: portal shell for every signed-in area.
   • user / expert / owner / company  → one horizontal navbar (.pnav) with role-specific links,
     a Messages shortcut, theme switch and an account menu (Profile · Settings · Log out).
   • admin                            → grouped, collapsible sidebar (.side) with an account block + Log out.
   Usage in a page:
     <body data-root="../" data-portal="user">
     <div id="nx-portal"></div>
     ...
     const pg = NX.Portal.init({ role: "user", page: "user-dashboard", title: "Dashboard", sub: "…", actions: "<a…>" });
   init() runs the role guard first and returns null (after redirecting) if access is denied.
   Sign-out uses the project's existing NX.Auth.logout() (screens-only: there is no stored session)
   and then sends the user to the sign-in page of their own role. */
(function () {
  "use strict";
  const NX = window.NX;
  const P = NX.page;

  /* ---------- link registry ----------
     [page, label, icon, badgeKey?]  — every entry points at an existing page. */
  const NAV = {
    user: [
      ["user-dashboard", "Dashboard", "grid"],
      ["user-bookings", "My Bookings", "calendar"],
      ["user-matchmaking", "AI Matchmaking", "spark"],
      ["user-messages", "Messages", "chat", "msg"],
      ["user-saved", "Saved", "heart"],
      ["user-wallet", "Wallet & invoices", "wallet"],
      ["user-profile", "Profile", "user"],
      ["user-settings", "Settings & support", "settings"],
    ],
    expert: [
      ["expert-dashboard", "Dashboard", "grid"],
      ["expert-calendar", "Calendar", "calendar"],
      ["expert-meetings", "Meetings", "video"],
      ["expert-messages", "Messages", "chat", "msg"],
      ["expert-wallet", "Wallet", "wallet"],
      ["expert-profile", "Profile", "user"],
      ["expert-settings", "Settings", "settings"],
    ],
    owner: [
      ["owner-dashboard", "Dashboard", "grid"],
      ["owner-inventory", "Space inventory", "building"],
      ["owner-bookings", "Bookings", "calendar"],
      ["owner-financials", "Financials & payouts", "wallet"],
      ["owner-messages", "Inbox", "chat", "msg"],
      ["owner-profile", "Profile", "user"],
      ["owner-settings", "Settings", "settings"],
    ],
    company: [
      ["company-dashboard", "Dashboard", "grid"],
      ["company-booking", "Book for the team", "plus"],
      ["company-bookings", "Bookings", "calendar"],
      ["company-reports", "Reports", "chart"],
      ["company-feedback", "Feedback", "star"],
      ["company-messages", "Messages", "chat", "msg"],
      ["company-settings", "Settings & profile", "settings"],
    ],
    admin: [
      ["admin-dashboard", "Dashboard", "grid"],
      ["admin-management", "Management", "users"],
      ["admin-approvals", "Approvals", "check-c", "appr"],
      ["admin-financials", "Financials & payouts", "wallet"],
      ["admin-settings", "Platform settings", "settings"],
    ],
  };

  /* Public pages reachable from a portal */
  const SITE = {
    user: [
      ["spaces", "Explore spaces", "search"],
      ["experts", "Find an expert", "briefcase"],
      ["services", "Desk services", "zap"],
    ],
    expert: [["experts", "Public experts page", "briefcase"]],
    owner: [["spaces", "Public spaces page", "search"]],
    company: [
      ["spaces", "Explore spaces", "search"],
      ["experts", "Find an expert", "briefcase"],
      ["services", "Desk services", "zap"],
    ],
    admin: [["spaces", "Public site", "search"]],
  };

  /* Navbar layout per role (what is shown directly in the bar) */
  const BAR = {
    user: {
      links: ["user-dashboard", "user-bookings", "user-matchmaking", "user-saved", "user-wallet"],
      explore: true,
      msg: "user-messages",
      account: [
        ["user-profile", "Profile", "user"],
        ["user-settings", "Settings & support", "settings"],
      ],
    },
    expert: {
      links: ["expert-dashboard", "expert-calendar", "expert-meetings", "expert-wallet"],
      msg: "expert-messages",
      account: [
        ["expert-profile", "Profile", "user"],
        ["expert-settings", "Settings", "settings"],
      ],
      site: true,
    },
    owner: {
      links: ["owner-dashboard", "owner-inventory", "owner-bookings", "owner-financials"],
      msg: "owner-messages",
      account: [
        ["owner-profile", "Profile", "user"],
        ["owner-settings", "Settings", "settings"],
      ],
      site: true,
    },
    company: {
      links: ["company-dashboard", "company-bookings", "company-reports", "company-feedback"],
      cta: "company-booking",
      explore: true,
      msg: "company-messages",
      /* company "Profile" lives on the settings page; tab=billing is the wallet tab */
      account: [
        ["company-settings", "Profile", "user"],
        ["company-settings", "Billing & wallet", "wallet", { tab: "billing" }],
      ],
    },
  };

  /* Admin sidebar groups (only pages that exist) */
  const ADMIN_GROUPS = [
    ["Overview", ["admin-dashboard"]],
    ["Operations", ["admin-management", "admin-approvals"]],
    ["Finance", ["admin-financials"]],
    ["Platform", ["admin-settings"]],
  ];

  /* Heading tile: an icon + a tone per kind of page, so each page reads differently without extra chrome */
  const TONE = {
    grid: "accent",
    calendar: "cyan",
    video: "cyan",
    spark: "violet",
    chat: "violet",
    building: "mint",
    search: "mint",
    plus: "mint",
    wallet: "amber",
    "check-c": "amber",
    users: "amber",
    chart: "blue",
    star: "amber",
    heart: "pink",
    user: "plain",
    settings: "plain",
  };

  const LOGO = NX.LOGO;

  const find = (role, page) => NAV[role].find((n) => n[0] === page);
  const cur = (on) => (on ? ' aria-current="page"' : "");

  /* Sign out: run the project's existing logout, then open the sign-in page of this role.
     replace() keeps the portal page out of the Back-button path. */
  function signOut(role) {
    try {
      NX.Auth.logout();
    } catch (e) {}
    try {
      NX.Store.set("flash", { msg: "You have been signed out." });
    } catch (e) {}
    location.replace(P("login", { role }));
  }

  const Portal = {
    nav: NAV,
    init(o) {
      const user = NX.Auth.guard(o.role);
      if (!user) return null;
      const role = user.role;
      const page = String(o.page).replace("{role}", role);
      const host = document.getElementById("nx-portal");
      document.body.dataset.portal = role;
      const roleName = NX.ROLES[role].label;
      const company = role === "company" ? (NX.DB.find("companies", user.companyId) || {}).name : "";
      const shownName = company || user.name;
      const isAdmin = role === "admin";
      const tab = NX.qs("tab");

      const here = find(role, page) || [];
      const tone = TONE[here[2]] || "plain";
      const headIcon = here[2] || "grid";
      const head = (cls) => `<div class="pg-head${cls || ""}">
        <div class="pg-title"><span class="pg-ic" data-tone="${tone}">${NX.ic(headIcon)}</span>
        <div><h1>${NX.esc(o.title)}</h1>${o.sub ? `<p>${NX.esc(o.sub)}</p>` : ""}</div></div>
        <div class="pg-actions" id="pgActions">${o.actions || ""}</div>
      </div>`;

      let chrome = "";
      if (!isAdmin) {
        const cfg = BAR[role];
        const link = (id) => {
          const n = find(role, id);
          return `<a class="pnav-link" href="${P(n[0])}"${cur(n[0] === page)}>${NX.ic(n[2])}<span>${n[1]}</span></a>`;
        };
        const site = SITE[role] || [];
        const explore =
          cfg.explore && site.length
            ? `<div class="pnav-dd" id="pnavExplore">
          <button class="pnav-link pnav-dd-btn" type="button" aria-haspopup="true" aria-expanded="false">${NX.ic("search")}<span>Explore</span>${NX.ic("chev-d", "chev")}</button>
          <div class="pnav-pop" role="menu">${site
            .map((n) => `<a role="menuitem" href="${P(n[0])}">${NX.ic(n[2])}<span>${n[1]}</span></a>`)
            .join("")}</div></div>`
            : "";
        const cta = cfg.cta
          ? (() => {
              const n = find(role, cfg.cta);
              return `<a class="btn btn-primary btn-sm pnav-cta" href="${P(n[0])}"${cur(n[0] === page)}>${NX.ic(n[2])}<span>${n[1]}</span></a>`;
            })()
          : "";
        const msgN = find(role, cfg.msg);
        const msg = `<a class="icon-btn pnav-msg" href="${P(msgN[0])}" aria-label="${msgN[1]}" title="${msgN[1]}"${cur(msgN[0] === page)}>${NX.ic("chat")}<b class="side-badge dot-badge" data-badge="msg" hidden></b></a>`;
        const acct = cfg.account
          .map((a) => {
            const on = a[0] === page && (a[3] ? a[3].tab === tab : !(role === "company" && tab === "billing"));
            return `<a role="menuitem" href="${P(a[0], a[3])}"${cur(on)}>${NX.ic(a[2])}<span>${a[1]}</span></a>`;
          })
          .join("");
        const siteInMenu = cfg.site
          ? site.map((n) => `<a role="menuitem" href="${P(n[0])}">${NX.ic(n[2])}<span>${n[1]}</span></a>`).join("")
          : "";
        chrome = `
<header class="pnav">
  <div class="pnav-in">
    <a class="pnav-brand" href="${NX.home()}" aria-label="NEXUS — public site">${LOGO}<span class="wordmark">NEXUS</span></a>
    <span class="pnav-role">${roleName}</span>
    <nav class="pnav-links" id="pnavLinks" aria-label="${roleName} navigation">
      ${cfg.links.map(link).join("")}${explore}${cta}
    </nav>
    <div class="pnav-actions">
      ${msg}
      <button class="theme-btn pnav-theme" id="themeBtn" type="button" aria-label="Switch theme" title="Switch theme"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>
      <div class="pnav-acct" id="pnavAcct">
        <button class="pnav-acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">${NX.avatar(shownName)}<span class="pnav-acct-name">${NX.esc(shownName.split(" ")[0])}</span>${NX.ic("chev-d", "chev")}</button>
        <div class="pnav-pop pnav-acct-pop" role="menu">
          <div class="pnav-who">${NX.avatar(shownName)}<div><b>${NX.esc(shownName)}</b><span>${NX.esc(user.email)}</span></div><em title="Demo environment: sample data, nothing is saved">Demo</em></div>
          ${acct}${siteInMenu ? `<hr>${siteInMenu}` : ""}
          <hr>
          <button class="pnav-out" id="signOut" type="button" role="menuitem">${NX.ic("logout")}<span>Log out</span></button>
        </div>
      </div>
      <button class="icon-btn pnav-burger" id="pnavBtn" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="pnavLinks">${NX.ic("menu")}</button>
    </div>
  </div>
</header>`;
      } else {
        const groups = ADMIN_GROUPS.map(
          ([title, ids]) => `<div class="side-group"><div class="side-group-t">${title}</div><nav class="side-nav">${ids
            .map((id) => {
              const n = find("admin", id);
              return `<a class="side-link" href="${P(n[0])}" data-tip="${n[1]}"${cur(n[0] === page)}>${NX.ic(n[2])}<span>${n[1]}</span>${n[3] ? `<b class="side-badge" data-badge="${n[3]}" hidden></b>` : ""}</a>`;
            })
            .join("")}</nav></div>`,
        ).join("");
        const site = SITE.admin.map(
          (n) => `<a class="side-link sub" href="${P(n[0])}" data-tip="${n[1]}">${NX.ic(n[2])}<span>${n[1]}</span></a>`,
        ).join("");
        chrome = `
<aside class="side" id="side" aria-label="Admin navigation">
  <div class="side-head">
    <a class="brand side-brand" href="${NX.home()}" aria-label="NEXUS — public site">${LOGO}<span class="wordmark">NEXUS</span></a>
    <button class="icon-btn side-collapse" id="sideCollapse" type="button" aria-label="Collapse sidebar" aria-pressed="false" title="Collapse sidebar">${NX.ic("arrow-l")}</button>
  </div>
  <div class="side-role"><span class="dot"></span><span>${roleName} portal</span></div>
  <div class="side-scroll">${groups}
    <div class="side-group"><div class="side-group-t">Browse</div><nav class="side-nav">${site}</nav></div>
  </div>
  <div class="side-user">
    <div class="side-acct">${NX.avatar(shownName)}<div class="su-t"><b>${NX.esc(shownName)}</b><span>${NX.esc(user.email)}</span></div></div>
    <button class="side-logout" id="signOut" type="button" data-tip="Log out">${NX.ic("logout")}<span>Log out</span></button>
  </div>
</aside>
<div class="side-scrim" id="sideScrim"></div>`;
      }

      const adminTop = isAdmin
        ? `<header class="topbar">
      <button class="icon-btn menu" id="sideBtn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="side">${NX.ic("menu")}</button>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${NX.home()}">NEXUS</a><span>/</span><a href="${P("admin-dashboard")}">${roleName}</a><span>/</span><b>${NX.esc(o.title)}</b></nav>
      <div class="top-actions">
        <span class="demo-chip" title="Demo environment: sample data, nothing is saved">Demo</span>
        <button class="theme-btn" id="themeBtn" type="button" aria-label="Switch theme"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>
      </div>
    </header>`
        : "";

      host.outerHTML = `
<a class="skip" href="#main">Skip to content</a>
<div class="portal ${isAdmin ? "portal-admin" : "portal-bar"}">
  ${chrome}
  <div class="portal-main">
    ${adminTop}
    <main id="main" class="pg-main">
      ${head()}
      <div id="pg">${NX.skeleton(3)}</div>
    </main>
  </div>
</div>
<dialog class="dlg" id="dlg" aria-labelledby="dlg-t"></dialog>
<div id="toasts" aria-live="polite"></div>`;

      NX.showFlash && NX.showFlash();

      /* ---------- behaviour ---------- */
      const $ = (s) => document.querySelector(s);
      const portal = $(".portal");

      /* Log out (navbar menu / admin sidebar) */
      document.querySelectorAll("#signOut").forEach((b) => b.addEventListener("click", () => signOut(role)));

      /* dropdowns: Explore + account */
      const dds = [$("#pnavExplore"), $("#pnavAcct")].filter(Boolean);
      const closeDD = (except) =>
        dds.forEach((d) => {
          if (d === except) return;
          d.classList.remove("open");
          const t = d.querySelector("button[aria-haspopup]");
          t && t.setAttribute("aria-expanded", "false");
        });
      dds.forEach((d) => {
        const t = d.querySelector("button[aria-haspopup]");
        t.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = !d.classList.contains("open");
          closeDD(d);
          d.classList.toggle("open", open);
          t.setAttribute("aria-expanded", String(open));
        });
      });
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".pnav-dd, .pnav-acct")) closeDD();
        if (!e.target.closest(".pnav")) setMenu(false);
      });

      /* mobile navbar panel */
      const links = $("#pnavLinks");
      const burger = $("#pnavBtn");
      function setMenu(open) {
        if (!links || !burger) return;
        links.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", String(open));
      }
      burger && burger.addEventListener("click", (e) => { e.stopPropagation(); closeDD(); setMenu(!links.classList.contains("open")); });

      /* admin sidebar: mobile drawer + collapse (preference kept in localStorage) */
      const side = $("#side");
      const sideBtn = $("#sideBtn");
      const sideScrim = $("#sideScrim");
      const setSide = (open) => {
        if (!side || !sideBtn || !sideScrim) return;
        side.classList.toggle("open", open);
        sideScrim.classList.toggle("on", open);
        sideBtn.setAttribute("aria-expanded", String(open));
      };
      sideBtn && sideBtn.addEventListener("click", () => setSide(!side.classList.contains("open")));
      sideScrim && sideScrim.addEventListener("click", () => setSide(false));
      const collapseBtn = $("#sideCollapse");
      const setCollapsed = (c, save) => {
        if (!portal || !collapseBtn) return;
        portal.classList.toggle("collapsed", c);
        collapseBtn.setAttribute("aria-pressed", String(c));
        const t = c ? "Expand sidebar" : "Collapse sidebar";
        collapseBtn.setAttribute("aria-label", t);
        collapseBtn.title = t;
        if (save) {
          try { localStorage.setItem("nx-admin-side", c ? "1" : "0"); } catch (e) {}
        }
      };
      if (collapseBtn) {
        let saved = false;
        try { saved = localStorage.getItem("nx-admin-side") === "1"; } catch (e) {}
        setCollapsed(saved, false);
        collapseBtn.addEventListener("click", () => setCollapsed(!portal.classList.contains("collapsed"), true));
      }

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        setSide(false);
        setMenu(false);
        closeDD();
      });

      /* count-up for dashboard figures: animates the leading number of each ".stat .v" once, then restores the exact original text */
      if (!NX.reduced && "IntersectionObserver" in window) {
        const seen = new WeakSet();
        const countUp = (el) => {
          const m = /^(\d[\d,]*)(\.\d+)?([^\d]*)$/.exec(el.textContent.trim());
          if (!m) return;
          const final = el.textContent;
          const dec = m[2] ? m[2].length - 1 : 0;
          const target = parseFloat(m[1].replace(/,/g, "") + (m[2] || ""));
          if (!(target > 0)) return;
          const t0 = performance.now();
          const step = (now) => {
            const k = Math.min(1, (now - t0) / 700);
            const v = target * (1 - Math.pow(1 - k, 3));
            el.textContent = k === 1 ? final : (m[1].includes(",") ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + m[3];
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        };
        const io = new IntersectionObserver((entries) => entries.forEach((e) => {
          if (e.isIntersecting) { io.unobserve(e.target); countUp(e.target); }
        }));
        new MutationObserver(() =>
          document.querySelectorAll("#pg .stat .v").forEach((el) => {
            if (!seen.has(el) && !el.children.length) { seen.add(el); io.observe(el); }
          }),
        ).observe(document.getElementById("pg"), { childList: true, subtree: true });
      }

      /* badges (unread messages / pending approvals) */
      const badge = (key, n) =>
        document.querySelectorAll(`[data-badge="${key}"]`).forEach((b) => {
          b.textContent = n > 9 ? "9+" : n;
          b.hidden = !n;
        });
      NX.Api.unread().then((n) => badge("msg", n));
      NX.Portal.refreshBadges = () => NX.Api.unread().then((n) => badge("msg", n));
      if (isAdmin) NX.Api.adminStats().then((s) => badge("appr", s.pendingApprovals));

      return document.getElementById("pg");
    },
  };
  NX.Portal = Portal;
})();

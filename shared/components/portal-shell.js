/* NEXUS — shared component: portal shell (sidebar + topbar) for every signed-in area.
   Usage in a page:
     <body data-root="../" data-portal="user">
     <div id="nx-portal"></div>
     ...
     const pg = NX.Portal.init({ role: "user", page: "user-dashboard", title: "Dashboard", sub: "…", actions: "<a…>" });
   init() runs the role guard first and returns null (after redirecting) if access is denied. */
(function () {
  "use strict";
  const NX = window.NX;
  const P = NX.page;

  const NAV = {
    user: [
      ["user-dashboard", "Dashboard", "grid"],
      ["user-bookings", "My Bookings", "calendar"],
      ["user-matchmaking", "AI Matchmaking", "spark"],
      ["user-messages", "Messages", "inbox", "msg"],
      ["user-saved", "Saved", "heart"],
      ["user-wallet", "Wallet & invoices", "wallet"],
      ["user-profile", "Profile", "user"],
      ["user-settings", "Settings & support", "settings"],
    ],
    expert: [
      ["expert-calendar", "Calendar", "calendar"],
      ["expert-meetings", "Meetings", "video"],
      ["expert-messages", "Messages", "inbox", "msg"],
      ["expert-wallet", "Wallet", "wallet"],
    ],
    owner: [
      ["owner-dashboard", "Dashboard", "grid"],
      ["owner-inventory", "Space inventory", "building"],
      ["owner-bookings", "Bookings", "calendar"],
      ["owner-financials", "Financials & payouts", "wallet"],
      ["owner-messages", "Inbox", "inbox", "msg"],
      ["owner-profile", "Profile", "user"],
      ["owner-settings", "Settings", "settings"],
    ],
    company: [
      ["company-dashboard", "Dashboard", "grid"],
      ["company-booking", "Book for the team", "plus"],
      ["company-bookings", "Bookings", "calendar"],
      ["company-reports", "Reports", "chart"],
      ["company-feedback", "Feedback", "star"],
      ["company-messages", "Messages", "inbox", "msg"],
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
  const LOGO =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38V10L38 38V10" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="38" r="6.6" fill="#7C5CFF"/><circle cx="10" cy="10" r="6.6" fill="#FFC24B"/><circle cx="38" cy="38" r="6.6" fill="#29D6F0"/><circle cx="38" cy="10" r="6.6" fill="#FF5E9C"/></svg>';

  const Portal = {
    nav: NAV,
    init(o) {
      const user = NX.Auth.guard(o.role);
      if (!user) return null;
      const role = user.role;
      const page = String(o.page).replace("{role}", role);
      const isUserDashboard = role === "user" && page === "user-dashboard";
      const host = document.getElementById("nx-portal");
      document.body.dataset.portal = role;
      const navItems = role === "user" ? [NAV.user[1], NAV.user[2], NAV.user[5], NAV.user[0]] : NAV[role];
      const renderNavItem = (n, withIcon = true) =>
        `<a class="side-link" href="${P(n[0])}"${n[0] === page ? ' aria-current="page"' : ""}>${role === "user" && !withIcon ? "" : NX.ic(n[2])}<span>${n[1]}</span>${n[3] ? `<b class="side-badge" data-badge="${n[3]}" hidden></b>` : ""}</a>`;
      const items = navItems.map((n) => renderNavItem(n, false)).join("");
      const sideItems = NAV[role].map((n) => renderNavItem(n, true)).join("");
      const site = (SITE[role] || [])
        .map((n) => `<a class="side-link sub" href="${P(n[0])}">${NX.ic(n[2])}<span>${n[1]}</span></a>`)
        .join("");
      const roleName = NX.ROLES[role].label;
      const company =
        role === "company" ? (NX.DB.find("companies", user.companyId) || {}).name : "";
      const shownName = company || user.name;
      const userPortalNav = role === "user" ? `
<header class="user-portal-nav">
  <a class="user-brand" href="${NX.home()}" aria-label="NEXUS home">${LOGO}<span>NEXUS</span></a>
  <button class="icon-btn user-menu" id="userNavBtn" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="userTopNav">${NX.ic("menu")}</button>
  <nav class="user-nav" id="userTopNav" aria-label="User portal navigation">${items}</nav>
  <div class="user-nav-actions">
    <button class="theme-btn user-theme-btn" id="themeBtn" type="button" aria-label="Switch theme" title="Switch theme"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>
    <a class="user-profile-link" href="${P("user-profile")}"${page === "user-profile" ? ' aria-current="page"' : ""}><span>Profile</span></a>
    <button class="user-logout" id="signOut" type="button" aria-label="Log out" title="Log out"><span>Log out</span></button>
  </div>
</header>` : "";
      const expertPortalNav = role === "expert" ? `
<header class="expert-portal-nav">
  <a class="expert-brand" href="${NX.home()}" aria-label="NEXUS home">${LOGO}<span>NEXUS</span></a>
  <button class="expert-menu-btn" id="expertNavBtn" type="button" aria-label="Open expert navigation" aria-expanded="false" aria-controls="expertTopNav">Menu</button>
  <nav class="expert-top-nav" id="expertTopNav" aria-label="Expert portal navigation">
    <a class="expert-nav-link" href="${P("expert-calendar")}"${page === "expert-calendar" ? ' aria-current="page"' : ""}>Calendar</a>
    <a class="expert-nav-link" href="${P("expert-meetings")}"${page === "expert-meetings" ? ' aria-current="page"' : ""}>Meetings</a>
    <a class="expert-nav-link" href="${P("expert-messages")}"${page === "expert-messages" ? ' aria-current="page"' : ""}>Messages</a>
    <a class="expert-nav-link" href="${P("expert-wallet")}"${page === "expert-wallet" ? ' aria-current="page"' : ""}>Wallet</a>
  </nav>
  <div class="expert-nav-actions">
    <button class="theme-btn expert-theme-btn" id="themeBtn" type="button" aria-label="Switch theme" title="Switch theme"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>
    <a class="expert-profile-link" href="${P("expert-profile")}"${page === "expert-profile" ? ' aria-current="page"' : ""}>Profile</a>
    <a class="expert-settings-link" href="${P("expert-settings")}"${page === "expert-settings" ? ' aria-current="page"' : ""}>Settings</a>
    <button class="expert-logout" id="signOut" type="button">Logout</button>
  </div>
</header>` : "";
      const userPortalSide = role === "user" && !isUserDashboard || role === "expert" ? "" : `
<aside class="side" id="side" aria-label="${roleName} navigation">
  <a class="brand side-brand" href="${NX.home()}" aria-label="NEXUS — public site">${LOGO}<span class="wordmark">NEXUS</span></a>
  <div class="side-role"><span class="dot"></span>${roleName} portal</div>
  <nav class="side-nav">${sideItems}</nav>
  ${site ? `<div class="side-sep">Browse</div><nav class="side-nav">${site}</nav>` : ""}
  <div class="side-user">
    ${NX.avatar(shownName)}
    <div class="su-t"><b>${NX.esc(shownName)}</b><span>${NX.esc(user.email)}</span></div>
    <button class="icon-btn side-signout" type="button" aria-label="Sign out" title="Sign out">${NX.ic("logout")}</button>
  </div>
</aside>
<div class="side-scrim" id="sideScrim"></div>`;
      const menuButton = role === "user" && !isUserDashboard || role === "expert" ? "" : `<button class="icon-btn menu" id="sideBtn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="side">${NX.ic("menu")}</button>`;
      const pageTopbar = role === "expert" || role === "user" && !isUserDashboard ? "" : isUserDashboard ? `<header class="topbar dashboard-tools">${menuButton}</header>` : `<header class="topbar">
      ${menuButton}
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${NX.home()}">NEXUS</a><span>/</span><a href="${P(NAV[role][0][0])}">${roleName}</a><span>/</span><b>${NX.esc(o.title)}</b></nav>
      <div class="top-actions">
        <span class="demo-chip" title="Demo environment: sample data, nothing is saved">Demo</span>
        <a class="icon-btn" href="${P(NAV[role].find((n) => n[3] === "msg") ? NAV[role].find((n) => n[3] === "msg")[0] : NAV[role][0][0])}" aria-label="Messages" ${NAV[role].find((n) => n[3] === "msg") ? "" : "hidden"}>${NX.ic("bell")}<b class="side-badge dot-badge" data-badge="msg" hidden></b></a>
        <button class="theme-btn" id="themeBtn" type="button" aria-label="Switch theme"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>
      </div>
    </header>`;

      host.outerHTML = `
<a class="skip" href="#main">Skip to content</a>
<div class="portal${role === "user" ? (isUserDashboard ? " portal-user-dashboard" : " portal-user") : role === "expert" ? " portal-expert" : ""}">
  ${userPortalNav}
  ${expertPortalNav}
  ${userPortalSide}
  <div class="portal-main">
    ${pageTopbar}
    <main id="main" class="pg-main">
      <div class="pg-head">
        <div><h1>${NX.esc(o.title)}</h1>${o.sub ? `<p>${NX.esc(o.sub)}</p>` : ""}</div>
        <div class="pg-actions" id="pgActions">${role === "user" && !isUserDashboard ? `<a class="btn btn-ghost btn-sm user-dashboard-shortcut" href="${P("user-dashboard")}" aria-label="Return to Dashboard">${NX.ic("grid")}<span>Dashboard</span></a>` : ""}${o.actions || ""}</div>
      </div>
      <div id="pg">${NX.skeleton(3)}</div>
    </main>
  </div>
</div>
<dialog class="dlg" id="dlg" aria-labelledby="dlg-t"></dialog>
<div id="toasts" aria-live="polite"></div>`;

      NX.showFlash && NX.showFlash();

      /* sidebar behaviour */
      const side = document.getElementById("side");
      const sideBtn = document.getElementById("sideBtn");
      const sideScrim = document.getElementById("sideScrim");
      const setSide = (open) => {
        if (!side || !sideBtn || !sideScrim) return;
        side.classList.toggle("open", open);
        sideScrim.classList.toggle("on", open);
        sideBtn.setAttribute("aria-expanded", String(open));
      };
      sideBtn?.addEventListener("click", () => setSide(!side.classList.contains("open")));
      sideScrim?.addEventListener("click", () => setSide(false));
      const userNav = document.getElementById("userTopNav");
      const userNavBtn = document.getElementById("userNavBtn");
      userNavBtn?.addEventListener("click", () => {
        const open = !userNav.classList.contains("open");
        userNav.classList.toggle("open", open);
        userNavBtn.setAttribute("aria-expanded", String(open));
      });
      const expertNav = document.getElementById("expertTopNav");
      const expertNavBtn = document.getElementById("expertNavBtn");
      expertNavBtn?.addEventListener("click", () => {
        const open = !expertNav.classList.contains("open");
        expertNav.classList.toggle("open", open);
        expertNavBtn.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          setSide(false);
          userNav?.classList.remove("open");
          userNavBtn?.setAttribute("aria-expanded", "false");
          expertNav?.classList.remove("open");
          expertNavBtn?.setAttribute("aria-expanded", "false");
        }
      });
      document.querySelectorAll("#signOut, .side-signout").forEach((button) => button.addEventListener("click", () => {
        NX.Auth.logout();
        location.href = NX.home();
      }));

      /* badges (unread messages / pending approvals) */
      const badge = (key, n) =>
        document.querySelectorAll(`[data-badge="${key}"]`).forEach((b) => {
          b.textContent = n > 9 ? "9+" : n;
          b.hidden = !n;
        });
      NX.Api.unread().then((n) => badge("msg", n));
      NX.Portal.refreshBadges = () => NX.Api.unread().then((n) => badge("msg", n));
      if (role === "admin") NX.Api.adminStats().then((s) => badge("appr", s.pendingApprovals));

      return document.getElementById("pg");
    },
  };
  NX.Portal = Portal;
})();

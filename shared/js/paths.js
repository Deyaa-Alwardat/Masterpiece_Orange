/* NEXUS — paths & roles.
   index.html uses <body data-root="">, every file in /pages uses <body data-root="../">.
   All links in JS are built with NX.page() so they work from both locations. */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});
  NX.root = (document.body && document.body.getAttribute("data-root")) || "";

  /** URL of a page inside /pages, e.g. NX.page("space", { id: "s1" }) */
  NX.page = (name, query) => {
    let q = "";
    const m = /^(expert|owner|company|admin)-login$/.exec(name);
    if (m) {
      name = "login";
      query = Object.assign({ role: m[1] }, query);
    }
    if (
      (name === "booking-summary" || name === "checkout") &&
      (NX.qs("as") === "company" || /^company-/.test(location.pathname.split("/").pop()))
    )
      query = Object.assign({ as: "company" }, query);
    if (query) {
      const p = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== "") p.set(k, query[k]);
      });
      q = p.toString() ? "?" + p.toString() : "";
    }
    return NX.root + "pages/" + name + ".html" + q;
  };
  NX.home = (hash) => NX.root + "index.html" + (hash || "");
  NX.asset = (p) => NX.root + "assets/" + p;

  /** Role registry: login page, landing page and accent colour of every portal */
  NX.ROLES = {
    user: { label: "Member", login: "login", home: "user-bookings", accent: "cyan" },
    expert: { label: "Expert", login: "login", home: "expert-dashboard", accent: "violet" },
    owner: { label: "Space owner", login: "login", home: "owner-dashboard", accent: "mint" },
    company: {
      label: "Company",
      login: "login",
      home: "company-dashboard",
      accent: "blue",
    },
    admin: { label: "Admin", login: "login", home: "admin-dashboard", accent: "amber" },
  };

  /** NEXUS logo mark (inline SVG) — shared by navbar, footer and portal shell */
  NX.LOGO =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38V10L38 38V10" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="38" r="6.6" fill="#7C5CFF"/><circle cx="10" cy="10" r="6.6" fill="#FFC24B"/><circle cx="38" cy="38" r="6.6" fill="#29D6F0"/><circle cx="38" cy="10" r="6.6" fill="#FF5E9C"/></svg>';

  /** Query-string helper */
  NX.qs = (k) => new URLSearchParams(location.search).get(k);
})();

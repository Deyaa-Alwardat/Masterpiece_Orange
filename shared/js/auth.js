/* NEXUS — screens-only "authentication".
   There is no session and nothing is stored. The role is read from the page you are on
   (user-*.html → member, expert-*.html → expert, …) and the matching sample account is shown.
   A production build must use real server-side sessions, hashed passwords and role checks. */
(function () {
  "use strict";
  const NX = window.NX;
  const DB = NX.DB;

  const Auth = {
    /** Role implied by the current page (or ?as=company on the shared booking pages) */
    pageRole() {
      const as = NX.qs("as");
      if (as === "company") return "company";
      const file = location.pathname.split("/").pop().replace(".html", "");
      const m = /^(user|expert|owner|company|admin)-/.exec(file);
      if (m) return m[1];
      return ["booking-summary", "checkout", "services"].includes(file) ? "user" : null;
    },
    /** Sample account for the current page, or null on public pages */
    user() {
      const role = Auth.pageRole();
      if (!role) return null;
      return DB.all("users").find((x) => x.email === NX.DEMO_ACCOUNTS[role]) || null;
    },
    /** Sample member used by public pages so booking flows work without signing in */
    demo() {
      return DB.all("users").find((x) => x.email === NX.DEMO_ACCOUNTS.user) || null;
    },
    role() {
      const u = Auth.user();
      return u ? u.role : null;
    },

    /** Screens only: no credentials are checked — the form just opens the chosen portal. */
    login(email, password, role) {
      const u = DB.all("users").find((x) => x.email === NX.DEMO_ACCOUNTS[role || "user"]);
      return Object.assign({}, u);
    },
    register(d) {
      const u = DB.all("users").find((x) => x.email === NX.DEMO_ACCOUNTS[d.role || "user"]);
      return Object.assign({}, u, { name: d.name || u.name });
    },
    logout() {},

    audit(actor, action, detail) {
      try {
        const l = DB.all("audit");
        l.unshift({ id: "L-" + Date.now(), at: Date.now(), actor, action, detail: detail || "" });
        DB.save("audit", l.slice(0, 80));
      } catch (e) {}
    },

    /** Where to go after sign-in: ?next= if it is a local page, otherwise the role home */
    landing(role) {
      const next = NX.qs("next");
      if (next && /^[a-z0-9\-]+\.html(\?[\w=&%.\-]*)?$/i.test(next))
        return NX.root + "pages/" + next;
      return NX.page(NX.ROLES[role].home);
    },

    /** Page guard. Call at the top of a protected page; returns the user or null (and redirects).
        roles: a role string or an array of allowed roles. */
    guard(roles) {
      const allowed = [].concat(roles);
      const u = Auth.user();
      if (!u || !allowed.includes(u.role)) {
        location.replace(NX.page("login", { role: allowed[0] }));
        return null;
      }
      return u;
    },
  };
  NX.Auth = Auth;
})();

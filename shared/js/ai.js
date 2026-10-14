/* NEXUS — local demo Expert Matchmaker (keyword ranking, not an external AI service).
   Detects needs in plain English, then ranks experts by specialty coverage, rating and
   presence in the user's space. It only suggests — the user always chooses. */
(function () {
  "use strict";
  const NX = window.NX;

  function catalog() {
    return NX.NEEDS || (typeof NEEDS !== "undefined" ? NEEDS : {});
  }

  function compile() {
    Object.values(catalog()).forEach((n) => {
      n.re = (n.kw || []).map((k) => {
        const nk = NX.norm(k);
        const w = nk.includes(" ") ? 2 : 1;
        const src = nk.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
        const short = nk.replace(/[^a-z0-9]/g, "").length <= 3;
        return [new RegExp("(^|[^a-z0-9])" + src + (short ? "($|[^a-z0-9])" : ""), "i"), w];
      });
    });
  }

  try {
    compile();
  } catch (e) {}

  function skillsOf(expert) {
    const needs = catalog();
    return Array.isArray(expert && expert.skills)
      ? expert.skills.filter((id) => needs[id])
      : [];
  }

  NX.Ai = {
    detect(text) {
      try {
        compile();
      } catch (e) {
        return [];
      }
      const t = NX.norm(text || "");
      if (t.length < 4) return [];
      const sc = [];
      for (const [id, n] of Object.entries(catalog())) {
        let s = 0;
        (n.re || []).forEach(([re, w]) => {
          re.lastIndex = 0;
          if (re.test(t)) s += w;
        });
        const label = NX.norm(n.en || "");
        if (label && t.includes(label)) s += 2;
        if (s > 0) sc.push([id, s]);
      }
      if (!sc.length) return [];
      sc.sort((a, b) => b[1] - a[1]);
      const best = sc[0][1];
      const floor = Math.max(1, best * 0.5);
      return sc
        .filter((row) => row[1] >= floor)
        .slice(0, 3)
        .map((row) => row[0]);
    },
    match(needs, experts, mySpaceIds) {
      try {
        compile();
      } catch (e) {
        return [];
      }
      const keys = (Array.isArray(needs) ? needs : []).filter((id) => catalog()[id]);
      if (!keys.length) return [];
      const W = [1.3, 1.15, 1];
      const here = new Set(mySpaceIds || []);
      const rows = (Array.isArray(experts) ? experts : [])
        .map((e) => {
          const skills = skillsOf(e);
          if (!skills.length) return null;
          const cov = keys.filter((n) => skills.includes(n));
          if (!cov.length) return null;
          const h = !!(e.spaceId && here.has(e.spaceId));
          const score =
            cov.reduce((a, n) => a + 10 * (W[keys.indexOf(n)] || 1), 0) +
            (Number(e.rating) || 4) * 1.5 +
            (h ? 3 : 0);
          return { e, cov, here: h, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      const best = rows.length ? rows[0].score : 1;
      rows.forEach((r, i) => {
        r.pct = Math.min(99, Math.round(62 + 37 * (r.score / best) - i * 2));
      });
      return rows;
    },
  };
})();

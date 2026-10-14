/* NEXUS — sample-data layer.
   Most sample data is rebuilt in memory on every page load. Demo inbox threads and consultations
   are kept in sessionStorage for the current browser tab session by the API.
   Production replaces NX.Store / NX.DB with real HTTP calls (see README → Backend requirements). */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});
  const SEED_VERSION = "3";

  /* ---------- key/value store (backed by tab sessionStorage with in-memory fallback) ---------- */
  const memory = {};
  const PREFIX = "nx_store_";
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const Store = {
    get(key, fallback) {
      if (Object.prototype.hasOwnProperty.call(memory, key)) {
        return clone(memory[key]);
      }
      try {
        const raw = sessionStorage.getItem(PREFIX + key);
        if (raw !== null) {
          const val = JSON.parse(raw);
          memory[key] = val;
          return clone(val);
        }
      } catch (e) {}
      return fallback;
    },
    set(key, value) {
      memory[key] = clone(value);
      try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {}
    },
    del(key) {
      delete memory[key];
      try {
        sessionStorage.removeItem(PREFIX + key);
      } catch (e) {}
    },
    keys() {
      const set = new Set(Object.keys(memory));
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(PREFIX)) {
            set.add(k.slice(PREFIX.length));
          }
        }
      } catch (e) {}
      return Array.from(set);
    },
  };
  NX.Store = Store;

  /** Demo-only password hash (djb2). NOT secure — a real backend must use bcrypt/argon2. */
  NX.hash = (text) => {
    let h = 5381;
    for (const c of String(text)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return String(h);
  };

  /* ---------- date helpers (kept here so the seed can run before ui.js) ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  NX.isoOffset = (days) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return toISO(d);
  };

  /* ---------- collections ---------- */
  const DB = {
    ready() {
      if (Store.get("seed_v", null) === SEED_VERSION && Store.get("c_users", null)) return;
      DB.reset();
    },
    reset() {
      Store.keys()
        .filter((k) => k.indexOf("c_") === 0)
        .forEach((k) => Store.del(k));
      const seed = NX.buildSeed();
      Object.keys(seed).forEach((name) => Store.set("c_" + name, seed[name]));
      Store.set("seed_v", SEED_VERSION);
    },
    all(name) {
      DB.ready();
      return Store.get("c_" + name, []);
    },
    obj(name) {
      DB.ready();
      return Store.get("c_" + name, {});
    },
    save(name, value) {
      Store.set("c_" + name, value);
    },
    find(name, id) {
      return DB.all(name).find((x) => x.id === id) || null;
    },
    add(name, rec) {
      const list = DB.all(name);
      list.push(rec);
      DB.save(name, list);
      return rec;
    },
    patch(name, id, changes) {
      let hit = null;
      const list = DB.all(name).map((x) => {
        if (x.id !== id) return x;
        hit = Object.assign({}, x, typeof changes === "function" ? changes(x) : changes);
        return hit;
      });
      DB.save(name, list);
      return hit;
    },
    remove(name, id) {
      DB.save(
        name,
        DB.all(name).filter((x) => x.id !== id),
      );
    },
    nextId(prefix, name, start) {
      const nums = DB.all(name)
        .map((x) => parseInt(String(x.id).replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
      return prefix + (Math.max(start || 1000, ...nums) + 1);
    },
  };
  NX.DB = DB;
})();

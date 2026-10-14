/* NEXUS — shared UI helpers: icons, theme, nav, footer, toasts, dialog, reveal, counters, confetti */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});

  NX.$ = (s, r = document) => r.querySelector(s);
  NX.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  NX.esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  NX.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  NX.norm = (s) => String(s).toLowerCase().replace(/[‑–—]/g, "-").replace(/\s+/g, " ");
  NX.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const now = new Date();
  NX.todayISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  NX.addDays = (iso, n) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  NX.fmtDate = (iso, o) => {
    try {
      return new Intl.DateTimeFormat(
        "en-GB",
        o || { weekday: "long", day: "numeric", month: "long" },
      ).format(new Date(iso + "T12:00:00"));
    } catch (e) {
      return iso;
    }
  };
  NX.initials = (n) =>
    String(n)
      .replace(/[‑-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0])
      .join("")
      .toUpperCase();
  NX.hue = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  };
  NX.ic = (n, c) => `<svg class="i ${c || ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  /* ---------- Icon sprite ---------- */
  const P = {
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    tools:
      '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    coffee:
      '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"/>',
    "arrow-l": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "arrow-r": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
    "chev-d": '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "check-c": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    users:
      '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.4.2 4 1.7 4.5 4.5"/>',
    building:
      '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
    briefcase:
      '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    spark:
      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off":
      '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.7C3.9 9.5 2 12 2 12s3.5 6 10 6c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone:
      '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
    desk: '<rect x="3" y="9" width="18" height="3" rx="1"/><path d="M6 12v7M18 12v7M9 9V5h6v4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
    linkedin:
      '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13a3 3 0 0 1 6 0v4"/>',
    instagram:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    xsoc: '<path d="M4 4l16 16M20 4L4 20"/>',
    wallet:
      '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 2.3M12 17h.01"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    inbox:
      '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    chat: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.3-.6L4 20l1.2-3.7A7.2 7.2 0 0 1 4 12C4 7.9 7.6 5 12 5s8 2.9 8 6.5z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L20 3M17 6l3 3M14 9l2 2"/>',
    clipboard:
      '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    refresh:
      '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M3 21v-5h5"/>',
    more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    external:
      '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    printer2: '<path d="M6 9V3h12v6"/>',
    github:
      '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
  };
  const SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    Object.entries(P)
      .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`)
      .join("") +
    "</defs></svg>";

  /* ---------- Theme ---------- */
  NX.isLight = () => document.documentElement.dataset.theme === "light";
  NX.setTheme = (t, save) => {
    const root = document.documentElement;
    const light = t === "light";
    if (light) root.dataset.theme = "light";
    else delete root.dataset.theme;
    const b = NX.$("#themeBtn");
    if (b)
      b.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = light ? "#F3F5FC" : "#060916";
    if (save) {
      try {
        localStorage.setItem("nx-theme", light ? "light" : "dark");
      } catch (_) {}
    }
    document.dispatchEvent(new Event("nx-theme"));
  };

  /* ---------- Toast ---------- */
  NX.toast = (msg, bad) => {
    const box = NX.$("#toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast" + (bad ? " bad" : "");
    el.setAttribute("role", "status");
    el.innerHTML = NX.ic(bad ? "alert" : "check") + "<span>" + NX.esc(msg) + "</span>";
    box.append(el);
    setTimeout(() => el.remove(), 3600);
  };

  /* ---------- Dialog ---------- */
  NX.dlg = {
    el: () => NX.$("#dlg"),
    open(html) {
      const d = this.el();
      d.innerHTML = html;
      if (!d.open) {
        try {
          d.showModal();
        } catch (e) {
          d.setAttribute("open", "");
        }
      }
    },
    close() {
      const d = this.el();
      if (d && d.open) {
        try {
          d.close();
        } catch (e) {
          d.removeAttribute("open");
        }
      }
    },
    head: (t, s) =>
      `<div class="dlg-h"><div><h2 id="dlg-t">${t}</h2>${s ? `<p>${s}</p>` : ""}</div><button class="x" type="button" data-close aria-label="Close">${NX.ic("close")}</button></div>`,
  };

  /* ---------- Confetti ---------- */
  NX.confetti = (x, y) => {
    if (NX.reduced) return;
    let cv = NX.$("#confetti");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = "confetti";
      document.body.append(cv);
    }
    const ctx = cv.getContext("2d"),
      dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ["#7C5CFF", "#29D6F0", "#FFC24B", "#FF5E9C", "#34D6A0", "#3E8BFF"];
    const ox = x == null ? innerWidth / 2 : x,
      oy = y == null ? innerHeight * 0.4 : y;
    const ps = Array.from({ length: 130 }, () => {
      const a = Math.random() * Math.PI * 2,
        v = 5 + Math.random() * 9;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 5,
        r: 4 + Math.random() * 5,
        c: cols[(Math.random() * cols.length) | 0],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.35,
        life: 1,
      };
    });
    (function f() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      ps.forEach((p) => {
        p.vy += 0.28;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.009;
        if (p.life > 0 && p.y < innerHeight + 30) {
          alive++;
          ctx.save();
          ctx.globalAlpha = Math.min(1, p.life * 1.6);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx.restore();
        }
      });
      if (alive) requestAnimationFrame(f);
      else cv.remove();
    })();
  };

  /* ---------- Calendar file (.ics) ---------- */
  NX.downloadICS = ({ title, date, location, desc, durationType, startTime, endTime }) => {
    const d = date.replace(/-/g, ""),
      nx = NX.addDays(date, 1).replace(/-/g, "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NEXUS//Booking//EN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@nexus.jo",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ""),
      ...(durationType === "hourly" && startTime && endTime
        ? [
            "DTSTART:" + d + "T" + startTime.replace(":", "") + "00",
            "DTEND:" + (endTime === "24:00" ? nx + "T000000" : d + "T" + endTime.replace(":", "") + "00"),
          ]
        : ["DTSTART;VALUE=DATE:" + d, "DTEND;VALUE=DATE:" + nx]),
      "SUMMARY:" + title,
      "LOCATION:" + (location || ""),
      "DESCRIPTION:" + (desc || ""),
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
    a.download = "nexus-booking.ics";
    document.body.append(a);
    a.click();
    a.remove();
  };

  /* ---------- Count-up numbers: <b data-count="1200" data-suffix="+"> ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.count),
      dec = +(el.dataset.dec || 0),
      suf = el.dataset.suffix || "",
      pre = el.dataset.prefix || "";
    const fmt = (v) =>
      pre +
      v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
      suf;
    if (NX.reduced) {
      el.textContent = fmt(to);
      return;
    }
    const t0 = performance.now(),
      dur = +(el.dataset.dur || 1400);
    (function f(t) {
      const k = Math.min(1, (t - t0) / dur),
        e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  NX.countUp = countUp;
  NX.observe = () => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          el.classList.add("in");
          if (el.hasAttribute("data-count")) countUp(el);
          io.unobserve(el);
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    NX.$$(".rv:not(.in), [data-count]:not([data-seen])").forEach((el) => {
      el.dataset.seen = 1;
      io.observe(el);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("afterbegin", SPRITE);
    let savedTheme = "";
    try {
      savedTheme = localStorage.getItem("nx-theme") || "";
    } catch (_) {}
    NX.setTheme(savedTheme === "light" ? "light" : savedTheme === "dark" ? "dark" : NX.isLight() ? "light" : "dark", false);
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("#themeBtn")) return;
      NX.setTheme(NX.isLight() ? "dark" : "light", true);
    });
    document.addEventListener("click", (e) => {
      const d = NX.dlg.el(),
        target = e.target;
      if (!(target instanceof Element) || !d) return;
      if (target === d || target.closest("#dlg [data-close]")) NX.dlg.close();
    });

    /* mobile menu + scrolled nav */
    const mb = NX.$("#menuBtn"),
      links = NX.$("#navLinks"),
      nav = NX.$(".nav");
    if (mb)
      mb.addEventListener("click", () => {
        const o = links.classList.toggle("open");
        mb.setAttribute("aria-expanded", o);
      });
    const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 12);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    /* signed-in user chip (role-aware) */
    const u = NX.Auth && NX.Auth.user();
    const slot = NX.$("#navUser");
    if (slot && u) {
      const home = NX.page(NX.ROLES[u.role].home);
      slot.innerHTML = `<button class="user-chip" id="userBtn" aria-haspopup="true" aria-expanded="false"><span class="avatar" style="--h:${NX.hue(u.name)}">${NX.esc([...u.name][0])}</span><span>${NX.esc(u.name.split(" ")[0])}</span></button>
      <div class="user-menu" id="userMenu" hidden><a href="${home}">My dashboard</a><button id="logout">Sign out</button></div>`;
      const b = NX.$("#userBtn"),
        m = NX.$("#userMenu");
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        m.hidden = !m.hidden;
        b.setAttribute("aria-expanded", !m.hidden);
      });
      document.addEventListener("click", () => {
        m.hidden = true;
      });
      NX.$("#logout").addEventListener("click", () => {
        NX.Auth.logout();
        location.href = NX.home();
      });
    }

    /* one-time message left by a redirect (e.g. guard) */
    NX.showFlash = () => {
      const flash = NX.Store.get("flash", null);
      if (flash && NX.$("#toasts")) {
        NX.Store.del("flash");
        NX.toast(flash.msg, flash.bad);
      }
    };
    NX.showFlash();

    /* Floating help and AI shortcut, shared by every page that loads ui.js. */
    const chatUser = NX.Auth && NX.Auth.user();
    const aiMatchPage = chatUser && chatUser.role === "user" ? NX.page("user-matchmaking") : NX.page("experts");
    const chatSupport = chatUser
      ? `<form class="nx-chat-form" id="nxChatForm"><label for="nxChatMessage">How can we help?</label><textarea id="nxChatMessage" name="message" rows="3" maxlength="1200" minlength="10" placeholder="Write your question or describe the issue…" required></textarea><small>10–1,200 characters. Your message goes to the demo support inbox.</small><button class="btn btn-primary" type="submit">Send to support</button><p class="nx-chat-status" id="nxChatStatus" role="status" aria-live="polite"></p></form>`
      : `<p class="nx-chat-copy">Need help with NEXUS? Send us a message and we’ll help you find the right next step.</p><a class="nx-chat-action" href="${NX.page("contact")}">${NX.ic("inbox")}<span>Contact support</span>${NX.ic("arrow-r")}</a>`;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="nx-chat-widget" id="nxChatWidget">
        <section class="nx-chat-panel" id="nxChatPanel" aria-labelledby="nxChatTitle" hidden>
          <header class="nx-chat-head"><span class="nx-chat-head-icon">${NX.ic("chat")}</span><div><h2 id="nxChatTitle">NEXUS Support</h2><p>General help and guidance</p></div><button class="nx-chat-close" id="nxChatClose" type="button" aria-label="Close chat">${NX.ic("close")}</button></header>
          <div class="nx-chat-body"><p class="nx-chat-copy">Hi${chatUser ? `, ${NX.esc(chatUser.name.split(" ")[0])}` : ""}. What can we help you with?</p><a class="nx-chat-action" href="${aiMatchPage}">${NX.ic("spark")}<span>Find an expert with AI</span>${NX.ic("arrow-r")}</a>${chatSupport}</div>
        </section>
        <button class="nx-chat-launcher" id="nxChatOpen" type="button" aria-expanded="false" aria-controls="nxChatPanel"><span class="nx-chat-launch-icon">${NX.ic("chat")}</span><span>Chat</span><i aria-hidden="true"></i></button>
      </div>`);
    const chatOpen = NX.$("#nxChatOpen");
    const chatPanel = NX.$("#nxChatPanel");
    const setChatOpen = (open) => {
      chatPanel.hidden = !open;
      chatOpen.setAttribute("aria-expanded", String(open));
      if (open) (NX.$("#nxChatMessage") || NX.$("#nxChatClose")).focus();
      else chatOpen.focus();
    };
    chatOpen.addEventListener("click", () => setChatOpen(chatPanel.hidden));
    NX.$("#nxChatClose").addEventListener("click", () => setChatOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !chatPanel.hidden) setChatOpen(false);
    });
    NX.$("#nxChatForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const field = NX.$("#nxChatMessage", form);
      const status = NX.$("#nxChatStatus", form);
      const submit = form.querySelector('button[type="submit"]');
      const message = field.value.trim();
      if (message.length < 10) {
        status.textContent = "Please enter at least 10 characters.";
        field.focus();
        return;
      }
      submit.disabled = true;
      status.textContent = "Sending your support request…";
      try {
        await NX.Api.addSupport({ category: "General", subject: "Chat support request", message });
        form.reset();
        status.textContent = "Your message was added to the demo support inbox.";
      } catch (error) {
        status.textContent = error.message || "We could not send your message. Please try again.";
      } finally {
        submit.disabled = false;
      }
    });

    /* footer: demo newsletter and back to top */
    const newsForm = NX.$("#newsForm");
    if (newsForm)
      newsForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = NX.$("#newsMsg");
        if (message) {
          message.textContent = "Thanks for trying it — sign-ups are not saved in this demo.";
        }
      });

    const tt = NX.$("#toTop");
    if (tt)
      tt.addEventListener("click", () =>
        scrollTo({ top: 0, behavior: NX.reduced ? "auto" : "smooth" }),
      );
    /* cursor spotlight for [data-spot] cards */
    document.addEventListener(
      "pointermove",
      (e) => {
        const c = e.target.closest && e.target.closest("[data-spot]");
        if (!c) return;
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", e.clientX - r.left + "px");
        c.style.setProperty("--my", e.clientY - r.top + "px");
      },
      { passive: true },
    );

    NX.observe();
  });
})();

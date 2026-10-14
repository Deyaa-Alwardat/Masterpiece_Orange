/* NEXUS — formatting + small UI builders shared by every portal page.
   Loads after ui.js. */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;

  NX.jod = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2) + " JOD";
  NX.jodSigned = (n) => (n < 0 ? "−" : "+") + NX.jod(Math.abs(n));
  NX.dt = (ms) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  NX.dshort = (ms) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(ms),
    );
  NX.fmtTime = (value) => {
    const time = String(value || "");
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return time;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) return time;
    if (hour === 24) return "12:00 AM (next day)";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  };
  NX.dateShort = (iso) => NX.fmtDate(iso, { day: "numeric", month: "short", year: "numeric" });
  NX.ago = (ms) => {
    const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    if (s < 86400 * 7) return Math.round(s / 86400) + " d ago";
    return NX.dshort(ms);
  };
  NX.stars = (n) => {
    const v = Math.round(n || 0);
    return `<span class="stars" aria-label="${v} out of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? "on" : ""}">★</i>`).join("")}</span>`;
  };
  NX.avatar = (name, size) =>
    `<span class="avatar" style="--h:${NX.hue(name)}${size ? ";--s:" + size + "px" : ""}">${esc(NX.initials(name))}</span>`;

  const LABEL = {
    requested: "Requested",
    confirmed: "Confirmed",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined",
    paid: "Paid",
    approved: "Approved",
    rejected: "Rejected",
    active: "Active",
    suspended: "Suspended",
    open: "Open",
    resolved: "Resolved",
    new: "New",
    progress: "In progress",
    done: "Done",
    paused: "Paused",
    not_started: "Not Started",
    demo_success: "Legacy simulated payment",
    failed: "Failed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  NX.status = (s) => `<span class="sts sts-${esc(s)}">${esc(LABEL[s] || s)}</span>`;

  NX.skeleton = (n) =>
    `<div class="skel-wrap" aria-busy="true" aria-label="Loading">${Array.from({ length: n || 3 }, () => '<div class="skel"></div>').join("")}</div>`;
  NX.empty = (icon, title, text, action) =>
    `<div class="empty">${NX.ic(icon)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action || ""}</div>`;
  NX.errorBox = (msg) =>
    `<div class="empty err-box" role="alert">${NX.ic("alert")}<h3>Something went wrong</h3><p>${esc(msg)}</p><button class="btn btn-ghost" type="button" onclick="location.reload()">Try again</button></div>`;

  /** Promise-based confirm dialog */
  NX.confirm = (title, text, okLabel, danger) =>
    new Promise((resolve) => {
      NX.dlg.open(
        NX.dlg.head(esc(title), "") +
          `<div class="dlg-b"><p class="muted">${esc(text)}</p><div class="dlg-actions"><button class="btn btn-ghost" type="button" data-no>Keep</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-yes>${esc(okLabel || "Confirm")}</button></div></div>`,
      );
      const d = NX.dlg.el();
      let done = false;
      const fin = (v) => {
        if (done) return;
        done = true;
        d.removeEventListener("close", onClose);
        NX.dlg.close();
        resolve(v);
      };
      const onClose = () => fin(false);
      d.addEventListener("close", onClose);
      d.querySelector("[data-yes]").addEventListener("click", () => fin(true));
      d.querySelector("[data-no]").addEventListener("click", () => fin(false));
    });

  /** Run an async action on a button: disables it, shows busy text, toasts errors */
  NX.run = async (btn, fn, busyText) => {
    const old = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      if (busyText) btn.textContent = busyText;
    }
    try {
      return await fn();
    } catch (e) {
      NX.toast(e.message || "Something went wrong.", true);
      return undefined;
    } finally {
      if (btn && btn.isConnected) {
        btn.disabled = false;
        btn.innerHTML = old;
      }
    }
  };

  NX.csv = (name, rows) => {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const blob = new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /** Inline field validation helper: returns true when valid, writes into .err siblings */
  NX.fieldErr = (el, msg) => {
    const box = el.closest(".field");
    const e = box && box.querySelector(".err");
    if (e) e.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  };
  NX.field = (id, label, input, cls) =>
    `<div class="field${cls ? " " + cls : ""}"><label for="${id}">${label}</label>${input}<div class="err" id="${id}-e" role="alert"></div></div>`;

  /** Simple inline SVG bar chart: data = [{label, value}] */
  NX.bars = (data, opts) => {
    opts = opts || {};
    const max = Math.max(1, ...data.map((d) => d.value));
    return `<div class="bars" role="img" aria-label="${esc(opts.label || "Chart")}">${data
      .map(
        (d) =>
          `<div class="bar"><span class="bar-v">${esc(opts.fmt ? opts.fmt(d.value) : d.value)}</span><i style="--h:${Math.max(3, (d.value / max) * 100)}%"></i><span class="bar-l">${esc(d.label)}</span></div>`,
      )
      .join("")}</div>`;
  };
})();

/* ---------- dashboard building blocks ---------- */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;

  /** KPI card. opts: {icon, money, dec, sub, cls} — numeric values count up when scrolled into view */
  NX.statCard = (label, value, opts) => {
    opts = opts || {};
    const isNum = typeof value === "number";
    const dec = opts.money ? 2 : opts.dec || 0;
    const text = isNum
      ? value.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
        (opts.money ? " JOD" : "")
      : esc(value);
    const attrs = isNum
      ? ` data-count="${value}" data-dec="${dec}"${opts.money ? ' data-suffix=" JOD"' : opts.suffix ? ' data-suffix="' + opts.suffix + '"' : ""}`
      : "";
    return `<div class="card stat ${opts.cls || ""}"><span class="ic">${NX.ic(opts.icon || "chart")}</span><span class="l">${esc(label)}</span><span class="v"${attrs}>${text}${opts.suffix && isNum && !opts.money ? opts.suffix : ""}</span>${opts.sub ? `<span class="d">${esc(opts.sub)}</span>` : ""}</div>`;
  };
  NX.dayBox = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return `<span class="date-box"><b>${d.getDate()}</b><span>${new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d)}</span></span>`;
  };
  /** list row for a space booking */
  NX.bookingLi = (b, href) =>
    `<div class="li">${NX.dayBox(b.date)}<div class="grow"><div class="t">${esc(b.spaceName)}</div><div class="s">${b.deskIds.length} desk${b.deskIds.length > 1 ? "s" : ""} · ${esc(b.deskIds.join(", "))}${b.bookedBy ? " · " + esc(b.bookedBy) : ""}</div></div>${NX.status(b.status)}${href ? `<a class="btn btn-ghost btn-sm" href="${href}">Details</a>` : ""}</div>`;
  NX.consultLi = (c, who) =>
    `<div class="li">${NX.dayBox(c.date)}<div class="grow"><div class="t">${esc(who || c.expertName)}</div><div class="s">${esc(c.time)} · ${esc(MODES[c.mode].en)} · ${esc(c.topic)}</div></div>${NX.status(c.status)}</div>`;
  NX.isUpcoming = (rec) =>
    rec.date >= NX.todayISO && ["confirmed", "pending", "requested"].includes(rec.status);
  /** month label list for the last n months, newest last: [{key:"2026-10", label:"Oct"}] */
  NX.lastMonths = (n) => {
    const out = [];
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (n - 1));
    for (let i = 0; i < n; i++) {
      out.push({
        key: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
        label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  };
  NX.sum = (list, f) => Math.round(list.reduce((a, x) => a + f(x), 0) * 100) / 100;
})();

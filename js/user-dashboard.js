/* NEXUS — user dashboard */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const user = NX.Auth.user();
  const pg = NX.Portal.init({
    role: "user",
    page: "user-dashboard",
    title: "Dashboard",
    sub: user ? `Welcome back, ${user.name.split(" ")[0]}. Here's what's coming up.` : "",
    actions: `<a class="btn btn-primary" href="${NX.page("spaces")}">${NX.ic("search")}<span>Find a desk</span></a>`,
  });
  if (!pg) return;

  try {
    const [bookings, consults, wallet, unread, reviews] = await Promise.all([
      NX.Api.bookings(),
      NX.Api.consults(),
      NX.Api.wallet(),
      NX.Api.unread(),
      NX.Api.pendingReviews(),
    ]);
    const upB = bookings
      .filter(NX.isUpcoming)
      .sort((a, b) => a.date.localeCompare(b.date));
    const isActiveConsult = (consult) =>
      ["confirmed", "pending", "requested"].includes(consult.status) ||
      (consult.status === "approved" && consult.paymentStatus !== "paid");
    const upC = consults
      .filter((consult) => {
        if (!isActiveConsult(consult) || consult.date < NX.todayISO) return false;
        if (consult.date > NX.todayISO || !consult.time) return true;
        const start = Date.parse(`${consult.date}T${consult.time}:00`);
        return Number.isFinite(start) && start >= Date.now();
      })
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    const next = Array.from(
      new Map([
        ...upB.map((booking) => [`space:${booking.id}`, { ...booking, kind: "space" }]),
        ...upC.map((consult) => [
          `consultation:${consult.id}`,
          { ...consult, kind: "consultation" },
        ]),
      ]).values(),
    )
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
      .slice(0, 5);
    const completed = bookings
      .filter((b) => b.status === "completed")
      .reduce((days, booking) => days + (Number(booking.days) || 1), 0);
    const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
    const consultById = new Map(consults.map((consult) => [consult.id, consult]));
    const topicLabel = (topic) => {
      const clean = String(topic || "").trim().replace(/\s+/g, " ");
      if (!clean || /^any way$/i.test(clean) || /(.)\1{4,}/i.test(clean))
        return "No topic provided";
      return clean;
    };
    const statusLabel = (record) => {
      if (record.status === "approved" && record.paymentStatus !== "paid")
        return ["Approved — Awaiting Payment", "progress"];
      const labels = {
        requested: ["Requested", "requested"],
        pending: ["Pending", "pending"],
        confirmed: ["Confirmed", "confirmed"],
        declined: ["Declined", "declined"],
        cancelled: ["Cancelled", "cancelled"],
      };
      return labels[record.status] || [record.status, "pending"];
    };
    const bookingItem = (record, index) => {
      const isConsult = record.kind === "consultation";
      const title = isConsult ? record.expertName : record.spaceName;
      const detail = isConsult
        ? `${NX.esc(record.time || "Time not specified")} · ${NX.esc(MODES[record.mode]?.en || record.mode || "Session")} · ${NX.esc(topicLabel(record.topic))}`
        : `${record.time ? `${NX.esc(record.time)} · ` : ""}${record.deskIds.length} desk${record.deskIds.length === 1 ? "" : "s"} · ${NX.esc(record.deskIds.join(", "))}`;
      const [label, state] = statusLabel(record);
      const date = new Date(record.date + "T12:00:00");
      const day = date.getDate();
      const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
      const href = isConsult ? "" : NX.page("booking-summary", { id: record.id });
      return `<article class="dashboard-booking${index === 0 ? " is-next" : ""}">
        <time class="dashboard-date" datetime="${NX.esc(record.date)}"><b>${day}</b><span>${month}</span></time>
        <div class="dashboard-booking-main">
          <h3>${esc(title)}</h3>
          <p>${detail}</p>
          <div class="dashboard-booking-foot"><span class="sts sts-${state}">${esc(label)}</span>${href ? `<a class="dashboard-details" href="${href}">View details</a>` : ""}</div>
        </div>
      </article>`;
    };
    const transactionItem = (transaction) => {
      const related = bookingById.get(transaction.ref) || consultById.get(transaction.ref);
      const relatedDate = related
        ? `${NX.dateShort(related.date)}${related.time ? ` · ${esc(related.time)}` : ""}`
        : "";
      return `<article class="dashboard-transaction">
        <div class="dashboard-transaction-main">
          <h3>${esc(transaction.desc)}</h3>
          <time datetime="${new Date(transaction.at).toISOString()}">${esc(NX.dt(transaction.at))}</time>
          ${relatedDate ? `<p>Booking date · ${relatedDate}</p>` : ""}
        </div>
        <b class="dashboard-amount ${transaction.amount < 0 ? "neg" : "pos"}">${NX.jodSigned(transaction.amount)}</b>
      </article>`;
    };
    const metric = (label, value, icon, sub, href) => {
      const content = `<span class="dashboard-metric-icon" aria-hidden="true">${NX.ic(icon)}</span><span class="dashboard-metric-copy"><span class="dashboard-metric-label">${esc(label)}</span><span class="dashboard-metric-value">${esc(value)}</span><span class="dashboard-metric-sub">${esc(sub)}</span></span><span class="dashboard-metric-arrow" aria-hidden="true">${href ? NX.ic("arrow-r") : ""}</span>`;
      return href
        ? `<a class="dashboard-metric" href="${href}">${content}</a>`
        : `<div class="dashboard-metric">${content}</div>`;
    };

    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
        bookings: 0,
        spending: 0,
      };
    });
    const monthByKey = new Map(monthBuckets.map((month) => [month.key, month]));
    const monthKey = (value) => {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };
    bookings.forEach((booking) => {
      const month = monthByKey.get(monthKey(booking.date));
      if (month) month.bookings += 1;
    });
    consults.forEach((consult) => {
      const month = monthByKey.get(monthKey(consult.date));
      if (month) month.bookings += 1;
    });
    wallet.transactions.forEach((transaction) => {
      if (transaction.type === "topup" || transaction.type === "refund") return;
      const month = monthByKey.get(monthKey(transaction.at));
      if (month && Number(transaction.amount) < 0) month.spending += Math.abs(Number(transaction.amount));
    });

    const firstName = user ? user.name.split(" ")[0] : "there";
    const pageHead = document.querySelector(".pg-head");
    pageHead.classList.add("dashboard-hero");
    pageHead.innerHTML = `
      <div class="dashboard-hero-copy">
        <span class="dashboard-eyebrow">${NX.ic("spark")} Member dashboard</span>
        <h1>Your workspace.<br /><span class="dashboard-title-accent">Your momentum.</span></h1>
        <p class="dashboard-welcome">Welcome back, ${esc(firstName)}. Here's what's coming up.</p>
        <p class="dashboard-hero-note">${next.length ? `${next.length} upcoming ${next.length === 1 ? "booking" : "bookings"} in your preview` : "Your next booking will appear here."}</p>
      </div>
      <a class="btn btn-primary dashboard-find-desk" href="${NX.page("spaces")}">${NX.ic("search")}<span>Find a desk</span></a>`;
    pg.innerHTML = `
      <section class="dashboard-stats" aria-label="Account summary">
        <a class="dashboard-feature-stat" href="${NX.page("user-bookings")}" aria-label="Upcoming bookings: ${upB.length + upC.length}">
          <span class="dashboard-feature-icon" aria-hidden="true">${NX.ic("calendar")}</span>
          <span class="dashboard-feature-label">Upcoming bookings</span>
          <strong class="dashboard-feature-value">${upB.length + upC.length}</strong>
          <span class="dashboard-feature-foot">${upB.length} desk${upB.length === 1 ? "" : "s"} <span aria-hidden="true">·</span> ${upC.length} session${upC.length === 1 ? "" : "s"} <span class="dashboard-feature-arrow" aria-hidden="true">${NX.ic("arrow-r")}</span></span>
        </a>
        <div class="dashboard-support-stats" aria-label="More account details">
          ${metric("Wallet balance", NX.jod(wallet.balance), "wallet", "Available to spend", NX.page("user-wallet"))}
          ${metric("Completed desk days", completed, "desk", "Completed so far")}
          ${metric("Unread messages", unread, "inbox", unread ? "Waiting for you" : "All caught up", NX.page("user-messages"))}
        </div>
      </section>
      <section class="panel card dashboard-panel dashboard-quick-panel" aria-labelledby="quick-actions-heading">
        <div class="panel-h"><h2 id="quick-actions-heading">Quick actions</h2></div>
        <div class="dashboard-actions">
          <a class="btn btn-ghost btn-block" href="${NX.page("spaces")}">${NX.ic("desk")}<span>Book a desk</span></a>
          <a class="btn btn-ghost btn-block" href="${NX.page("user-matchmaking")}">${NX.ic("spark")}<span>Find an expert with AI</span></a>
          <a class="btn btn-ghost btn-block" href="${NX.page("services")}">${NX.ic("zap")}<span>Request a desk service</span></a>
          <a class="btn btn-ghost btn-block" href="${NX.page("user-wallet", { topup: 1 })}">${NX.ic("plus")}<span>Top up wallet</span></a>
        </div>
      </section>
      <section class="dashboard-charts" aria-label="Activity and spending charts">
        <article class="panel card dashboard-panel dashboard-chart-card" aria-labelledby="booking-chart-heading">
          <div class="panel-h"><div><h2 id="booking-chart-heading">Booking activity</h2><p class="dashboard-chart-caption">Desk bookings and expert sessions · last 6 months</p></div></div>
          <div class="dashboard-chart-wrap"><canvas id="bookingActivityChart" role="img" aria-label="Bookings by month for the last six months"></canvas></div>
        </article>
        <article class="panel card dashboard-panel dashboard-chart-card" aria-labelledby="spending-chart-heading">
          <div class="panel-h"><div><h2 id="spending-chart-heading">Monthly spending</h2><p class="dashboard-chart-caption">Wallet payments · JOD · last 6 months</p></div></div>
          <div class="dashboard-chart-wrap"><canvas id="monthlySpendingChart" role="img" aria-label="Wallet spending by month in Jordanian dinars for the last six months"></canvas></div>
        </article>
      </section>
      <div class="dashboard-layout">
        <div class="stack dashboard-main">
          <section class="panel card dashboard-booking-panel" aria-labelledby="next-up-heading">
            <div class="panel-h"><h2 id="next-up-heading">Next up</h2><a class="link" href="${NX.page("user-bookings")}">All bookings ${NX.ic("arrow-r")}</a></div>
            <div class="dashboard-bookings">
              ${next.length ? next.map(bookingItem).join("") : NX.empty("calendar", "Nothing planned", "Book a desk or an expert session to see it here.", `<a class="btn btn-primary" href="${NX.page("spaces")}">Browse spaces</a>`)}
            </div>
          </section>
          <section class="panel card dashboard-panel" id="revBox" aria-labelledby="reviews-heading">
            <div class="panel-h"><h2 id="reviews-heading">How was it?</h2></div>
            ${
              reviews.length
                ? reviews
                    .slice(0, 3)
                    .map(
                      (r, i) =>
                        `<div class="li"><div class="grow"><div class="t">${esc(r.title)}</div><div class="s">${r.kind === "space" ? "Desk booking" : "Expert session"} · ${NX.dateShort(r.date)}</div></div><button class="btn btn-primary btn-sm" data-rev="${i}" type="button">Review</button></div>`,
                    )
                    .join("")
                : '<p class="hint">You are all caught up — no completed bookings are waiting for feedback.</p>'
            }
          </section>
        </div>
        <div class="stack dashboard-side">
          <section class="panel card dashboard-panel" aria-labelledby="wallet-activity-heading">
            <div class="panel-h"><h2 id="wallet-activity-heading">Recent wallet activity</h2><a class="link" href="${NX.page("user-wallet")}">Wallet ${NX.ic("arrow-r")}</a></div>
            <div class="dashboard-transactions">
              ${
                wallet.transactions.length
                  ? wallet.transactions.slice(0, 4).map(transactionItem).join("")
                  : '<p class="hint">No transactions yet.</p>'
              }
            </div>
          </section>
        </div>
      </div>
      <p class="dashboard-demo-note">Demo data is shown for this session and is not synchronized across browsers.</p>`;
    if (window.Chart) {
      const styles = getComputedStyle(document.body);
      const textColor = styles.getPropertyValue("--muted").trim() || "#a9b1d6";
      const gridColor = styles.getPropertyValue("--line").trim() || "rgba(255,255,255,.09)";
      const accent = styles.getPropertyValue("--accent").trim() || "#29d6f0";
      const chartFont = styles.getPropertyValue("--f-body").trim() || "Inter, sans-serif";
      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: styles.getPropertyValue("--panel-2").trim() || "#141b40",
            titleColor: styles.getPropertyValue("--text").trim() || "#e9ecfb",
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 10,
            titleFont: { family: chartFont, weight: "600" },
            bodyFont: { family: chartFont },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor, font: { family: chartFont }, maxRotation: 0 } },
          y: { beginAtZero: true, border: { display: false }, grid: { color: gridColor, drawTicks: false }, ticks: { color: textColor, padding: 8, precision: 0, font: { family: chartFont } } },
        },
      };
      const bookingCanvas = document.getElementById("bookingActivityChart");
      const spendingCanvas = document.getElementById("monthlySpendingChart");
      if (bookingCanvas && !Chart.getChart(bookingCanvas)) {
        new Chart(bookingCanvas, {
          type: "bar",
          data: {
            labels: monthBuckets.map((month) => month.label),
            datasets: [{ label: "Bookings", data: monthBuckets.map((month) => month.bookings), backgroundColor: `${accent}b8`, hoverBackgroundColor: accent, borderRadius: 6, borderSkipped: false, maxBarThickness: 34 }],
          },
          options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, suggestedMax: Math.max(3, ...monthBuckets.map((month) => month.bookings)) } }, plugins: { ...commonOptions.plugins, tooltip: { ...commonOptions.plugins.tooltip, callbacks: { label: (context) => ` ${context.parsed.y} booking${context.parsed.y === 1 ? "" : "s"}` } } } },
        });
      }
      if (spendingCanvas && !Chart.getChart(spendingCanvas)) {
        const context = spendingCanvas.getContext("2d");
        const fill = context.createLinearGradient(0, 0, 0, 240);
        fill.addColorStop(0, `${accent}38`);
        fill.addColorStop(1, `${accent}00`);
        new Chart(spendingCanvas, {
          type: "line",
          data: {
            labels: monthBuckets.map((month) => month.label),
            datasets: [{ label: "Spending", data: monthBuckets.map((month) => Number(month.spending.toFixed(2))), borderColor: accent, backgroundColor: fill, fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: accent, pointBorderColor: styles.getPropertyValue("--panel").trim() || "#0e1430", pointBorderWidth: 2 }],
          },
          options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, precision: 2, callback: (value) => `${Number(value).toFixed(2)} JOD` } } }, plugins: { ...commonOptions.plugins, tooltip: { ...commonOptions.plugins.tooltip, callbacks: { label: (context) => ` ${Number(context.parsed.y).toFixed(2)} JOD` } } } },
        });
      }
    } else {
      document.querySelectorAll(".dashboard-chart-wrap").forEach((wrap) => {
        wrap.innerHTML = '<p class="dashboard-chart-unavailable">Charts could not load. Please check your connection and refresh.</p>';
      });
    }
    NX.observe();
    NX.$$("[data-rev]", pg).forEach((b) =>
      b.addEventListener("click", () => {
        const r = reviews[+b.dataset.rev];
        NX.Feedback.open(r, () => location.reload());
      }),
    );
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

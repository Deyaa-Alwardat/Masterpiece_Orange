
/* NEXUS — Expert Calendar */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;

  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-calendar",
    title: "Calendar",
    sub: "Manage your sessions and weekly availability.",
  });

  if (!pg) return;

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = [];

  for (let h = 8; h <= 20; h++) {
    ["00", "30"].forEach((m) => {
      if (h < 20 || m === "00") {
        HOURS.push(String(h).padStart(2, "0") + ":" + m);
      }
    });
  }

  let cursor = new Date();
  cursor.setDate(1);

  let selected = NX.todayISO;
  let consults = [];
  let ex = null;

  const iso = (d) =>
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");

  function getAvailability() {
    if (!ex.avail) {
      ex.avail = { days: [], times: [] };
    }

    if (!Array.isArray(ex.avail.days)) ex.avail.days = [];
    if (!Array.isArray(ex.avail.times)) ex.avail.times = [];

    return ex.avail;
  }

  function getModeName(mode) {
    if (typeof MODES !== "undefined" && MODES[mode]) {
      return MODES[mode].en || mode || "Consultation";
    }

    return mode || "Consultation";
  }

  function statusName(status) {
    const names = {
      confirmed: "Confirmed",
      requested: "Requested",
      completed: "Completed",
      cancelled: "Cancelled",
      declined: "Declined",
    };

    return names[String(status || "").toLowerCase()] || status || "Scheduled";
  }

  function dateLabel(date, options = {}) {
    return NX.fmtDate(date, options);
  }

  async function load() {
    const [expert, sessions] = await Promise.all([
      NX.Api.myExpert(),
      NX.Api.consults(),
    ]);

    ex = expert;
    consults = (Array.isArray(sessions) ? sessions : []).filter(
      (c) => !["cancelled", "declined"].includes(String(c.status).toLowerCase()),
    );

    getAvailability();
    draw();
  }

  function getSessionsForDay(date) {
    return consults
      .filter((c) => c.date === date)
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  }

  function countUpcoming() {
    return consults.filter(
      (c) =>
        c.date >= NX.todayISO &&
        !["completed", "cancelled", "declined"].includes(
          String(c.status).toLowerCase(),
        ),
    ).length;
  }

  function countPending() {
    return consults.filter(
      (c) => String(c.status).toLowerCase() === "requested",
    ).length;
  }

  function monthGrid() {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const availability = getAvailability();

    let cells = "";

    for (let i = 0; i < first; i++) {
      cells += '<span class="cal-cell blank" aria-hidden="true"></span>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key =
        y +
        "-" +
        String(m + 1).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0");

      const items = getSessionsForDay(key);
      const weekday = new Date(y, m, day).getDay();
      const off = !availability.days.includes(weekday);

      const classes = [
        "cal-cell",
        key === NX.todayISO ? "today" : "",
        key === selected ? "sel" : "",
        off ? "off" : "",
        items.length ? "has-sessions" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const dots = items
        .slice(0, 4)
        .map((c) => {
          const status = String(c.status || "").toLowerCase();
          const safeStatus = ["confirmed", "requested", "completed"].includes(status)
            ? status
            : "";

          return `<i class="${safeStatus}" title="${esc(statusName(status))}"></i>`;
        })
        .join("");

      cells += `
        <button
          type="button"
          class="${classes}"
          data-d="${key}"
          aria-pressed="${key === selected}"
          aria-label="${esc(dateLabel(key))}${items.length ? `, ${items.length} sessions` : ""}"
        >
          <b>${day}</b>
          ${items.length ? `<span class="cal-dots">${dots}</span>` : ""}
        </button>
      `;
    }

    return cells;
  }

  function sessionCard(c) {
    const mode = getModeName(c.mode);
    const topic = c.topic || "Consultation";
    const person = c.bookedBy || "Member";
    const status = String(c.status || "").toLowerCase();

    return `
      <article class="session-card">
        <div class="session-time">
          <strong>${esc(c.time || "—")}</strong>
          <span>${esc(statusName(status))}</span>
        </div>

        <div class="session-content">
          <p class="session-person">${esc(person)}</p>
          <p class="session-topic">${esc(topic)}</p>

          <div class="session-meta">
            <span class="session-mode">${esc(mode)}</span>
            ${NX.status(c.status)}
          </div>
        </div>
      </article>
    `;
  }

  function availabilityForm() {
    const availability = getAvailability();

    return `
      <div class="panel card">
        <div class="panel-h">
          <h3>Weekly availability</h3>
        </div>

        <p class="availability-intro">
          Choose the days and start times when members can book a session with you.
        </p>

        <form id="avForm" novalidate>
          <span class="lb">Days you work</span>

          <div class="chips">
            ${DAYS.map(
              (day, i) => `
                <label class="chip">
                  <input
                    type="checkbox"
                    name="day"
                    value="${i}"
                    ${availability.days.includes(i) ? "checked" : ""}
                  >
                  ${day}
                </label>
              `,
            ).join("")}
          </div>

          <div class="availability-divider"></div>

          <span class="lb">Session start times</span>

          <div class="chips">
            ${HOURS.map(
              (hour) => `
                <label class="chip">
                  <input
                    type="checkbox"
                    name="time"
                    value="${hour}"
                    ${availability.times.includes(hour) ? "checked" : ""}
                  >
                  ${hour}
                </label>
              `,
            ).join("")}
          </div>

          <div class="err" id="avErr" role="alert" aria-live="polite"></div>

          <div class="availability-actions">
            <button class="btn btn-primary btn-block" type="submit">
              Save availability
            </button>
          </div>

          <div class="availability-note">
            <span aria-hidden="true">ⓘ</span>
            <span>
              Your selected slots are offered to members for the next 7 days,
              excluding times already booked.
            </span>
          </div>
        </form>
      </div>
    `;
  }

  function draw() {
    const availability = getAvailability();

    const month = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(cursor);

    const dayItems = getSessionsForDay(selected);

    const todayItems = getSessionsForDay(NX.todayISO);
    const upcoming = countUpcoming();
    const pending = countPending();

    pg.innerHTML = `
      <div class="g-main">

        <section class="calendar-summary" aria-label="Session summary">
          <article class="calendar-stat">
            <span class="stat-label">Today's sessions</span>
            <strong class="stat-value purple">${todayItems.length}</strong>
            <span class="stat-note">Scheduled for today</span>
          </article>

          <article class="calendar-stat">
            <span class="stat-label">Upcoming sessions</span>
            <strong class="stat-value cyan">${upcoming}</strong>
            <span class="stat-note">Future sessions and confirmed bookings</span>
          </article>

          <article class="calendar-stat">
            <span class="stat-label">Pending requests</span>
            <strong class="stat-value amber">${pending}</strong>
            <span class="stat-note">Waiting for your response</span>
          </article>
        </section>

        <section class="panel card">
          <div class="panel-h">
            <div>
              <h2>Session calendar</h2>
              <p class="hint">Select a date to view its sessions.</p>
            </div>

            <div class="acts">
              <button
                class="icon-btn"
                id="prev"
                type="button"
                aria-label="Previous month"
              >
                ${NX.ic("arrow-l")}
              </button>

              <h3 style="min-width: 9rem; text-align: center;">
                ${month}
              </h3>

              <button
                class="icon-btn"
                id="next"
                type="button"
                aria-label="Next month"
              >
                ${NX.ic("arrow-r")}
              </button>

              <button class="btn btn-ghost btn-sm" id="today" type="button">
                Today
              </button>
            </div>
          </div>

          <div class="cal-head">
            ${DAYS.map((day) => `<span>${day}</span>`).join("")}
          </div>

          <div class="cal-grid" id="calGrid">
            ${monthGrid()}
          </div>

          <div class="cal-legend">
            <span><i class="confirmed"></i>Confirmed</span>
            <span><i class="requested"></i>Requested</span>
            <span><i class="completed"></i>Completed</span>
            <span class="hint">Dimmed days are outside your weekly availability.</span>
          </div>
        </section>

        <div class="stack">

          <section class="panel card">
            <div class="panel-h">
              <div>
                <h3>${esc(
                  dateLabel(selected, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }),
                )}</h3>
                <p class="hint">${dayItems.length} session${dayItems.length === 1 ? "" : "s"} scheduled</p>
              </div>
            </div>

            ${
              dayItems.length
                ? `<div class="session-list">${dayItems.map(sessionCard).join("")}</div>`
                : `
                  <div class="empty-state">
                    <div class="empty-icon" aria-hidden="true">◷</div>
                    <strong>No sessions scheduled</strong>
                    <p>
                      There are no sessions for this date.
                      Choose another day or update your availability.
                    </p>
                  </div>
                `
            }
          </section>

          ${availabilityForm()}

        </div>
      </div>
    `;

    NX.$("#prev").addEventListener("click", () => {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      draw();
    });

    NX.$("#next").addEventListener("click", () => {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      draw();
    });

    NX.$("#today").addEventListener("click", () => {
      cursor = new Date();
      cursor.setDate(1);
      selected = NX.todayISO;
      draw();
    });

    NX.$("#calGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-d]");

      if (!button) return;

      selected = button.dataset.d;
      draw();
    });

    NX.$("#avForm").addEventListener("submit", async (event) => {
      event.preventDefault();

      const days = NX.$$("[name=day]:checked", pg).map((input) => +input.value);
      const times = NX.$$("[name=time]:checked", pg).map((input) => input.value);
      const error = NX.$("#avErr");

      if (!days.length || !times.length) {
        error.textContent =
          "Choose at least one working day and one session start time.";
        return;
      }

      error.textContent = "";

      await NX.run(event.submitter, async () => {
        await NX.Api.saveAvailability({ days, times });

        NX.toast("Availability saved.");
        await load();
      });
    });
  }

  try {
    await load();
  } catch (error) {
    pg.innerHTML = NX.errorBox(error.message);
  }
});

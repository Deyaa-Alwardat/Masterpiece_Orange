/* NEXUS — Expert Meetings Controller */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;

  const pg = NX.Portal.init({
    role: "expert",
    page: "expert-meetings",
    title: "Meetings",
    sub: "Manage your client consultation sessions and launch live meetings.",
  });

  if (!pg) return;

  let consults = [];
  let expert = null;
  let activeTab = "upcoming";
  let searchQuery = "";

  async function load() {
    try {
      const [ex, list] = await Promise.all([
        NX.Api.myExpert(),
        NX.Api.consults(),
      ]);
      expert = ex;
      consults = list;
      render();
    } catch (err) {
      pg.innerHTML = NX.errorBox(err.message);
    }
  }

  function render() {
    const today = NX.todayISO;
    const requested = consults.filter((c) => c.status === "requested");
    const upcoming = consults.filter(
      (c) =>
        ["confirmed", "approved"].includes(c.status) &&
        c.date >= today,
    );
    const completed = consults.filter((c) => c.status === "completed");

    // Filter by active tab
    let filtered = [];
    if (activeTab === "upcoming") {
      filtered = upcoming;
    } else if (activeTab === "requests") {
      filtered = requested;
    } else if (activeTab === "completed") {
      filtered = completed;
    } else {
      filtered = consults;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.bookedBy && c.bookedBy.toLowerCase().includes(q)) ||
          (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
          (c.topic && c.topic.toLowerCase().includes(q)) ||
          (c.id && c.id.toLowerCase().includes(q)),
      );
    }

    pg.innerHTML = `
      <div class="meetings-layout">
        <section class="meetings-stats" aria-label="Meeting Overview">
          <div class="meetings-stat-card">
            <span class="stat-icon">${NX.ic("calendar")}</span>
            <div class="stat-meta">
              <span class="stat-val">${upcoming.length}</span>
              <span class="stat-lbl">Upcoming Sessions</span>
            </div>
          </div>
          <div class="meetings-stat-card">
            <span class="stat-icon">${NX.ic("clock")}</span>
            <div class="stat-meta">
              <span class="stat-val">${requested.length}</span>
              <span class="stat-lbl">Pending Requests</span>
            </div>
          </div>
          <div class="meetings-stat-card">
            <span class="stat-icon">${NX.ic("check")}</span>
            <div class="stat-meta">
              <span class="stat-val">${completed.length}</span>
              <span class="stat-lbl">Completed</span>
            </div>
          </div>
          <div class="meetings-stat-card">
            <span class="stat-icon">${NX.ic("wallet")}</span>
            <div class="stat-meta">
              <span class="stat-val">${NX.jod(
                completed.reduce((sum, c) => sum + (c.baseFee || c.fee || 0), 0),
              )}</span>
              <span class="stat-lbl">Session Earnings</span>
            </div>
          </div>
        </section>

        <div class="panel card">
          <div class="panel-h">
            <div class="tabs" role="tablist" style="margin:0">
              <button class="tab" type="button" role="tab" data-tab="upcoming" aria-selected="${activeTab === "upcoming"}">Upcoming <span class="n">${upcoming.length}</span></button>
              <button class="tab" type="button" role="tab" data-tab="requests" aria-selected="${activeTab === "requests"}">Requests <span class="n">${requested.length}</span></button>
              <button class="tab" type="button" role="tab" data-tab="completed" aria-selected="${activeTab === "completed"}">Completed <span class="n">${completed.length}</span></button>
              <button class="tab" type="button" role="tab" data-tab="all" aria-selected="${activeTab === "all"}">All History <span class="n">${consults.length}</span></button>
            </div>
          </div>

          <div class="meetings-filter-bar">
            <div class="meetings-search-box">
              ${NX.ic("search")}
              <input type="search" id="meetingSearch" placeholder="Filter by client, email, or topic…" value="${esc(searchQuery)}" autocomplete="off">
            </div>
            <span class="hint">${filtered.length} session${filtered.length === 1 ? "" : "s"} shown</span>
          </div>

          <div class="meetings-list">
            ${
              filtered.length
                ? filtered.map((c) => renderMeetingCard(c)).join("")
                : NX.empty("video", "No sessions found", activeTab === "requests" ? "You have no new session requests waiting for review." : "No meetings match your selected filter.")
            }
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderMeetingCard(c) {
    const modes = (NX.MODES || (typeof MODES !== "undefined" ? MODES : {}));
    const modeInfo = modes[c.mode] || { en: c.mode || "Session", icon: "video" };
    const clientName = c.bookedBy || c.userEmail || "Client";
    const jitsiRoomUrl = `https://meet.jit.si/nexus-session-${c.id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    return `
      <article class="meeting-card" data-id="${esc(c.id)}">
        <div class="meeting-header">
          <div class="client-info">
            ${NX.avatar(clientName, 44)}
            <div class="client-meta">
              <h3>${esc(clientName)}</h3>
              <p>${esc(c.userEmail || "")}</p>
            </div>
          </div>
          <div class="meeting-badges">
            <span class="mode-badge">${NX.ic(modeInfo.icon || "video")} ${esc(modeInfo.en)}</span>
            ${NX.status(c.status)}
            <span class="hint">Ref: ${esc(c.id)}</span>
          </div>
        </div>

        <div class="meeting-body">
          <div class="meeting-detail-item">
            <span class="detail-label">Date & Time</span>
            <span class="detail-value">${NX.fmtDate(c.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${esc(c.time || "10:00")}</span>
          </div>
          <div class="meeting-detail-item">
            <span class="detail-label">Session Fee</span>
            <span class="detail-value">${NX.jod(c.fee)} <small class="hint">(Net: ${NX.jod(c.baseFee || c.fee)})</small></span>
          </div>
          <div class="meeting-detail-item">
            <span class="detail-label">Payment Status</span>
            <span class="detail-value">${NX.status(c.paymentStatus || "not_started")}</span>
          </div>
          ${
            c.spaceName
              ? `<div class="meeting-detail-item"><span class="detail-label">Location</span><span class="detail-value">${esc(c.spaceName)}</span></div>`
              : ""
          }
          <div class="meeting-topic">
            <span class="detail-label">Topic</span>
            <p style="margin:0.25rem 0 0 0; color:var(--text); font-weight:500;">${esc(c.topic || "General Consultation")}</p>
            ${c.notes ? `<p class="hint" style="margin:0.2rem 0 0 0;">Note: ${esc(c.notes)}</p>` : ""}
          </div>
        </div>

        <div class="meeting-footer">
          <div class="video-notice">
            ${
              c.mode === "online" && c.status === "confirmed"
                ? `<span>${NX.ic("video")} Public Jitsi Meet demo room available</span>`
                : ""
            }
          </div>
          <div class="meeting-actions">
            <button class="btn btn-ghost btn-sm" data-action="details" data-id="${esc(c.id)}" type="button">Details</button>
            ${
              c.status === "requested"
                ? `
                  <button class="btn btn-primary btn-sm" data-action="approve" data-id="${esc(c.id)}" type="button">Approve</button>
                  <button class="btn btn-ghost btn-sm" data-action="decline" data-id="${esc(c.id)}" type="button">Decline</button>
                `
                : ""
            }
            ${
              c.status === "confirmed" && c.mode === "online"
                ? `
                  <a class="btn btn-primary btn-sm" href="${jitsiRoomUrl}" target="_blank" rel="noopener noreferrer">${NX.ic("video")}<span>Join meeting (Jitsi)</span></a>
                  <button class="btn btn-ghost btn-sm" data-action="complete" data-id="${esc(c.id)}" type="button">Mark completed</button>
                  <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${esc(c.id)}" type="button">Cancel</button>
                `
                : c.status === "confirmed"
                  ? `
                    <button class="btn btn-primary btn-sm" data-action="complete" data-id="${esc(c.id)}" type="button">Mark completed</button>
                    <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${esc(c.id)}" type="button">Cancel</button>
                  `
                  : ""
            }
            ${
              c.status === "approved"
                ? `
                  <span class="hint" style="font-size:0.8rem">Awaiting client payment</span>
                  <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${esc(c.id)}" type="button">Cancel</button>
                `
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }

  function bindEvents() {
    // Tabs
    NX.$$(".tab", pg).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    // Search input
    const searchInput = NX.$("#meetingSearch", pg);
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        // Restore focus to input
        const newInp = NX.$("#meetingSearch", pg);
        if (newInp) {
          newInp.focus();
          newInp.setSelectionRange(newInp.value.length, newInp.value.length);
        }
      });
    }

    // Actions
    NX.$$("[data-action]", pg).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const session = consults.find((c) => c.id === id);
        if (!session) return;

        if (action === "approve") {
          await NX.run(btn, async () => {
            await NX.Api.setConsultStatus(id, "approved");
            NX.toast("Session request approved. The member can now complete payment.");
            await load();
          });
        } else if (action === "decline") {
          const ok = await NX.confirm(
            "Decline session request",
            `Are you sure you want to decline the session with ${session.bookedBy || session.userEmail}?`,
            "Decline request",
            true,
          );
          if (ok) {
            await NX.run(btn, async () => {
              await NX.Api.setConsultStatus(id, "declined");
              NX.toast("Session declined.");
              await load();
            });
          }
        } else if (action === "complete") {
          const ok = await NX.confirm(
            "Mark session completed",
            "This confirms the consultation was conducted and updates records.",
            "Complete session",
          );
          if (ok) {
            await NX.run(btn, async () => {
              await NX.Api.setConsultStatus(id, "completed");
              NX.toast("Session marked as completed.");
              await load();
            });
          }
        } else if (action === "cancel") {
          const ok = await NX.confirm(
            "Cancel session",
            "Are you sure you want to cancel this scheduled consultation?",
            "Cancel session",
            true,
          );
          if (ok) {
            await NX.run(btn, async () => {
              await NX.Api.setConsultStatus(id, "cancelled");
              NX.toast("Session cancelled.");
              await load();
            });
          }
        } else if (action === "details") {
          showSessionModal(session);
        }
      });
    });
  }

  function showSessionModal(c) {
    const modes = (NX.MODES || (typeof MODES !== "undefined" ? MODES : {}));
    const modeInfo = modes[c.mode] || { en: c.mode || "Session", icon: "video" };
    const jitsiRoomUrl = `https://meet.jit.si/nexus-session-${c.id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    NX.dlg.open(`
      ${NX.dlg.head("Session Details", `Reference: ${esc(c.id)}`)}
      <div class="dlg-b">
        <div class="row"><span>Client</span><b>${esc(c.bookedBy || c.userEmail)}</b></div>
        <div class="row"><span>Email</span><b>${esc(c.userEmail || "—")}</b></div>
        <div class="row"><span>Date & Time</span><b>${NX.fmtDate(c.date)} at ${esc(c.time || "10:00")}</b></div>
        <div class="row"><span>Type</span><b>${esc(modeInfo.en)}</b></div>
        <div class="row"><span>Status</span><b>${NX.status(c.status)}</b></div>
        <div class="row"><span>Payment</span><b>${NX.status(c.paymentStatus || "not_started")}</b></div>
        <div class="row"><span>Total fee</span><b>${NX.jod(c.fee)}</b></div>
        <div class="row"><span>Your earnings</span><b>${NX.jod(c.baseFee || c.fee)}</b></div>
        ${c.spaceName ? `<div class="row"><span>Workspace</span><b>${esc(c.spaceName)}</b></div>` : ""}
        <div class="stack" style="margin-top:1rem">
          <label class="sr" for="modalTopic">Topic</label>
          <div class="field"><span class="lb">Topic</span><p style="margin:0.25rem 0 0 0;color:var(--text);">${esc(c.topic || "General Discussion")}</p></div>
          ${c.notes ? `<div class="field"><span class="lb">Client notes</span><p class="hint" style="margin:0.25rem 0 0 0;">${esc(c.notes)}</p></div>` : ""}
        </div>
        ${
          c.mode === "online" && c.status === "confirmed"
            ? `
              <div class="banner" style="margin-top:1rem">
                ${NX.ic("video")}
                <div>
                  <b>Live Meeting Link</b>
                  <p class="hint" style="margin:0.2rem 0 0 0">Free public room provided via Jitsi Meet. Opens in new tab without registration.</p>
                  <a class="btn btn-primary btn-sm" href="${jitsiRoomUrl}" target="_blank" rel="noopener noreferrer" style="margin-top:0.5rem">Launch Jitsi Room</a>
                </div>
              </div>
            `
            : ""
        }
        <div class="dlg-actions">
          <button class="btn btn-ghost" type="button" data-close>Close</button>
        </div>
      </div>
    `);
  }

  load();
});

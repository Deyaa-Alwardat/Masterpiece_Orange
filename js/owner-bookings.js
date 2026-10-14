/* NEXUS — owner: bookings & reservations */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-bookings",
    title: "Bookings & reservations",
    sub: "Confirm, complete or cancel reservations for your spaces.",
  });
  if (!pg) return;
  let list = [];
  let f = { q: "", status: "", space: "", when: "" };

  async function load() {
    list = await NX.Api.bookings();
    draw();
  }
  function draw() {
    const spaces = [...new Map(list.map((b) => [b.spaceId, b.spaceName])).entries()];
    const rows = list.filter((b) => {
      const hay = (b.id + " " + b.bookedBy + " " + b.spaceName).toLowerCase();
      return (
        (!f.q || hay.includes(f.q)) &&
        (!f.status || b.status === f.status) &&
        (!f.space || b.spaceId === f.space) &&
        (!f.when || (f.when === "upcoming" ? b.date >= NX.todayISO : b.date < NX.todayISO))
      );
    });
    const pend = list.filter((b) => b.status === "pending").length;
    pg.innerHTML = `
      ${pend ? `<div class="banner info">${NX.ic("clock")}<span>${pend} reservation${pend > 1 ? "s are" : " is"} waiting for your confirmation.</span></div>` : ""}
      <div class="toolbar">
        <div class="grow"><label class="sr" for="oq">Search</label>${NX.ic("search")}<input id="oq" type="search" placeholder="Search guest, space or ID…" value="${esc(f.q)}"></div>
        <select id="os" aria-label="Space"><option value="">All spaces</option>${spaces.map(([id, n]) => `<option value="${id}"${f.space === id ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <select id="ost" aria-label="Status"><option value="">All statuses</option>${["pending", "confirmed", "completed", "cancelled"].map((s) => `<option value="${s}"${f.status === s ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select>
        <select id="ow" aria-label="When"><option value="">Any date</option><option value="upcoming"${f.when === "upcoming" ? " selected" : ""}>Upcoming</option><option value="past"${f.when === "past" ? " selected" : ""}>Past</option></select>
        <button class="btn btn-ghost" id="ocsv" type="button">${NX.ic("download")}<span>Export CSV</span></button>
      </div>
      <div class="panel card">${
        rows.length
          ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Guest</th><th>Date</th><th>Desks</th><th>Status</th><th class="num">Net</th><th></th></tr></thead><tbody>
        ${rows
          .map(
            (
              b,
            ) => `<tr><td><b>${esc(b.spaceName)}</b><small class="cell-sub">${esc(b.id)}</small></td><td><div class="who">${NX.avatar(b.bookedBy)}<span>${esc(b.bookedBy)}${b.companyId ? "<small>Company booking</small>" : ""}</span></div></td><td>${NX.dateShort(b.date)}</td><td>${esc(b.deskIds.join(", "))}</td><td>${NX.status(b.status)}</td><td class="num">${NX.jod(b.fee - b.cut)}</td>
          <td><div class="acts">
            ${b.status === "pending" ? `<button class="btn btn-primary btn-sm" data-a="confirmed" data-id="${b.id}" type="button">Confirm</button>` : ""}
            ${b.status === "confirmed" && b.date <= NX.todayISO ? `<button class="btn btn-ghost btn-sm" data-a="completed" data-id="${b.id}" type="button">Complete</button>` : ""}
            ${["pending", "confirmed"].includes(b.status) ? `<button class="btn btn-danger btn-sm" data-a="cancelled" data-id="${b.id}" type="button">Cancel</button>` : ""}
            <a class="btn btn-ghost btn-sm" href="${NX.page("owner-messages", { to: b.userEmail, subject: "Booking " + b.id })}" aria-label="Message ${esc(b.bookedBy)}">${NX.ic("inbox")}</a></div></td></tr>`,
          )
          .join("")}
      </tbody></table></div>`
          : list.length
            ? NX.empty("filter", "No bookings match", "Clear the filters to see everything.")
            : NX.empty(
                "calendar",
                "No reservations yet",
                "Bookings for your spaces will appear here.",
              )
      }</div>`;
    NX.$("#oq").addEventListener("input", (e) => {
      f.q = e.target.value.trim().toLowerCase();
      draw();
      const i = NX.$("#oq");
      i.focus();
      i.setSelectionRange(f.q.length, f.q.length);
    });
    NX.$("#os").addEventListener("change", (e) => {
      f.space = e.target.value;
      draw();
    });
    NX.$("#ost").addEventListener("change", (e) => {
      f.status = e.target.value;
      draw();
    });
    NX.$("#ow").addEventListener("change", (e) => {
      f.when = e.target.value;
      draw();
    });
    NX.$("#ocsv").addEventListener("click", () =>
      NX.csv(
        "nexus-reservations.csv",
        [["ID", "Space", "Guest", "Date", "Desks", "Status", "Net (JOD)"]].concat(
          rows.map((b) => [
            b.id,
            b.spaceName,
            b.bookedBy,
            b.date,
            b.deskIds.join(" "),
            b.status,
            b.fee - b.cut,
          ]),
        ),
      ),
    );
    NX.$$("[data-a]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        if (
          b.dataset.a === "cancelled" &&
          !(await NX.confirm(
            "Cancel this reservation?",
            "The guest is refunded in full and the desks are released.",
            "Cancel reservation",
            true,
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.setBookingStatus(b.dataset.id, b.dataset.a);
          NX.toast("Reservation updated.");
          await load();
        });
      }),
    );
  }
  try {
    await load();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

/* NEXUS — owner dashboard */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const user = NX.Auth.user();
  const pg = NX.Portal.init({
    role: "owner",
    page: "owner-dashboard",
    title: "Owner dashboard",
    sub: user ? "Welcome, " + user.name.split(" ")[0] + ". Here is how your spaces are doing." : "",
    actions: `<a class="btn btn-primary" href="${NX.page("owner-inventory", { add: 1 })}">${NX.ic("plus")}<span>Add a space</span></a>`,
  });
  if (!pg) return;

  async function draw() {
    const [spaces, bookings, earn] = await Promise.all([
      NX.Api.mySpaces(),
      NX.Api.bookings(),
      NX.Api.earnings(),
    ]);
    const ids = spaces.map((s) => s.id);
    const live = spaces.filter((s) => s.status === "approved" && !s.paused);
    const tickets = (await Promise.all(ids.map((id) => NX.Api.tickets({ spaceId: id }))))
      .flat()
      .filter((t) => t.status !== "done");
    const totalDesks = live.reduce((a, s) => a + s.desks.filter((d) => !d.blocked).length, 0);
    const busy = live.reduce((a, s) => a + s.desks.filter((d) => d.busy && !d.blocked).length, 0);
    const occ = totalDesks ? Math.round((busy / totalDesks) * 100) : 0;
    const monthKey = NX.todayISO.slice(0, 7);
    const mine = bookings.filter((b) => b.status !== "cancelled");
    const thisMonth = mine.filter((b) => b.date.startsWith(monthKey));
    const pending = bookings.filter((b) => b.status === "pending");
    const today = bookings.filter((b) => b.date === NX.todayISO && b.status === "confirmed");
    const months = NX.lastMonths(6).map((m) => ({
      label: m.label,
      value: NX.sum(
        mine.filter((b) => b.date.startsWith(m.key) && b.status !== "pending"),
        (b) => b.fee - b.cut,
      ),
    }));
    const waiting = spaces.filter((s) => s.status === "pending");
    const spaceBanner = waiting.length
      ? `<div class="banner">${NX.ic("clock")}<span><b>${waiting.map((s) => esc(s.name)).join(", ")}</b> ${waiting.length > 1 ? "are" : "is"} waiting for admin approval before ${waiting.length > 1 ? "they appear" : "it appears"} in search.</span></div>`
      : "";

    pg.innerHTML = `${spaceBanner}
      <div class="g4">
        ${NX.statCard("Occupancy today", occ, { icon: "desk", suffix: "%", sub: busy + " of " + totalDesks + " desks taken" })}
        ${NX.statCard("Bookings this month", thisMonth.length, { icon: "calendar", sub: "Across " + live.length + " live space" + (live.length === 1 ? "" : "s") })}
        ${NX.statCard("Net revenue (all time)", earn.earned + earn.upcoming, { icon: "wallet", money: true, sub: "After platform fees" })}
        ${NX.statCard("Needs your answer", pending.length, { icon: "clock", sub: "Pending reservations", cls: pending.length ? "warn" : "" })}
      </div>
      <div class="g-main mt">
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Net revenue</h2><span class="sub">Last 6 months, JOD</span></div>${NX.bars(months, { label: "Net revenue per month", fmt: NX.jod })}</div>
          <div class="panel card"><div class="panel-h"><h2>Pending reservations</h2><a class="link" href="${NX.page("owner-bookings")}">All bookings ${NX.ic("arrow-r")}</a></div>
            ${
              pending.length
                ? pending
                    .slice(0, 5)
                    .map(
                      (b) =>
                        `<div class="li">${NX.dayBox(b.date)}<div class="grow"><div class="t">${esc(b.spaceName)} · ${esc(b.deskIds.join(", "))}</div><div class="s">${esc(b.bookedBy)} · ${NX.jod(b.fee)}</div></div><span class="acts"><button class="btn btn-primary btn-sm" data-bk="confirmed" data-id="${b.id}" type="button">Confirm</button><button class="btn btn-danger btn-sm" data-bk="cancelled" data-id="${b.id}" type="button">Decline</button></span></div>`,
                    )
                    .join("")
                : '<p class="hint">Nothing waiting — new reservations are confirmed instantly or listed here.</p>'
            }
          </div>
        </div>
        <div class="stack">
          <div class="panel card"><div class="panel-h"><h2>Today</h2></div>
            ${today.length ? today.map((b) => `<div class="li"><div class="grow"><div class="t">${esc(b.bookedBy)}</div><div class="s">${esc(b.spaceName)} · desks ${esc(b.deskIds.join(", "))}</div></div><button class="btn btn-ghost btn-sm" data-bk="completed" data-id="${b.id}" type="button">Check out</button></div>`).join("") : '<p class="hint">No guests expected today.</p>'}
          </div>
          <div class="panel card"><div class="panel-h"><h2>Service requests</h2><span class="sub">${tickets.length} open</span></div>
            ${
              tickets.length
                ? tickets
                    .slice(0, 5)
                    .map(
                      (t) =>
                        `<div class="li"><div class="grow"><div class="t">${esc(SERVICES[t.type].en)} · desk ${esc(t.deskId)}</div><div class="s">${esc(spaceNameOf(t.spaceId))}${t.note ? " · " + esc(t.note) : ""}</div></div><button class="btn btn-ghost btn-sm" data-tk="${t.id}" data-st="${t.status}" type="button">${t.status === "new" ? "Start" : "Done"}</button></div>`,
                    )
                    .join("")
                : '<p class="hint">No open service requests.</p>'
            }
          </div>
        </div>
      </div>`;
    function spaceNameOf(id) {
      const s = spaces.find((x) => x.id === id);
      return s ? s.name : "";
    }
    NX.observe();
    NX.$$("[data-bk]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        if (
          b.dataset.bk === "cancelled" &&
          !(await NX.confirm(
            "Decline this reservation?",
            "The guest is refunded in full.",
            "Decline",
            true,
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.setBookingStatus(b.dataset.id, b.dataset.bk);
          NX.toast("Reservation updated.");
          await draw();
        });
      }),
    );
    NX.$$("[data-tk]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        await NX.run(b, async () => {
          await NX.Api.setTicketStatus(+b.dataset.tk, b.dataset.st === "new" ? "progress" : "done");
          await draw();
        });
      }),
    );
  }
  try {
    await draw();
  } catch (e) {
    pg.innerHTML = NX.errorBox(e.message);
  }
});

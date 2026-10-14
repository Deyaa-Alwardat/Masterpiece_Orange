/* NEXUS — admin management: members, experts, owners, companies, spaces, support */
document.addEventListener("DOMContentLoaded", async () => {
  const NX = window.NX;
  const esc = NX.esc;
  const pg = NX.Portal.init({
    role: "admin",
    page: "admin-management",
    title: "Management",
    sub: "Suspend or restore accounts and listings, and answer support requests.",
  });
  if (!pg) return;
  const TABS = [
    ["members", "Members", "users"],
    ["experts", "Experts", "briefcase"],
    ["owners", "Owners", "building"],
    ["companies", "Companies", "layers"],
    ["spaces", "Spaces", "desk"],
    ["support", "Support", "help"],
  ];
  let tab = TABS.some((t) => t[0] === NX.qs("tab")) ? NX.qs("tab") : "members";
  let q = "";

  async function draw() {
    pg.innerHTML = `<div class="tabs" role="tablist">${TABS.map(([k, l, i]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${tab === k}">${NX.ic(i)} ${l}</button>`).join("")}</div><div id="tb">${NX.skeleton(2)}</div>`;
    NX.$$(".tab", pg).forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        q = "";
        draw();
      }),
    );
    if (tab === "support") return support(NX.$("#tb"));
    const rows = await NX.Api.adminAccounts(tab);
    const me = NX.Auth.user();
    const list = rows.filter(
      (r) => !q || (r.name + " " + r.email + " " + r.sub).toLowerCase().includes(q),
    );
    NX.$("#tb").innerHTML = `
      <div class="toolbar"><div class="grow"><label class="sr" for="mq">Search</label>${NX.ic("search")}<input id="mq" type="search" placeholder="Search name, email or detail…" value="${esc(q)}"></div><span class="hint">${list.length} of ${rows.length}</span></div>
      <div class="panel card">${
        list.length
          ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Contact</th><th>Status</th><th>Joined</th><th></th></tr></thead><tbody>
        ${list
          .map(
            (
              r,
            ) => `<tr><td><div class="who">${NX.avatar(r.name)}<span>${esc(r.name)}<small>${esc(r.sub)}</small></span></div></td><td>${esc(r.email || "—")}</td><td>${NX.status(r.status)}</td><td>${r.created ? NX.dshort(r.created) : "—"}</td>
          <td><div class="acts">${r.status === "active" ? `<button class="btn btn-danger btn-sm" data-s="${tab === "spaces" ? "paused" : "suspended"}" data-id="${r.id}" type="button">${tab === "spaces" ? "Pause" : "Suspend"}</button>` : ["suspended", "paused"].includes(r.status) ? `<button class="btn btn-ghost btn-sm" data-s="active" data-id="${r.id}" type="button">Restore</button>` : `<a class="btn btn-ghost btn-sm" href="${NX.page("admin-approvals")}">Review</a>`}
</div></td></tr>`,
          )
          .join("")}
      </tbody></table></div>`
          : NX.empty("search", "Nothing found", "Try another search.")
      }</div>`;
    NX.$("#mq").addEventListener("input", (e) => {
      q = e.target.value.trim().toLowerCase();
      draw().then(() => {
        const i = NX.$("#mq");
        i.focus();
        i.setSelectionRange(q.length, q.length);
      });
    });
    NX.$$("[data-s]", pg).forEach((b) =>
      b.addEventListener("click", async () => {
        const st = b.dataset.s;
        if (
          st !== "active" &&
          !(await NX.confirm(
            (st === "paused" ? "Pause" : "Suspend") + " this " + tab.replace(/s$/, "") + "?",
            st === "paused"
              ? "The space disappears from search until restored."
              : "They will not be able to sign in or appear in listings until restored.",
            st === "paused" ? "Pause" : "Suspend",
            true,
          ))
        )
          return;
        await NX.run(b, async () => {
          await NX.Api.setAccountStatus(tab, b.dataset.id, st);
          NX.toast("Updated.");
          await draw();
        });
      }),
    );
  }

  async function support(tb) {
    const list = await NX.Api.supportList();
    tb.innerHTML = `<div class="panel card">${list.length ? list.map((s) => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t" style="white-space:normal">${esc(s.subject)}</div><div class="s" style="white-space:normal">${esc(s.message)}</div><div class="s">${esc(s.name)} (${esc(NX.ROLES[s.role].label)}) · ${esc(s.category)} · ${NX.dshort(s.at)}</div>${s.reply ? `<div class="banner ok" style="margin:.6rem 0 0">${NX.ic("mail")}<span>${esc(s.reply)}</span></div>` : ""}</div>${NX.status(s.status)}${s.status === "open" ? `<button class="btn btn-primary btn-sm" data-rep="${s.id}" type="button">Reply</button>` : ""}</div>`).join("") : NX.empty("help", "No support requests", "Requests from members appear here.")}</div>`;
    NX.$$("[data-rep]", tb).forEach((b) =>
      b.addEventListener("click", () => {
        const s = list.find((x) => x.id === b.dataset.rep);
        NX.dlg.open(
          `${NX.dlg.head("Reply to " + esc(s.name), esc(s.subject))}<form class="dlg-b" id="rf" novalidate>${NX.field("rt", "Your reply", '<textarea id="rt" rows="4" maxlength="600"></textarea>')}<div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Send &amp; resolve</button></div></form>`,
        );
        NX.$("#rf").addEventListener("submit", async (e) => {
          e.preventDefault();
          const t = NX.$("#rt");
          if (!NX.fieldErr(t, t.value.trim().length < 3 ? "Write a reply." : "")) return;
          await NX.run(e.submitter, async () => {
            await NX.Api.replySupport(s.id, t.value);
            NX.dlg.close();
            NX.toast("Reply sent.");
            await draw();
          });
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

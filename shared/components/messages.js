/* NEXUS — shared component: inbox & messages (used by user, expert, owner and company portals).
   NX.Messages.mount(root) renders a two-pane inbox. Deep links: ?t=<threadId> opens a thread,
   ?to=<email>&subject=<text> opens the "new message" dialog pre-filled. */
(function () {
  "use strict";
  const NX = window.NX;
  const esc = NX.esc;

  const ROLE_TAG = {
    user: "Member",
    expert: "Expert",
    owner: "Owner",
    company: "Company",
    admin: "Support",
  };

  NX.Messages = {
    async mount(root) {
      const me = NX.Auth.user();
      let threads = [];
      let activeId = NX.qs("t");
      let filter = "";
      const returnTo = (() => {
        const target = NX.qs("returnTo");
        if (!target) return "";
        const url = new URL(target, location.href);
        if (
          url.protocol !== location.protocol ||
          url.pathname !== new URL("space.html", location.href).pathname ||
          !url.searchParams.has("id") ||
          url.hash
        )
          return "";
        return url.href;
      })();

      root.innerHTML = `
        <div class="msgs card">
          <aside class="msg-list" id="msgList">
            <div class="msg-search"><svg class="i" aria-hidden="true"><use href="#i-search"/></svg><input id="msgQ" type="search" placeholder="Search conversations…" aria-label="Search conversations" autocomplete="off"></div>
            <div class="msg-items" id="msgItems">${NX.skeleton(3)}</div>
            <button class="btn btn-primary btn-block" id="msgNew" type="button">${NX.ic("plus")}<span>New message</span></button>
          </aside>
          <section class="msg-pane" id="msgPane"></section>
        </div>
        <p class="hint msg-note">Demo inbox: conversations stay available in this browser tab session only. They are not sent to a live server.</p>`;
      const items = NX.$("#msgItems", root);
      const pane = NX.$("#msgPane", root);
      const wrap = NX.$(".msgs", root);

      const otherName = (t) => (t.other[0] ? t.other[0].name : "Unknown");

      async function load() {
        threads = await NX.Api.threads();
        drawList();
        drawPane();
        if (NX.Portal && NX.Portal.refreshBadges) NX.Portal.refreshBadges();
      }

      function drawList() {
        const list = threads.filter((t) => {
          const h = (
            otherName(t) +
            " " +
            t.subject +
            " " +
            (t.last ? t.last.text : "")
          ).toLowerCase();
          return !filter || h.includes(filter);
        });
        if (!threads.length) {
          items.innerHTML = NX.empty(
            "inbox",
            "No conversations yet",
            "Start one with the button below.",
          );
          return;
        }
        if (!list.length) {
          items.innerHTML = `<p class="hint" style="padding:1rem">No conversation matches “${esc(filter)}”.</p>`;
          return;
        }
        items.innerHTML = list
          .map(
            (
              t,
            ) => `<button class="msg-item${t.id === activeId ? " on" : ""}${t.unread ? " unread" : ""}" data-id="${t.id}" type="button">
              ${NX.avatar(otherName(t))}
              <span class="mi-t"><b>${esc(otherName(t))}</b><span class="mi-sub">${esc(t.subject)}</span><span class="mi-last">${esc(t.last.from === me.email ? "You: " : "")}${esc(t.last.text)}</span></span>
              <span class="mi-meta"><time>${NX.ago(t.last.at)}</time>${t.unread ? `<b class="side-badge">${t.unread}</b>` : ""}</span>
            </button>`,
          )
          .join("");
      }

      function drawPane() {
        const t = threads.find((x) => x.id === activeId);
        wrap.classList.toggle("has-thread", !!t);
        if (!t) {
          pane.innerHTML = `<div class="msg-empty">${NX.ic("inbox")}<h3>Select a conversation</h3><p>Pick one from the list or start a new message.</p></div>`;
          return;
        }
        const other = t.other[0] || { name: "Unknown", role: "" };
        let day = "";
        const bubbles = t.messages
          .map((m) => {
            const d = new Date(m.at).toDateString();
            const sep = d !== day ? `<div class="msg-day">${NX.dshort(m.at)}</div>` : "";
            day = d;
            const mine = m.from === me.email;
            return `${sep}<div class="bub ${mine ? "me" : "them"}"><p>${esc(m.text)}</p><time>${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.at))}</time></div>`;
          })
          .join("");
        pane.innerHTML = `
          <header class="msg-head">
            <button class="icon-btn msg-back" id="msgBack" type="button" aria-label="Back to conversations">${NX.ic("arrow-l")}</button>
            ${NX.avatar(other.name)}
            <div><b>${esc(other.name)}</b><span class="hint">${esc(ROLE_TAG[other.role] || "")} · ${esc(t.subject)}</span></div>
          </header>
          <div class="msg-body" id="msgBody">${bubbles}</div>
          <form class="msg-form" id="msgForm" novalidate>
            <label class="sr" for="msgText">Message</label>
            <textarea id="msgText" rows="1" maxlength="1500" placeholder="Write a message…"></textarea>
            <button class="btn btn-primary" type="submit" aria-label="Send">${NX.ic("send")}<span>Send</span></button>
          </form>
          <div class="err" id="msgErr" role="alert"></div>`;
        const body = NX.$("#msgBody", pane);
        body.scrollTop = body.scrollHeight;
        NX.$("#msgBack", pane).addEventListener("click", () => {
          activeId = null;
          drawList();
          drawPane();
        });
        const ta = NX.$("#msgText", pane);
        ta.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            NX.$("#msgForm", pane).requestSubmit();
          }
        });
        NX.$("#msgForm", pane).addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = e.submitter || NX.$("button", e.target);
          const text = ta.value;
          try {
            await NX.run(btn, async () => {
              await NX.Api.sendMessage(t.id, text);
              await load();
              const nb = NX.$("#msgBody", pane);
              if (nb) nb.scrollTop = nb.scrollHeight;
            });
          } catch (er) {
            NX.$("#msgErr", pane).textContent = er.message;
          }
        });
        if (t.unread)
          NX.Api.markRead(t.id).then(() => {
            t.unread = 0;
            drawList();
            if (NX.Portal && NX.Portal.refreshBadges) NX.Portal.refreshBadges();
          });
      }

      items.addEventListener("click", (e) => {
        const b = e.target.closest(".msg-item");
        if (!b) return;
        activeId = b.dataset.id;
        history.replaceState(null, "", "?t=" + activeId);
        drawList();
        drawPane();
      });
      NX.$("#msgQ", root).addEventListener("input", (e) => {
        filter = e.target.value.trim().toLowerCase();
        drawList();
      });

      async function newDialog(pre) {
        const contacts = await NX.Api.contacts();
        if (!contacts.length) {
          NX.toast("You have no contacts to message yet — book a space or a session first.", true);
          return;
        }
        NX.dlg.open(`${NX.dlg.head("New message", "Choose who you want to talk to.")}
          <form class="dlg-b form-grid" id="nmForm" novalidate>
            <div class="field full"><label for="nmTo">To</label>
              <select id="nmTo">${contacts.map((c) => `<option value="${esc(c.email)}"${pre && pre.to === c.email ? " selected" : ""}>${esc(c.name)} — ${esc(c.hint || ROLE_TAG[c.role])}</option>`).join("")}</select><div class="err" id="nmTo-e"></div></div>
            <div class="field full"><label for="nmSub">Subject</label><input id="nmSub" maxlength="80" value="${esc((pre && pre.subject) || "")}" placeholder="e.g. Question about desk availability"><div class="err" id="nmSub-e"></div></div>
            <div class="field full"><label for="nmTxt">Message</label><textarea id="nmTxt" rows="4" maxlength="1500" placeholder="Write your message…"></textarea><div class="err" id="nmTxt-e"></div></div>
            <div class="dlg-actions full"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Send message</button></div>
          </form>`);
        if (returnTo)
          NX.$$("[data-close]", NX.dlg.el()).forEach((button) =>
            button.addEventListener("click", () => location.assign(returnTo)),
          );
        NX.$("#nmForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const sub = NX.$("#nmSub"),
            txt = NX.$("#nmTxt");
          const okS = NX.fieldErr(sub, sub.value.trim().length < 3 ? "Add a short subject." : "");
          const okT = NX.fieldErr(txt, txt.value.trim().length < 2 ? "Write a message first." : "");
          if (!okS || !okT) return;
          await NX.run(e.submitter, async () => {
            const id = await NX.Api.startThread({
              to: NX.$("#nmTo").value,
              subject: sub.value.trim(),
              text: txt.value,
            });
            NX.dlg.close();
            activeId = id;
            history.replaceState(null, "", "?t=" + id);
            await load();
            NX.toast("Message sent.");
          });
        });
      }
      NX.$("#msgNew", root).addEventListener("click", () => newDialog());

      try {
        await load();
        const to = NX.qs("to");
        if (to) newDialog({ to, subject: NX.qs("subject") || "" });
      } catch (e) {
        root.innerHTML = NX.errorBox(e.message);
      }
    },
  };
})();

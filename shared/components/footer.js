/* NEXUS — shared component: footer.
   Usage: <div id="nx-footer"></div> (add data-compact="true" for the slim version).
   Must load after paths.js and before ui.js. */
(function () {
  var NX = window.NX;
  var host = document.getElementById("nx-footer");
  if (!host) return;
  var compact = host.getAttribute("data-compact") === "true";
  var P = NX.page;
  var LOGO = NX.LOGO;

  var html = `
<footer class="foot${compact ? " compact" : ""}" id="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="${NX.home()}" aria-label="NEXUS — home">${LOGO}<span class="wordmark">NEXUS</span></a>
        <p>Workspaces, services and experts — all in one place.</p>
        <div class="foot-social" aria-label="Contact channels">
          <a class="foot-social-link whatsapp" href="https://www.whatsapp.com/" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp website">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.3-4.9a8.4 8.4 0 1 1 16.2-3.8Z"/><path d="M8.4 8.1c.2-.4.5-.4.8-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.2.2-.2.4 0 .7.6 1 1.4 1.8 2.4 2.3.2.1.5.1.6-.1l.8-.9c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.5 0 .3-.2 1.2-.8 1.7-.5.5-1.3.7-2 .5-1-.2-2.2-.7-3.6-1.9-1.7-1.5-2.8-3.4-3-4.2-.2-.8 0-1.5.4-2.1.3-.4.7-.7 1.1-.8Z"/></svg>
          </a>
          <a class="foot-social-link facebook" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook website">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h2.7l.4-3H14V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H8v3h2.6v8H14Z"/></svg>
          </a>
          <a class="foot-social-link linkedin" href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn website">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM5 10h3v9H5zM10 10h2.9v1.2h.1a3.2 3.2 0 0 1 2.8-1.5c3 0 3.6 2 3.6 4.5V19h-3v-4.3c0-1 0-2.3-1.4-2.3s-1.7 1.1-1.7 2.2V19h-3v-9Z"/></svg>
          </a>
          <a class="foot-social-link email" href="mailto:hello@nexus.jo" aria-label="Email NEXUS">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>
          </a>
        </div>
      </div>
      <nav class="foot-col" aria-label="Explore NEXUS"><h4>Explore</h4><ul>
        <li><a href="${P("spaces")}">Browse spaces</a></li>
        <li><a href="${P("services")}">Services</a></li>
        <li><a href="${P("experts")}">Find an expert</a></li>
        <li><a href="${P("contact")}">Contact</a></li>
      </ul></nav>
      <div class="foot-news">
        <h4>Stay in the loop</h4>
        <p>Get occasional updates about new spaces and ways to work better.</p>
        <form class="news-form" id="newsForm">
          <label class="sr" for="newsMail">Email address</label>
          <input id="newsMail" name="email" type="email" placeholder="Your email address" autocomplete="email" required>
          <button class="btn btn-primary btn-sm" type="submit">Subscribe</button>
        </form>
        <p class="news-note">Demo form — your email is not stored.</p>
        <div class="news-msg" id="newsMsg" aria-live="polite"></div>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 NEXUS. All rights reserved.</span>
      <nav aria-label="Legal">
        <a href="${P("legal")}#privacy">Privacy</a>
        <a href="${P("legal")}#terms">Terms</a>
        <a href="${P("legal")}#cookies">Cookies</a>
      </nav>
      <button class="to-top" id="toTop" type="button">Back to top <svg class="i" aria-hidden="true"><use href="#i-arrow-up"/></svg></button>
    </div>
  </div>
  <div class="foot-mark" aria-hidden="true">NEXUS</div>
</footer>`;
  host.outerHTML = html;
})();

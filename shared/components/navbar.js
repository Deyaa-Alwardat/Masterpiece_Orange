/* NEXUS — shared component: navbar.
   Usage: put <div id="nx-navbar" data-active="spaces"></div> where the navbar belongs.
   This script replaces it with the markup; it must load before ui.js. */
(function () {
  var NX = window.NX;
  var host = document.getElementById("nx-navbar");
  if (!host) return;
  var active = host.getAttribute("data-active") || "";
  var P = NX.page;
  var LINKS = [
    [P("spaces"), "Spaces", "spaces"],
    [P("services"), "Services", "services"],
    [P("experts"), "Find an expert", "experts"],
    [P("about"), "About Us", "about"],
    [P("contact"), "Contact", "contact"],
  ];
  var LOGO =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 38V10L38 38V10" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="38" r="6.6" fill="#7C5CFF"/><circle cx="10" cy="10" r="6.6" fill="#FFC24B"/><circle cx="38" cy="38" r="6.6" fill="#29D6F0"/><circle cx="38" cy="10" r="6.6" fill="#FF5E9C"/></svg>';
  var links = LINKS.map(function (l) {
    return (
      '<a href="' +
      l[0] +
      '"' +
      (l[2] === active ? ' aria-current="page"' : "") +
      ">" +
      l[1] +
      "</a>"
    );
  }).join("");
  host.outerHTML =
    '<a class="skip" href="#main">Skip to content</a>' +
    '<header class="nav"><div class="wrap"><div class="nav-in">' +
    '<a class="brand" href="' +
    NX.home() +
    '" aria-label="NEXUS — home">' +
    LOGO +
    '<span class="wordmark">NEXUS</span></a>' +
    '<nav class="nav-links" id="navLinks" aria-label="Main navigation">' +
    links +
    "</nav>" +
    '<div class="nav-actions">' +
    '<button class="theme-btn" id="themeBtn" type="button" aria-label="Switch to light mode"><svg class="i i-sun" aria-hidden="true"><use href="#i-sun"/></svg><svg class="i i-moon" aria-hidden="true"><use href="#i-moon"/></svg></button>' +
    '<span id="navUser"><a class="btn btn-ghost btn-sm" href="' +
    P("login") +
    '">Sign in</a><a class="btn btn-primary btn-sm" href="' +
    P("login", { mode: "register" }) +
    '">Get started</a></span>' +
    '<button class="menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="navLinks"><svg class="i" aria-hidden="true"><use href="#i-menu"/></svg></button>' +
    "</div></div></div></header>";
})();

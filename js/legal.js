/* NEXUS — legal page: highlight the section chosen in the URL hash */
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".legal-tabs a");
  const mark = () =>
    links.forEach((a) =>
      a.setAttribute(
        "aria-current",
        String(a.getAttribute("href") === (location.hash || "#privacy")),
      ),
    );
  mark();
  addEventListener("hashchange", mark);
});

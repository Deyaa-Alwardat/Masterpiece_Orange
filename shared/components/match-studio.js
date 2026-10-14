/* NEXUS — shared AI match studio presentation for member and public expert pages. */
(function () {
  "use strict";
  const NX = window.NX;

  NX.MatchStudio = {
    async decorate(root) {
      document.body.classList.add("match-studio-public");
      const panel = NX.$("#aiPanel", root);
      const input = NX.$("#mtIn", root);
      const output = NX.$("#mtOut", root);
      const button = NX.$("#mtGo", root);
      let submittedPrompt = input?.value.trim() || "";

      if (panel && input && output && button) {
        panel.insertAdjacentHTML(
          "afterbegin",
          '<div class="matchmaking-intro"><div class="matchmaking-copy"><span class="matchmaking-kicker">NEXUS · AI match studio <span class="matchmaking-demo">Demo model</span></span><h2>Meet the mind behind your next breakthrough.</h2><p>Tell us what you’re working through. The match studio connects your challenge to relevant expertise, then gives you the final say.</p><div class="matchmaking-truth"><span class="matchmaking-live-dot"></span>Transparent demo matching · You stay in control</div></div><div class="matchmaking-radar" role="img" aria-label="Animated visualization of a challenge connecting to skills and a recommended expert"><div class="radar-grid" aria-hidden="true"></div><div class="radar-orbit radar-orbit-outer"><i></i></div><div class="radar-orbit radar-orbit-inner"><i></i></div><div class="radar-core"><span>NEXUS</span><b>Match engine</b><small>Signals in motion</small></div><span class="radar-chip radar-chip-problem">01 · Challenge</span><span class="radar-chip radar-chip-skill">02 · Expertise</span><span class="radar-chip radar-chip-fit">03 · Your fit</span><span class="radar-signal radar-signal-one" aria-hidden="true"></span><span class="radar-signal radar-signal-two" aria-hidden="true"></span></div></div>',
        );
        input.insertAdjacentHTML(
          "beforebegin",
          '<div class="matchmaking-flow" aria-label="How the match studio works"><div class="matchmaking-flow-step"><span>01</span><div><b>Describe</b><small>Put your challenge into words.</small></div></div><i aria-hidden="true"></i><div class="matchmaking-flow-step"><span>02</span><div><b>Discover</b><small>See the skills that stand out.</small></div></div><i aria-hidden="true"></i><div class="matchmaking-flow-step"><span>03</span><div><b>Choose</b><small>Review experts and decide.</small></div></div></div><div class="matchmaking-prompt-head"><label for="mtIn">What are you working through?</label><span><span class="matchmaking-live-dot"></span>Ready when you are</span></div>',
        );
        input.placeholder = "What are you trying to solve? Share the context, what you’ve tried, and the outcome you need…";
        input.setAttribute("aria-describedby", "matchmaking-input-help");
        input.insertAdjacentHTML(
          "afterend",
          '<p id="matchmaking-input-help" class="matchmaking-input-help">A sentence or two gives the matchmaker more context. Your examples below can be edited before you search.</p>',
        );
        output.setAttribute("aria-atomic", "true");
        button.setAttribute("aria-controls", "mtOut");
        const shortcut = button.querySelector("kbd");
        if (shortcut) shortcut.textContent = "Ctrl / ⌘ + Enter";
        button.addEventListener(
          "click",
          () => {
            submittedPrompt = input.value.trim();
          },
          true,
        );
        input.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              submittedPrompt = input.value.trim();
            }
          },
          true,
        );
      }

      const experts = await NX.Api.experts();
      const expertByName = new Map(experts.map((expert) => [expert.name, expert]));
      const readSignals = (text) => {
        const normalized = NX.norm(text);
        return NX.Ai.detect(text).map((key) => {
          const field = NEEDS[key];
          const terms = field.kw
            .filter((_, index) => field.re[index][0].test(normalized))
            .slice(0, 3);
          return { key, label: field.en, terms };
        });
      };
      const decorateResults = () => {
        if (!output) return;
        const analyzing = button.disabled;
        panel.classList.toggle("is-analyzing", analyzing);
        output.setAttribute("aria-busy", String(analyzing));
        if (analyzing || NX.$(".think", output)) return;

        const prompt = submittedPrompt;
        if (prompt.length < 12) return;
        const signals = readSignals(prompt);
        if (!NX.$(".analysis-card", output)) {
          const promptSnippet = [...prompt].slice(0, 180).join("");
          const specialties = signals.length
            ? signals
                .map((signal) => `<span class="tag acc">${NX.esc(signal.label)}</span>`)
                .join("")
            : '<span class="analysis-no-signal">No known specialty keywords detected yet</span>';
          const evidence = signals.flatMap((signal) =>
            signal.terms.map((term) => ({ term, label: signal.label })),
          );
          const evidenceMarkup = evidence.length
            ? evidence
                .slice(0, 6)
                .map(
                  (item) =>
                    `<span class="analysis-token"><b>“${NX.esc(item.term)}”</b><small>${NX.esc(item.label)}</small></span>`,
                )
                .join("")
            : '<span class="analysis-no-signal">Try a more specific phrase, such as the tool, goal, or type of problem.</span>';
          const analysis = `<section class="analysis-card" aria-labelledby="analysis-heading"><div class="analysis-copy"><span class="matchmaking-kicker">Prompt analysis · demo</span><h3 id="analysis-heading">Here’s what we picked up</h3><blockquote>“${NX.esc(promptSnippet)}${[...prompt].length > 180 ? "…" : ""}”</blockquote><p>${signals.length ? `Your description contains signals associated with ${signals.map((signal) => NX.esc(signal.label)).join(", ")}.` : "The current keyword model did not recognize a specialty yet."} This preview uses known terms, not contextual AI reasoning.</p><div class="analysis-specialties">${specialties}</div></div><div class="analysis-evidence"><span class="analysis-label">Matched wording</span><div class="analysis-tokens">${evidenceMarkup}</div><span class="analysis-label">How this demo ranks</span><p>Skill overlap, profile rating, and relevant workspace bookings.</p></div></section>`;
          const needs = NX.$(".needs", output);
          if (needs) needs.before(analysis);
          else output.insertAdjacentHTML("afterbegin", analysis);
        }

        const cards = NX.$$(".match", output).slice(0, 3);
        if (!cards.length) return;

        if (!NX.$(".recommended-heading", output)) {
          output.insertAdjacentHTML(
            "afterbegin",
            '<div class="recommended-heading"><span class="matchmaking-kicker">Recommendations</span><h2>Your recommended experts</h2><p>Keyword-based demo suggestions, ranked using specialties, profile ratings, and relevant workspace bookings. Review each expert and choose what suits you.</p></div>',
          );
        }

        cards.forEach((card) => {
          const name = NX.$("h3", card)?.textContent.trim();
          const expert = expertByName.get(name);
          const why = NX.$(".why", card);
          if (expert && why && !why.dataset.promptLinked) {
            const matchingFields = NX.Ai.detect(prompt).filter((key) => expert.skills.includes(key));
            const linkedTerms = signals
              .filter((signal) => matchingFields.includes(signal.key))
              .flatMap((signal) => signal.terms)
              .slice(0, 3);
            const specialtyNames = matchingFields.map((key) => NEEDS[key].en);
            const locationRelevant = why.textContent.includes("Currently at your space.");
            const evidenceText = linkedTerms.length
              ? `Your wording includes ${linkedTerms.map((term) => `“${NX.esc(term)}”`).join(" / ")} and points to ${specialtyNames.map((label) => NX.esc(label)).join(" and ")}.`
              : `Your prompt maps to ${specialtyNames.map((label) => NX.esc(label)).join(" and ")}, which overlaps with this expert’s listed specialties.`;
            why.innerHTML = `<b>Why this expert?</b> ${evidenceText} ${NX.esc(expert.why || "Their listed specialties match your request.")}${locationRelevant ? " Currently at your space." : ""}`;
            why.dataset.promptLinked = "true";
          }
          const ring = NX.$(".ring", card);
          if (ring && !NX.$(".match-fit-label", card)) {
            ring.setAttribute("aria-label", `Demo compatibility score: ${ring.dataset.p}%`);
            ring.insertAdjacentHTML("afterend", '<small class="match-fit-label">Demo fit</small>');
          }
          if (expert && !NX.$(".match-facts", card)) {
            const facts = document.createElement("p");
            facts.className = "match-facts";
            facts.textContent = `${NX.jod(expert.rate)} / session${expert.n ? ` · ${expert.n} sessions` : " · New expert"}`;
            if (why) why.before(facts);
          }
          const bookButton = NX.$("[data-consult]", card);
          if (bookButton && bookButton.textContent.trim() !== "Book session") {
            bookButton.textContent = "Book session";
          }
        });
      };

      if (output) {
        new MutationObserver(decorateResults).observe(output, { childList: true, subtree: true });
        new MutationObserver(decorateResults).observe(button, {
          attributes: true,
          attributeFilter: ["disabled"],
        });
        decorateResults();
      }

      const market = NX.$(".ex-market", root);
      if (market) market.id = "browse-experts";
    },
  };
})();

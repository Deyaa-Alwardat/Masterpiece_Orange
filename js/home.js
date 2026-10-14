/* NEXUS — home.js (landing page behaviour) */
document.addEventListener("DOMContentLoaded", () => {
  const NX = window.NX;
  if (!NX) {
    console.error("NEXUS landing page utilities are unavailable.");
    return;
  }

  const $ = NX.$;
  const $$ = NX.$$;
  const reducedMotion = NX.reduced;

  /* ---------- Background video: play/pause, save battery off-screen ---------- */
  const video = $("#heroVideo");
  const videoButton = $("#vidBtn");
  const hero = $("#top");

  if (video && videoButton && hero) {
    const media = video.closest(".hero-media");
    let userPaused = reducedMotion;
    let videoFailed = false;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    const syncVideoButton = () => {
      const paused = video.paused;
      videoButton.classList.toggle("paused", paused);
      videoButton.setAttribute(
        "aria-label",
        paused ? "Play background video" : "Pause background video"
      );
      videoButton.setAttribute("aria-pressed", String(paused));
    };

    const playVideo = async (reason) => {
      try {
        await video.play();
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn(`Hero video ${reason} could not start:`, error);
        }
        syncVideoButton();
      }
    };

    const showPosterFallback = () => {
      if (videoFailed) return;
      videoFailed = true;
      if (media) media.classList.add("video-unavailable");
      console.error("Hero background video failed to load; using the poster fallback.", video.error);
      syncVideoButton();
    };

    video.addEventListener("play", syncVideoButton);
    video.addEventListener("pause", syncVideoButton);
    video.addEventListener("ended", syncVideoButton);
    video.addEventListener("error", showPosterFallback);
    video.addEventListener("loadeddata", () => {
      videoFailed = false;
      if (media) media.classList.remove("video-unavailable");
    });

    videoButton.addEventListener("click", () => {
      if (video.paused) {
        userPaused = false;
        playVideo("playback");
      } else {
        userPaused = true;
        video.pause();
      }
      syncVideoButton();
    });

    if (window.innerWidth <= 760) {
      let sourceChanged = false;
      video.querySelectorAll("source").forEach((source) => {
        if (source.type === "video/mp4") {
          source.src = "assets/video/hero-720.mp4";
          sourceChanged = true;
        } else if (source.type === "video/webm") {
          source.src = "assets/video/hero-720.webm";
          sourceChanged = true;
        }
      });

      if (sourceChanged) video.load();
    }

    if (reducedMotion) video.pause();

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (userPaused) return;

          if (entries[0].isIntersecting) {
            playVideo("autoplay");
          } else {
            video.pause();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(hero);
    } else if (!userPaused) {
      playVideo("autoplay");
    }

    if (video.error) showPosterFallback();
    syncVideoButton();
  } else {
    console.error("Hero video elements are missing:", {
      video: !!video,
      button: !!videoButton,
      hero: !!hero
    });
  }

  /* ---------- Immersive room: local preview only ---------- */
  const room = $("#room3d");
  const roomTitle = $("#roomTitle");
  const roomDescription = $("#roomDesc");
  const roomStatus = $("#roomStatusTxt");
  const reserveDesk = $("#reserveDesk");

  if (room) {
    const deskDetails = {
      window: {
        title: "Window Desk",
        description: "A bright desk by the window with a view and natural light."
      },
      focus: {
        title: "Focus Desk",
        description: "A quiet desk with a monitor and natural light."
      },
      team: {
        title: "Team Desk",
        description: "A flexible desk in the collaborative area, suited to group work."
      }
    };

    const selectDesk = (desk) => {
      const detail = deskDetails[desk.dataset.desk];
      if (!detail) return;

      room.querySelectorAll(".room-desk").forEach((item) => {
        const selected = item === desk;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });

      if (roomTitle) roomTitle.textContent = detail.title;
      if (roomDescription) roomDescription.textContent = detail.description;
      if (roomStatus) roomStatus.textContent = "Available to book now";
    };

    room.addEventListener("click", (event) => {
      const desk = event.target.closest(".room-desk");
      if (desk && room.contains(desk)) selectDesk(desk);
    });

    const initialDesk = room.querySelector(".room-desk.selected") || room.querySelector(".room-desk");
    if (initialDesk) selectDesk(initialDesk);

    if (reserveDesk) {
      reserveDesk.addEventListener("click", () => {
        const selectedDesk = room.querySelector(".room-desk.selected");
        if (!selectedDesk) return;

        const detail = deskDetails[selectedDesk.dataset.desk];
        if (detail && NX.toast) {
          NX.toast(`${detail.title} selected. Open space details to continue.`);
        }
      });
    }
  }

  /* ---------- Bento: AI demo (typing → tags → result) + mini plan ---------- */
  const miniPlan = $("#miniPlan");
  if (miniPlan) {
    const availableDesks = [];
    for (let index = 0; index < 12; index++) {
      const desk = document.createElement("i");
      if ([1, 4, 5, 9].includes(index)) desk.className = "busy";
      else availableDesks.push(desk);
      miniPlan.append(desk);
    }

    if (!reducedMotion) {
      let selectedDesk = 0;
      setInterval(() => {
        availableDesks.forEach((desk) => desk.classList.remove("pick"));
        selectedDesk = (selectedDesk + 1) % availableDesks.length;
        availableDesks[selectedDesk].classList.add("pick");
      }, 1100);
    } else if (availableDesks[2]) {
      availableDesks[2].classList.add("pick");
    }
  }

  const demoSection = $(".bento-ai");
  const typeElement = $("#demoType");
  const tagsElement = $("#demoTags");
  const result = $("#demoRes");

  if (demoSection && typeElement && tagsElement && result) {
    const phrase = "Our database is slow and the app keeps lagging";

    async function runDemo() {
      for (;;) {
        typeElement.textContent = "";
        tagsElement.innerHTML = "";
        result.classList.remove("show");
        for (const character of phrase) {
          typeElement.textContent += character;
          await NX.sleep(reducedMotion ? 0 : 38);
        }
        await NX.sleep(reducedMotion ? 0 : 500);
        for (const tag of ["Databases", "Software engineering"]) {
          tagsElement.insertAdjacentHTML("beforeend", `<span class="tag acc">${tag}</span>`);
          await NX.sleep(reducedMotion ? 0 : 380);
        }
        await NX.sleep(reducedMotion ? 0 : 350);
        result.classList.add("show");
        if (reducedMotion) return;
        await NX.sleep(4200);
      }
    }

    if ("IntersectionObserver" in window) {
      const demoObserver = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          demoObserver.disconnect();
          runDemo();
        },
        { threshold: 0.3 }
      );
      demoObserver.observe(demoSection);
    } else {
      runDemo();
    }
  }

  /* ---------- FAQ: one open at a time ---------- */
  const faqList = $("#faqList");
  if (faqList) {
    faqList.addEventListener(
      "toggle",
      (event) => {
        if (event.target.open) {
          $$("#faqList details").forEach((detail) => {
            if (detail !== event.target) detail.open = false;
          });
        }
      },
      true
    );
  }
});

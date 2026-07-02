/* ==========================================================================
   XPLOROO · About Us module
   about.js — Video play trigger (ready for a real embed), marquee
   viewport-based pausing (perf), and a count-up animation for the
   statistics card. Vanilla JS, no dependencies, scoped to `.about`.
   ========================================================================== */
(function () {
  "use strict";

  const section = document.querySelector('[data-section="about"]');
  if (!section) return;

  /* ------------------------------------------------------------------ */
  /* 1. Video play trigger                                               */
  /*    Reads an embed URL from `data-video-src` on the frame (left      */
  /*    unset for now — a placeholder). On click, swaps the placeholder  */
  /*    button for a real <video>/<iframe> if a source is provided.      */
  /* ------------------------------------------------------------------ */
  const videoFrame = section.querySelector("[data-about-video]");
  const playBtn = section.querySelector("[data-about-play]");

  if (videoFrame && playBtn) {
    playBtn.addEventListener("click", () => {
      const src = videoFrame.dataset.videoSrc;
      if (!src) return; // no embed wired up yet — placeholder stays interactive

      let embed;
      if (/\.(mp4|webm|ogg)$/i.test(src)) {
        embed = document.createElement("video");
        embed.src = src;
        embed.controls = true;
        embed.autoplay = true;
        embed.playsInline = true;
      } else {
        embed = document.createElement("iframe");
        embed.src = src;
        embed.title = "Xploroo story video";
        embed.allow = "autoplay; fullscreen; picture-in-picture";
        embed.allowFullscreen = true;
      }

      videoFrame.appendChild(embed);
      videoFrame.classList.add("is-playing");
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Pause marquees when the section is off-screen (perf: no point    */
  /*    animating two infinite loops the user can't see)                 */
  /* ------------------------------------------------------------------ */
  const marquees = section.querySelectorAll("[data-marquee]");
  if (marquees.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-paused", !entry.isIntersecting);
        });
      },
      { threshold: 0.01 }
    );
    marquees.forEach((m) => observer.observe(m));
  }

  /* ------------------------------------------------------------------ */
  /* 3. Count-up animation for the statistics card                       */
  /* ------------------------------------------------------------------ */
  const statNumber = section.querySelector("[data-stat-number]");
  if (statNumber && "IntersectionObserver" in window) {
    const target = parseInt(statNumber.dataset.target, 10) || 0;
    const duration = 1400;
    let played = false;

    function animateCount() {
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        statNumber.textContent = Math.round(eased * target).toString();
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played) {
            played = true;
            animateCount();
            statObserver.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    statObserver.observe(statNumber);
  }
})();

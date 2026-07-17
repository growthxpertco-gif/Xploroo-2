/* ==========================================================================
   XPLOROO · Xploroo Globe (Phase 36)
   xploroo-globe-stars.js — Lightweight canvas 2D starfield with gentle
   twinkle and slow shooting stars, layered behind the Three.js globe
   canvas. Deliberately kept off the WebGL context (a second, cheap 2D
   canvas) so the cinematic background never competes with the globe's
   render budget. Pauses entirely when the tab is hidden or the visitor
   prefers reduced motion. Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  const canvas = document.querySelector("[data-xg-stars]");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STAR_COUNT = 160;
  const SHOOTING_STAR_INTERVAL_MS = 4200;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  let shootingStars = [];
  let rafId = null;
  let lastShootingStarAt = 0;
  let running = false;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function seedStars() {
    stars = new Array(STAR_COUNT).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.35,
      twinkleSpeed: Math.random() * 0.0015 + 0.0006,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function spawnShootingStar() {
    const startX = Math.random() * width * 0.6 + width * 0.2;
    const startY = Math.random() * height * 0.25;
    const angle = (Math.PI / 5) + Math.random() * 0.2;
    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * 5.2,
      vy: Math.sin(angle) * 5.2,
      life: 0,
      maxLife: 46,
    });
  }

  function draw(now) {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgb(245, 247, 251)";
    for (const star of stars) {
      const twinkle = Math.sin(now * star.twinkleSpeed + star.phase) * 0.35;
      ctx.globalAlpha = Math.max(0, Math.min(1, star.baseAlpha + twinkle));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (now - lastShootingStarAt > SHOOTING_STAR_INTERVAL_MS && Math.random() < 0.5) {
      spawnShootingStar();
      lastShootingStarAt = now;
    }

    shootingStars = shootingStars.filter((s) => s.life < s.maxLife);
    for (const s of shootingStars) {
      const t = s.life / s.maxLife;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const tailX = s.x - s.vx * 6;
      const tailY = s.y - s.vy * 6;
      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, alpha).toFixed(3)})`);
      grad.addColorStop(1, "rgba(199, 204, 217, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      s.x += s.vx;
      s.y += s.vy;
      s.life += 1;
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    lastShootingStarAt = performance.now();
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  let resizeTimer = null;
  function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 200);
  }

  resize();
  window.addEventListener("resize", scheduleResize, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reduceMotion) start();
  });

  if (!reduceMotion) {
    start();
  } else {
    // Draw a single static frame so the sky still reads as populated.
    draw(performance.now());
  }

  /* ---------------------------------------------------------------- */
  /* Entrance-animation visibility failsafe.                            */
  /* Every hero element (label/title/subtitle/CTA/globe stage) starts   */
  /* at `opacity: 0` in CSS and fades in via a `forwards` animation.    */
  /* Some embedded preview/host environments report the page as        */
  /* `document.hidden === true` even while actively shown, and browsers */
  /* freeze CSS animation timelines (not just requestAnimationFrame) on */
  /* hidden pages — leaving these elements stuck at their invisible     */
  /* starting frame forever. Runs from this always-loaded script so it  */
  /* keeps working regardless of which globe implementation is in use.  */
  /* ---------------------------------------------------------------- */
  (function ensureHeroVisible() {
    const SELECTORS = ".xg-label, .xg-title, .xg-subtitle, .xg-cta-row, .xg-globe-stage";
    function reveal() {
      document.querySelectorAll(SELECTORS).forEach((el) => {
        el.style.animation = "none";
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }
    if (document.hidden) reveal();
    window.setTimeout(reveal, 1800);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) reveal();
    });
  })();
})();

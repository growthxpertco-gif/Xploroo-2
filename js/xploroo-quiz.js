/* ==========================================================================
   XPLOROO · Xploroo Quiz — interactive engine (flagship)
   xploroo-quiz.js — Drives xploroo-quiz.html: intro → 7-minute timed quiz
   (one question at a time, section transitions, restart-safe via
   localStorage) → cinematic result screen with a collapsible breakdown.
   Reads its question data from the global `xplorooQuizQuestions`
   (js/xploroo-quiz-data.js, loaded first). Vanilla JS, no dependencies.
   Loaded with `defer`.

   Same architecture as js/japan-quiz.js, js/shimla-quiz.js and
   js/manali-quiz.js (intentionally — this quiz reuses the proven engine
   design), but entirely self-contained: its own `data-xq-*` selectors,
   its own `xq-*` CSS classes, and its own localStorage key
   (`xploroo-quiz-state`). It never reads or writes anything the other
   three quizzes use, so all four sessions can never collide.

   The source document's own header lists "Time: 15 Minutes" — per
   explicit instruction that value is ignored; QUIZ_DURATION_MS below is
   fixed at 7 minutes, identical to the other three quizzes.

   Fairness: correct answers live only in `xplorooQuizQuestions` (in
   memory / this script's closure) and are never written into the DOM
   while the quiz is active — rendered options carry only their own text
   and a 0–3 index, nothing that reveals correctness until the result
   screen.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-xq-page]");
  if (!page) return;
  if (typeof xplorooQuizQuestions === "undefined" || !Array.isArray(xplorooQuizQuestions)) return;

  const QUESTIONS = xplorooQuizQuestions;
  const TOTAL = QUESTIONS.length;
  const QUIZ_DURATION_MS = 7 * 60 * 1000; // fixed at 7 minutes — the document's "15 Minutes" header is intentionally ignored
  const PASSING_SCORE = 35;
  const STORAGE_KEY = "xploroo-quiz-state";
  const SECTION_ORDER = [];
  QUESTIONS.forEach((q) => {
    if (!SECTION_ORDER.includes(q.section)) SECTION_ORDER.push(q.section);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* DOM refs                                                             */
  /* ------------------------------------------------------------------ */
  const panels = {
    intro: page.querySelector('[data-xq-panel="intro"]'),
    quiz: page.querySelector('[data-xq-panel="quiz"]'),
    result: page.querySelector('[data-xq-panel="result"]'),
  };
  const startBtn = page.querySelector("[data-xq-start]");
  const timerWrap = page.querySelector("[data-xq-timer-wrap]");
  const timerEl = page.querySelector("[data-xq-timer]");
  const sectionBadgeEl = page.querySelector("[data-xq-section-badge]");
  const progressFillEl = page.querySelector("[data-xq-progress-fill]");
  const progressCountEl = page.querySelector("[data-xq-progress-count]");
  const progressPercentEl = page.querySelector("[data-xq-progress-percent]");
  const sectionIntroEl = page.querySelector("[data-xq-section-intro]");
  const sectionTagEl = page.querySelector("[data-xq-section-tag]");
  const sectionTitleEl = page.querySelector("[data-xq-section-title]");
  const questionEl = page.querySelector("[data-xq-question]");
  const sparkEl = page.querySelector("[data-xq-spark]");
  const qnumEl = page.querySelector("[data-xq-qnum]");
  const qnumStrongEl = qnumEl ? qnumEl.querySelector("strong") : null;
  const sectionNameEl = page.querySelector("[data-xq-section-name]");
  const qtextEl = page.querySelector("[data-xq-qtext]");
  const optionsEl = page.querySelector("[data-xq-options]");

  const resultEl = page.querySelector("[data-xq-result]");
  const resultBadgeEl = page.querySelector("[data-xq-result-badge]");
  const resultHeadlineEl = page.querySelector("[data-xq-result-headline]");
  const resultSubheadEl = page.querySelector("[data-xq-result-subhead]");
  const resultScoreEl = page.querySelector("[data-xq-result-score]");
  const statCorrectEl = page.querySelector("[data-xq-stat-correct]");
  const statIncorrectEl = page.querySelector("[data-xq-stat-incorrect]");
  const statPercentEl = page.querySelector("[data-xq-stat-percentage]");
  const statTimeEl = page.querySelector("[data-xq-stat-time]");
  const tryAgainBtn = page.querySelector("[data-xq-try-again]");
  const breakdownToggle = page.querySelector("[data-xq-breakdown-toggle]");
  const breakdownPanel = page.querySelector("[data-xq-breakdown-panel]");
  const breakdownList = page.querySelector("[data-xq-breakdown-list]");
  const resultSparkEl = page.querySelector("[data-xq-result-spark]");

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                        */
  /* ------------------------------------------------------------------ */
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function formatClock(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    return pad2(Math.floor(totalSec / 60)) + ":" + pad2(totalSec % 60);
  }
  function sectionLetter(sectionName) {
    const idx = SECTION_ORDER.indexOf(sectionName);
    return String.fromCharCode(65 + Math.max(idx, 0));
  }
  function showPanel(name) {
    Object.keys(panels).forEach((key) => {
      const el = panels[key];
      if (!el) return;
      el.classList.toggle("is-active", key === name);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Persistence — only the active (in-progress) session is stored.      */
  /* Cleared as soon as the quiz finishes (time-up or question 50).      */
  /* Dedicated Xploroo Quiz key — never touches Japan/Shimla/Manali.      */
  /* ------------------------------------------------------------------ */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quizState));
    } catch (_) {
      /* localStorage unavailable — quiz still works, just isn't restart-safe */
    }
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed.startedAt !== "number" ||
        typeof parsed.currentIndex !== "number" ||
        !Array.isArray(parsed.answers) ||
        parsed.answers.length !== TOTAL
      ) {
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }
  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* nothing to clean up */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Quiz state                                                           */
  /* ------------------------------------------------------------------ */
  let quizState = null; // { startedAt, currentIndex, answers[], completed }
  let timerId = null;
  let advanceTimeoutId = null;

  /* ------------------------------------------------------------------ */
  /* Progress + timer rendering                                          */
  /* ------------------------------------------------------------------ */
  function renderProgress(index) {
    const questionNumber = index + 1;
    const percent = Math.round((questionNumber / TOTAL) * 100);
    if (progressFillEl) progressFillEl.style.width = percent + "%";
    if (progressCountEl) progressCountEl.textContent = "Question " + questionNumber + " of " + TOTAL;
    if (progressPercentEl) progressPercentEl.textContent = percent + "% Complete";
  }

  function tickTimer() {
    const remaining = QUIZ_DURATION_MS - (Date.now() - quizState.startedAt);
    if (timerEl) timerEl.textContent = formatClock(remaining);
    if (timerWrap) {
      const under5min = remaining <= 5 * 60 * 1000;
      const under1min = remaining <= 60 * 1000;
      timerWrap.classList.toggle("is-urgent", under5min && remaining > 0);
      timerWrap.classList.toggle("is-critical", under1min && remaining > 0);
    }
    if (remaining <= 0) {
      stopTimer();
      finishQuiz(true);
    }
  }
  function startTimer() {
    stopTimer();
    tickTimer();
    timerId = window.setInterval(tickTimer, 1000);
  }
  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Titanium spark burst — a handful of short-lived elements (premium    */
  /* light + confetti), never a continuous particle loop. Auto-removed    */
  /* once the fall animation ends.                                        */
  /* ------------------------------------------------------------------ */
  const SPARK_GLYPHS = ["✦", "◆", "●"];
  function burstSpark(container, count) {
    if (!container || reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = "xq-spark-flake xq-spark-flake--" + (i % 3);
      spark.textContent = SPARK_GLYPHS[i % SPARK_GLYPHS.length];
      spark.style.left = 8 + Math.random() * 84 + "%";
      spark.style.setProperty("--xq-spark-x", (Math.random() * 60 - 30).toFixed(0) + "px");
      spark.style.animationDelay = (Math.random() * 300).toFixed(0) + "ms";
      spark.style.fontSize = (0.7 + Math.random() * 0.5).toFixed(2) + "rem";
      container.appendChild(spark);
      window.setTimeout(() => spark.remove(), 2200);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Question rendering                                                   */
  /* ------------------------------------------------------------------ */
  const ENTER_VARIANTS = ["slide", "depth", "fade"];

  function buildOptions(question) {
    optionsEl.innerHTML = "";
    optionsEl.classList.remove("is-locked");
    const letters = ["A", "B", "C", "D"];
    question.options.forEach((optionText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xq-option";
      btn.setAttribute("data-option-index", String(i));
      btn.innerHTML =
        '<span class="xq-option__letter">' + letters[i] + "</span>" +
        '<span class="xq-option__text"></span>' +
        '<svg class="xq-option__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      btn.querySelector(".xq-option__text").textContent = optionText;
      optionsEl.appendChild(btn);
    });
  }

  function renderQuestion(index, opts) {
    opts = opts || {};
    const question = QUESTIONS[index];

    if (qnumStrongEl) qnumStrongEl.textContent = pad2(index + 1);
    if (sectionNameEl) sectionNameEl.textContent = question.section;
    if (qtextEl) qtextEl.textContent = question.question;
    buildOptions(question);

    // Restore a previously-selected answer (e.g. right after a refresh
    // lands the user back on the question they hadn't yet advanced past).
    const savedAnswer = quizState.answers[index];
    if (savedAnswer) {
      const letters = ["A", "B", "C", "D"];
      const savedIndex = letters.indexOf(savedAnswer);
      const savedBtn = optionsEl.querySelector('[data-option-index="' + savedIndex + '"]');
      if (savedBtn) savedBtn.classList.add("is-selected");
      optionsEl.classList.add("is-locked");
    }

    renderProgress(index);
    if (sectionBadgeEl) sectionBadgeEl.textContent = "Section " + sectionLetter(question.section);

    if (!opts.skipAnimation) {
      questionEl.classList.remove(
        "xq-anim-in-slide", "xq-anim-in-depth", "xq-anim-in-fade",
        "xq-flourish-sweep"
      );
      void questionEl.offsetWidth; // force reflow so the animation replays
      const variant = ENTER_VARIANTS[index % ENTER_VARIANTS.length];
      questionEl.classList.add("xq-anim-in-" + variant);
      if (index % 5 === 2) questionEl.classList.add("xq-flourish-sweep");
      if (index % 8 === 4) burstSpark(sparkEl, 6);
    }
  }

  function playExitThen(callback) {
    if (reduceMotion) {
      callback();
      return;
    }
    const variant = ENTER_VARIANTS[quizState.currentIndex % ENTER_VARIANTS.length];
    questionEl.classList.remove(
      "xq-anim-in-slide", "xq-anim-in-depth", "xq-anim-in-fade", "xq-flourish-sweep"
    );
    questionEl.classList.add("xq-anim-out-" + variant);
    window.setTimeout(() => {
      questionEl.classList.remove("xq-anim-out-" + variant);
      callback();
    }, 260);
  }

  function showSectionIntro(sectionName, callback) {
    if (!sectionIntroEl) {
      callback();
      return;
    }
    if (sectionTagEl) sectionTagEl.textContent = "Section " + sectionLetter(sectionName);
    if (sectionTitleEl) sectionTitleEl.textContent = sectionName.toUpperCase();
    sectionIntroEl.classList.add("is-active");
    sectionIntroEl.setAttribute("aria-hidden", "false");
    questionEl.style.display = "none";
    window.setTimeout(() => {
      sectionIntroEl.classList.remove("is-active");
      sectionIntroEl.setAttribute("aria-hidden", "true");
      questionEl.style.display = "";
      callback();
    }, reduceMotion ? 400 : 1600);
  }

  /* ------------------------------------------------------------------ */
  /* Answer selection → lock → auto-advance                               */
  /* ------------------------------------------------------------------ */
  function selectOption(optionIndex) {
    if (optionsEl.classList.contains("is-locked")) return;
    const letters = ["A", "B", "C", "D"];
    const btn = optionsEl.querySelector('[data-option-index="' + optionIndex + '"]');
    if (!btn) return;

    optionsEl.classList.add("is-locked");
    btn.classList.add("is-selected");
    quizState.answers[quizState.currentIndex] = letters[optionIndex];
    saveState();

    advanceTimeoutId = window.setTimeout(advanceToNext, 650);
  }

  function advanceToNext() {
    const fromIndex = quizState.currentIndex;
    const nextIndex = fromIndex + 1;

    if (nextIndex >= TOTAL) {
      playExitThen(() => finishQuiz(false));
      return;
    }

    const enteringNewSection = QUESTIONS[nextIndex].section !== QUESTIONS[fromIndex].section;

    playExitThen(() => {
      quizState.currentIndex = nextIndex;
      saveState();
      if (enteringNewSection) {
        showSectionIntro(QUESTIONS[nextIndex].section, () => renderQuestion(nextIndex));
      } else {
        renderQuestion(nextIndex);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard support — A/B/C/D or 1/2/3/4                                */
  /* ------------------------------------------------------------------ */
  const KEY_MAP = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
  document.addEventListener("keydown", (e) => {
    if (!panels.quiz || !panels.quiz.classList.contains("is-active")) return;
    if (!quizState || quizState.completed) return;
    const key = e.key.toLowerCase();
    if (!(key in KEY_MAP)) return;
    e.preventDefault();
    selectOption(KEY_MAP[key]);
  });

  optionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".xq-option");
    if (!btn || !optionsEl.contains(btn)) return;
    selectOption(Number(btn.getAttribute("data-option-index")));
  });

  /* ------------------------------------------------------------------ */
  /* Finish + score + result screen                                       */
  /* ------------------------------------------------------------------ */
  function finishQuiz(timeUp) {
    if (window.clearTimeout) window.clearTimeout(advanceTimeoutId);
    stopTimer();
    if (!quizState || quizState.completed) return;

    quizState.completed = true;
    const elapsed = Math.min(QUIZ_DURATION_MS, Date.now() - quizState.startedAt);

    let correct = 0;
    QUESTIONS.forEach((q, i) => {
      if (quizState.answers[i] === q.correctAnswer) correct++;
    });
    const incorrect = TOTAL - correct;
    const percentage = Math.round((correct / TOTAL) * 100);
    const passed = correct >= PASSING_SCORE;

    clearState();
    renderResult({ correct, incorrect, percentage, elapsed, passed });
    showPanel("result");
  }

  function renderResult(r) {
    resultEl.classList.toggle("is-pass", r.passed);
    resultEl.classList.toggle("is-fail", !r.passed);

    if (r.passed) {
      resultBadgeEl.textContent = "🏆";
      resultHeadlineEl.textContent = "Congratulations!";
      resultSubheadEl.textContent = "You passed the Xploroo Quiz";
    } else {
      resultBadgeEl.textContent = "🧭";
      resultHeadlineEl.textContent = "Good Try!";
      resultSubheadEl.textContent = "You scored " + r.correct + " / " + TOTAL + " — you need " + PASSING_SCORE + " / " + TOTAL + " to pass";
    }

    resultScoreEl.innerHTML = r.correct + '<span>/ ' + TOTAL + "</span>";
    statCorrectEl.textContent = String(r.correct);
    statIncorrectEl.textContent = String(r.incorrect);
    statPercentEl.textContent = r.percentage + "%";
    statTimeEl.textContent = formatClock(r.elapsed);

    tryAgainBtn.textContent = r.passed ? "Play Again" : "Try Again";

    // Answer breakdown — built once per result, not shown until the user
    // opens it, so the correct-answer text never renders into the DOM
    // during the active quiz itself.
    breakdownList.innerHTML = "";
    QUESTIONS.forEach((q, i) => {
      const userLetter = quizState.answers[i];
      const isCorrect = userLetter === q.correctAnswer;
      const letters = ["A", "B", "C", "D"];
      const userText = userLetter ? q.options[letters.indexOf(userLetter)] : "Not answered";
      const correctText = q.options[letters.indexOf(q.correctAnswer)];

      const li = document.createElement("li");
      li.className = "xq-breakdown__row" + (isCorrect ? "" : " is-wrong");
      li.innerHTML =
        '<span class="xq-breakdown__icon">' + (isCorrect ? "✓" : "✕") + "</span>" +
        '<div class="xq-breakdown__body">' +
        '<p class="xq-breakdown__q">' + (i + 1) + ". " + escapeHtml(q.question) + "</p>" +
        '<p class="xq-breakdown__ans">Your answer: <strong>' + escapeHtml(userText) + "</strong></p>" +
        (isCorrect ? "" : '<p class="xq-breakdown__ans">Correct answer: <strong>' + escapeHtml(correctText) + "</strong></p>") +
        "</div>";
      breakdownList.appendChild(li);
    });
    breakdownPanel.classList.remove("is-open");
    breakdownToggle.setAttribute("aria-expanded", "false");

    if (r.passed) {
      burstSpark(resultSparkEl, 22);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  breakdownToggle.addEventListener("click", () => {
    const isOpen = breakdownPanel.classList.toggle("is-open");
    breakdownToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  /* ------------------------------------------------------------------ */
  /* Start / restart                                                      */
  /* ------------------------------------------------------------------ */
  function beginNewQuiz() {
    quizState = {
      startedAt: Date.now(),
      currentIndex: 0,
      answers: new Array(TOTAL).fill(null),
      completed: false,
    };
    saveState();
    showPanel("quiz");
    startTimer();
    showSectionIntro(QUESTIONS[0].section, () => renderQuestion(0, { skipAnimation: true }));
  }

  startBtn.addEventListener("click", beginNewQuiz);
  tryAgainBtn.addEventListener("click", () => {
    clearState();
    quizState = null;
    showPanel("intro");
  });

  /* ------------------------------------------------------------------ */
  /* Boot — restore an in-progress session if one exists and is still     */
  /* within its 7-minute window; otherwise show the intro screen.         */
  /* ------------------------------------------------------------------ */
  (function boot() {
    const restored = loadState();
    if (!restored || restored.completed) {
      showPanel("intro");
      return;
    }
    const remaining = QUIZ_DURATION_MS - (Date.now() - restored.startedAt);
    quizState = restored;
    if (remaining <= 0) {
      // Time ran out while the tab was closed/backgrounded — settle it now.
      showPanel("quiz");
      finishQuiz(true);
      return;
    }
    showPanel("quiz");
    renderQuestion(quizState.currentIndex, { skipAnimation: true });
    startTimer();
  })();
})();

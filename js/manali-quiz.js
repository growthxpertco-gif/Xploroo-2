/* ==========================================================================
   XPLOROO · Manali Quiz — interactive engine
   manali-quiz.js — Drives manali-quiz.html: intro → 7-minute timed quiz
   (one question at a time, round transitions, restart-safe via
   localStorage) → cinematic result screen with a collapsible breakdown.
   Reads its question data from the global `manaliQuizQuestions`
   (js/manali-quiz-data.js, loaded first). Vanilla JS, no dependencies.
   Loaded with `defer`.

   Same architecture as js/japan-quiz.js and js/shimla-quiz.js
   (intentionally — this quiz reuses the proven engine design), but
   entirely self-contained: its own `data-mq-*` selectors, its own `mq-*`
   CSS classes, and its own localStorage key
   (`xploroo-manali-quiz-state`). It never reads or writes anything the
   Japan or Shimla quizzes use, so all three sessions can never collide.

   The source document groups its 5 sections as "ROUND 1"–"ROUND 5"
   (rather than "Section A"–"Section E" like Japan/Shimla), so this engine
   displays round numbers instead of letters — everything else about the
   flow is identical.

   Fairness: correct answers live only in `manaliQuizQuestions` (in memory /
   this script's closure) and are never written into the DOM while the quiz
   is active — rendered options carry only their own text and a 0–3 index,
   nothing that reveals correctness until the result screen.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.querySelector("[data-mq-page]");
  if (!page) return;
  if (typeof manaliQuizQuestions === "undefined" || !Array.isArray(manaliQuizQuestions)) return;

  const QUESTIONS = manaliQuizQuestions;
  const TOTAL = QUESTIONS.length;
  const QUIZ_DURATION_MS = 7 * 60 * 1000;
  const PASSING_SCORE = 35;
  const STORAGE_KEY = "xploroo-manali-quiz-state";
  const SECTION_ORDER = [];
  QUESTIONS.forEach((q) => {
    if (!SECTION_ORDER.includes(q.section)) SECTION_ORDER.push(q.section);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* DOM refs                                                             */
  /* ------------------------------------------------------------------ */
  const panels = {
    intro: page.querySelector('[data-mq-panel="intro"]'),
    quiz: page.querySelector('[data-mq-panel="quiz"]'),
    result: page.querySelector('[data-mq-panel="result"]'),
  };
  const startBtn = page.querySelector("[data-mq-start]");
  const timerWrap = page.querySelector("[data-mq-timer-wrap]");
  const timerEl = page.querySelector("[data-mq-timer]");
  const sectionBadgeEl = page.querySelector("[data-mq-section-badge]");
  const progressFillEl = page.querySelector("[data-mq-progress-fill]");
  const progressCountEl = page.querySelector("[data-mq-progress-count]");
  const progressPercentEl = page.querySelector("[data-mq-progress-percent]");
  const sectionIntroEl = page.querySelector("[data-mq-section-intro]");
  const sectionTagEl = page.querySelector("[data-mq-section-tag]");
  const sectionTitleEl = page.querySelector("[data-mq-section-title]");
  const questionEl = page.querySelector("[data-mq-question]");
  const sparkEl = page.querySelector("[data-mq-spark]");
  const qnumEl = page.querySelector("[data-mq-qnum]");
  const qnumStrongEl = qnumEl ? qnumEl.querySelector("strong") : null;
  const sectionNameEl = page.querySelector("[data-mq-section-name]");
  const qtextEl = page.querySelector("[data-mq-qtext]");
  const optionsEl = page.querySelector("[data-mq-options]");

  const resultEl = page.querySelector("[data-mq-result]");
  const resultBadgeEl = page.querySelector("[data-mq-result-badge]");
  const resultHeadlineEl = page.querySelector("[data-mq-result-headline]");
  const resultSubheadEl = page.querySelector("[data-mq-result-subhead]");
  const resultScoreEl = page.querySelector("[data-mq-result-score]");
  const statCorrectEl = page.querySelector("[data-mq-stat-correct]");
  const statIncorrectEl = page.querySelector("[data-mq-stat-incorrect]");
  const statPercentEl = page.querySelector("[data-mq-stat-percentage]");
  const statTimeEl = page.querySelector("[data-mq-stat-time]");
  const tryAgainBtn = page.querySelector("[data-mq-try-again]");
  const breakdownToggle = page.querySelector("[data-mq-breakdown-toggle]");
  const breakdownPanel = page.querySelector("[data-mq-breakdown-panel]");
  const breakdownList = page.querySelector("[data-mq-breakdown-list]");
  const resultSparkEl = page.querySelector("[data-mq-result-spark]");

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
  function roundNumber(sectionName) {
    const idx = SECTION_ORDER.indexOf(sectionName);
    return Math.max(idx, 0) + 1;
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
  /* Dedicated Manali key — never touches Japan's or Shimla's storage.    */
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
  /* Spark burst — a handful of short-lived elements (snow sparkle +      */
  /* mountain light), never a continuous particle loop. Auto-removed      */
  /* once the fall animation ends.                                        */
  /* ------------------------------------------------------------------ */
  const SPARK_GLYPHS = ["✦", "❄", "✧"];
  function burstSpark(container, count) {
    if (!container || reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = "mq-spark-flake";
      spark.textContent = SPARK_GLYPHS[i % SPARK_GLYPHS.length];
      spark.style.left = 8 + Math.random() * 84 + "%";
      spark.style.setProperty("--mq-spark-x", (Math.random() * 60 - 30).toFixed(0) + "px");
      spark.style.animationDelay = (Math.random() * 300).toFixed(0) + "ms";
      spark.style.fontSize = (0.75 + Math.random() * 0.55).toFixed(2) + "rem";
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
      btn.className = "mq-option";
      btn.setAttribute("data-option-index", String(i));
      btn.innerHTML =
        '<span class="mq-option__letter">' + letters[i] + "</span>" +
        '<span class="mq-option__text"></span>' +
        '<svg class="mq-option__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      btn.querySelector(".mq-option__text").textContent = optionText;
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
    if (sectionBadgeEl) sectionBadgeEl.textContent = "Round " + roundNumber(question.section);

    if (!opts.skipAnimation) {
      questionEl.classList.remove(
        "mq-anim-in-slide", "mq-anim-in-depth", "mq-anim-in-fade",
        "mq-flourish-sweep"
      );
      void questionEl.offsetWidth; // force reflow so the animation replays
      const variant = ENTER_VARIANTS[index % ENTER_VARIANTS.length];
      questionEl.classList.add("mq-anim-in-" + variant);
      if (index % 5 === 2) questionEl.classList.add("mq-flourish-sweep");
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
      "mq-anim-in-slide", "mq-anim-in-depth", "mq-anim-in-fade", "mq-flourish-sweep"
    );
    questionEl.classList.add("mq-anim-out-" + variant);
    window.setTimeout(() => {
      questionEl.classList.remove("mq-anim-out-" + variant);
      callback();
    }, 260);
  }

  function showSectionIntro(sectionName, callback) {
    if (!sectionIntroEl) {
      callback();
      return;
    }
    if (sectionTagEl) sectionTagEl.textContent = "Round " + roundNumber(sectionName);
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
    const btn = e.target.closest(".mq-option");
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
      resultSubheadEl.textContent = "You passed the Xploroo Manali Quiz";
    } else {
      resultBadgeEl.textContent = "🏕️";
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
      li.className = "mq-breakdown__row" + (isCorrect ? "" : " is-wrong");
      li.innerHTML =
        '<span class="mq-breakdown__icon">' + (isCorrect ? "✓" : "✕") + "</span>" +
        '<div class="mq-breakdown__body">' +
        '<p class="mq-breakdown__q">' + (i + 1) + ". " + escapeHtml(q.question) + "</p>" +
        '<p class="mq-breakdown__ans">Your answer: <strong>' + escapeHtml(userText) + "</strong></p>" +
        (isCorrect ? "" : '<p class="mq-breakdown__ans">Correct answer: <strong>' + escapeHtml(correctText) + "</strong></p>") +
        "</div>";
      breakdownList.appendChild(li);
    });
    breakdownPanel.classList.remove("is-open");
    breakdownToggle.setAttribute("aria-expanded", "false");

    if (r.passed) {
      burstSpark(resultSparkEl, 18);
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

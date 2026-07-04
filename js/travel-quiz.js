/* ==========================================================================
   XPLOROO · Travel Quiz page
   travel-quiz.js — Interactive quiz engine. Questions/options/answers live
   in the QUIZ_QUESTIONS array below (edit this to change quiz content —
   nothing else in this file needs to change). Vanilla JS, no dependencies,
   scoped entirely to [data-quiz].
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Quiz content — from "The Xploroo & Anurrag Sharma Quiz" + answer key */
  /* `answer` is the zero-based index into `options` (0=A, 1=B, 2=C, 3=D) */
  /* ------------------------------------------------------------------ */
  const QUIZ_QUESTIONS = [
    { question: "Who is the founder of Xploroo?", options: ["Anurag Singh", "Anurrag Sharma", "Anirudh Sharma", "Anupam Saha"], answer: 1 },
    { question: "How many years of experience in the hospitality industry does Anurrag Sharma bring to Xploroo?", options: ["5+ years", "10+ years", "15+ years", "20+ years"], answer: 2 },
    { question: "What is Anurrag Sharma's core approach to travel with Xploroo?", options: ["Focusing solely on luxury travel", "Blending luxury and budget travel", "Offering only budget-friendly options", "Specializing in adventure sports"], answer: 1 },
    { question: "According to Anurrag Sharma's vision, what does Xploroo aim to turn travel into?", options: ["A routine vacation", "A curated spectacle", "A simple sightseeing tour", "A business conference"], answer: 1 },
    { question: "Besides being the founder of Xploroo, Anurrag Sharma is also associated with which of the following as a director?", options: ["One company", "Two companies", "Three companies", "Four companies"], answer: 3 },
    { question: "Anurrag Sharma believes that “Early success is a scam” and that great things take time. This philosophy emphasizes:", options: ["The need for quick profits", "Patience and long-term dedication", "Avoiding all risks", "Following trends blindly"], answer: 1 },
    { question: "Anurrag Sharma is looking to collaborate with which type of personalities to showcase Xploroo?", options: ["Corporate executives", "Political leaders", "Influencers with a passion for travel, gaming, or entertainment", "Academic researchers"], answer: 2 },
    { question: "According to Anurrag Sharma, what is the final step in the Xploroo hiring process?", options: ["A phone interview", "An online test", "An on-site, face-to-face interview", "A reference check"], answer: 2 },
    { question: "Xploroo redefines group travel by combining storytelling with which two other key elements?", options: ["Luxury hotels and fine dining", "Gamification and professional crews", "Air travel and cruise ships", "Business meetings and conferences"], answer: 1 },
    { question: "What is a key focus of the Xploroo experience?", options: ["Passive observation", "Active participation", "Strict itineraries", "Solo exploration"], answer: 1 },
    { question: "Which of the following features is NOT mentioned as part of Xploroo's experience?", options: ["Quizzes", "Chat groups", "Virtual reality tours", "Organic moments"], answer: 2 },
    { question: "What kind of dedicated crews does Xploroo provide for its travelers?", options: ["Only tour guides", "Only drivers", "Team leaders, influencers, and filming crews", "Only chefs and hospitality staff"], answer: 2 },
    { question: "What is the purpose of the filming crew provided by Xploroo?", options: ["To create documentaries", "To capture moments for travelers", "To film promotional ads", "To record business meetings"], answer: 1 },
    { question: "Xploroo offers curated events for which of the following groups?", options: ["Only solo travelers", "Only families", "Influencers, corporate offsites, and custom experiences", "Only senior citizens"], answer: 2 },
    { question: "What is one of the collaboration opportunities Xploroo offers to influencers?", options: ["Becoming a company shareholder", "Sponsored content and product reviews", "Managing the company", "Designing travel packages"], answer: 1 },
    { question: "Xploroo is looking for influencers with a strong presence on which platforms?", options: ["Only LinkedIn", "Instagram, YouTube, TikTok, or Twitter", "Only Facebook", "Only blogs"], answer: 1 },
    { question: "What type of content creation skills is Xploroo looking for in influencers?", options: ["Only written content", "Only video editing", "Ability to create engaging content showcasing Xploroo's features", "Only photography skills"], answer: 2 },
    { question: "What is one of the collaboration opportunities mentioned for influencers?", options: ["Managing Xploroo's finances", "Hosting giveaways or contests featuring Xploroo", "Designing Xploroo's website", "Training Xploroo's staff"], answer: 1 },
    { question: "What does “influencer takeover” mean in the context of Xploroo's collaboration?", options: ["Influencers take over the company", "Influencers take over Xploroo's social media accounts for a day", "Influencers take over travel planning", "Influencers take over hotel bookings"], answer: 1 },
    { question: "How does Xploroo ensure the safety of its travelers?", options: ["By avoiding all risks", "Through trained leaders and vetted partners", "By traveling only in groups", "By providing insurance"], answer: 1 },
    { question: "What is Xploroo's approach to handling logistics for its travelers?", options: ["Travelers handle their own logistics", "A separate agency handles logistics", "Xploroo handles logistics so travelers can enjoy moments", "Logistics are not a priority"], answer: 2 },
    { question: "According to the content, what does Xploroo do to create memorable experiences?", options: ["Focus only on luxury", "Provide personalized and safe experiences", "Offer only budget options", "Avoid technology"], answer: 1 },
    { question: "What is the primary goal of Xploroo's approach to group travel?", options: ["To make travel expensive", "To make travel memorable, safe, and personalized", "To make travel complicated", "To make travel exclusive"], answer: 1 },
    { question: "What does Xploroo combine to create a unique travel experience?", options: ["Only luxury and comfort", "Storytelling, gamification, and professional crews", "Only adventure and excitement", "Only relaxation and leisure"], answer: 1 },
    { question: "According to the content, what is Anurrag Sharma's promise to travelers?", options: ["To provide the cheapest travel options", "To turn travel into curated spectacles and handle logistics", "To offer only luxury travel experiences", "To focus only on business travel"], answer: 1 }
  ];

  const OPTION_LETTERS = ["A", "B", "C", "D"];
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';

  const root = document.querySelector("[data-quiz]");
  if (!root) return;

  const introPanel = root.querySelector("[data-quiz-intro]");
  const stagePanel = root.querySelector("[data-quiz-stage]");
  const resultsPanel = root.querySelector("[data-quiz-results]");
  const quizCard = root.querySelector("[data-quiz-card]");

  const startBtn = root.querySelector("[data-quiz-start]");
  const currentEl = root.querySelector("[data-quiz-current]");
  const totalEl = root.querySelector("[data-quiz-total]");
  const progressFill = root.querySelector("[data-quiz-progress-fill]");
  const qNumEl = root.querySelector("[data-quiz-qnum]");
  const questionEl = root.querySelector("[data-quiz-question]");
  const optionsEl = root.querySelector("[data-quiz-options]");
  const prevBtn = root.querySelector("[data-quiz-prev]");
  const nextBtn = root.querySelector("[data-quiz-next]");
  const submitBtn = root.querySelector("[data-quiz-submit]");
  const restartBtn = root.querySelector("[data-quiz-restart]");
  const ringFill = root.querySelector("[data-quiz-ring-fill]");
  const scoreValueEl = root.querySelector("[data-quiz-score-value]");
  const scoreTotalEl = root.querySelector("[data-quiz-score-total]");
  const badgeEl = root.querySelector("[data-quiz-badge]");

  const total = QUIZ_QUESTIONS.length;
  let current = 0;
  let answers = new Array(total).fill(null);

  if (totalEl) totalEl.textContent = String(total);
  if (scoreTotalEl) scoreTotalEl.textContent = "/ " + total;

  function showPanel(panel) {
    [introPanel, stagePanel, resultsPanel].forEach((p) => {
      if (!p) return;
      p.classList.toggle("is-active", p === panel);
      p.hidden = p !== panel;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Render the current question (pure DOM update — no transition here;   */
  /* see navigateTo() below for the slide animation between questions)    */
  /* ------------------------------------------------------------------ */
  function renderQuestion() {
    const q = QUIZ_QUESTIONS[current];
    const selected = answers[current];

    if (currentEl) currentEl.textContent = String(current + 1);
    if (qNumEl) qNumEl.textContent = String(current + 1);
    if (questionEl) questionEl.textContent = q.question;
    if (progressFill) progressFill.style.width = ((current + 1) / total) * 100 + "%";

    optionsEl.innerHTML = "";
    q.options.forEach((optionText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz__option";
      btn.dataset.index = String(i);

      const letter = document.createElement("span");
      letter.className = "quiz__option-letter";
      letter.textContent = OPTION_LETTERS[i];

      const label = document.createElement("span");
      label.className = "quiz__option-label";
      label.textContent = optionText;

      btn.appendChild(letter);
      btn.appendChild(label);

      if (selected !== null) {
        btn.disabled = true;
        if (i === selected) {
          btn.classList.add("is-selected");
          letter.innerHTML = CHECK_ICON; // premium checkmark replaces the letter
        }
        if (i === q.answer) btn.classList.add("is-correct");
        else if (i === selected) btn.classList.add("is-wrong");
      }

      btn.addEventListener("click", (e) => {
        if (answers[current] !== null) return;
        spawnRipple(btn, e);
        answers[current] = i; // lock the answer immediately (prevents a second click during the ripple delay)
        // Give the ripple + click-pop a moment to play before the reveal
        // re-renders the options (a full re-render replaces the DOM nodes,
        // which would otherwise cut the ripple off before it's visible).
        window.setTimeout(renderQuestion, 220);
      });
      optionsEl.appendChild(btn);
    });

    updateNavState();
  }

  // Tiny ripple at the tap/click point — purely decorative, cleans itself up.
  function spawnRipple(btn, e) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const ripple = document.createElement("span");
    ripple.className = "quiz__ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }

  // Slide the card out, swap to the target question, slide the new one in.
  // direction: "next" (out-left, in-from-right) or "prev" (out-right, in-from-left).
  function navigateTo(newIndex, direction) {
    if (!quizCard) {
      current = newIndex;
      renderQuestion();
      return;
    }
    const outClass = direction === "prev" ? "is-out-right" : "is-out-left";
    const inClass = direction === "prev" ? "is-in-left" : "is-in-right";

    quizCard.classList.add(outClass); // animates out (base transition still active)

    window.setTimeout(() => {
      current = newIndex;
      renderQuestion();

      quizCard.classList.remove(outClass);
      quizCard.classList.add(inClass); // instant snap to the opposite offset
      void quizCard.offsetWidth; // force reflow before re-enabling the transition
      quizCard.classList.remove(inClass); // animates in (fade + slide to neutral)
    }, 320);
  }

  function updateNavState() {
    prevBtn.disabled = current === 0;

    const answered = answers[current] !== null;
    const isLast = current === total - 1;

    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
    nextBtn.disabled = !answered;
    submitBtn.disabled = !answered;
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  startBtn.addEventListener("click", () => {
    showPanel(stagePanel);
    renderQuestion();
  });

  prevBtn.addEventListener("click", () => {
    if (current === 0) return;
    navigateTo(current - 1, "prev");
  });

  nextBtn.addEventListener("click", () => {
    if (current >= total - 1) return;
    navigateTo(current + 1, "next");
  });

  submitBtn.addEventListener("click", showResults);

  restartBtn.addEventListener("click", () => {
    current = 0;
    answers = new Array(total).fill(null);
    showPanel(introPanel);
  });

  /* ------------------------------------------------------------------ */
  /* Results — score, circular ring, badge, confetti                     */
  /* ------------------------------------------------------------------ */
  const RING_RADIUS = 70;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // Ranges as specified (out of the 25-question quiz).
  function getBadge(score) {
    if (score >= 22) return "🏆 Xploroo Expert";
    if (score >= 18) return "✈️ Travel Enthusiast";
    if (score >= 12) return "🌍 Explorer";
    return "🚀 Beginner";
  }

  function showResults() {
    const score = answers.reduce((sum, a, i) => sum + (a === QUIZ_QUESTIONS[i].answer ? 1 : 0), 0);

    showPanel(resultsPanel);

    if (scoreValueEl) scoreValueEl.textContent = "0";
    if (ringFill) {
      ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
      ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    }

    // Animate the ring + counting score on the next frame so the CSS
    // transition actually runs (rather than jumping straight to the end).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pct = score / total;
        if (ringFill) ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct));
        animateScoreCount(score);
      });
    });

    if (badgeEl) badgeEl.textContent = getBadge(score);

    if (score / total > 0.9) launchConfetti();
  }

  function animateScoreCount(target) {
    if (!scoreValueEl) return;
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      scoreValueEl.textContent = String(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function launchConfetti() {
    const colors = ["#7c3aed", "#9163f1", "#22d3ee", "#ef54b4", "#ffb199"];
    const container = document.createElement("div");
    container.className = "quiz__confetti";
    document.body.appendChild(container);

    const pieceCount = 80;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement("span");
      piece.className = "quiz__confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = 2.2 + Math.random() * 1.6 + "s";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      container.appendChild(piece);
    }

    window.setTimeout(() => container.remove(), 4200);
  }

  // Start on the intro panel.
  showPanel(introPanel);
})();

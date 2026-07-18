/* ==========================================================================
   XPLOROO · Xploroo Quiz — question dataset
   xploroo-quiz-data.js — All 50 questions, options and correct answers,
   transcribed verbatim from the source document ("Xploroo quiz.docx").
   This file is loaded before js/xploroo-quiz.js and exposes a single
   global, `xplorooQuizQuestions`. Nothing here renders UI or touches the
   DOM.

   `correctAnswer` is a letter (A–D) matching the `options` array position
   (A = options[0], B = options[1], ...). It is never written into the DOM
   during the quiz — js/xploroo-quiz.js keeps scoring logic separate from
   the rendered question markup and only reveals correctness on the result
   screen, after the quiz is over.

   Entirely independent of `japanQuizQuestions`, `shimlaQuizQuestions` and
   `manaliQuizQuestions` — a separate global, a separate file, never
   loaded together with intent to share state.

   Note: the source document header lists "Time: 15 Minutes", but per
   explicit instruction this quiz uses the same 7-minute timer as the
   other three quizzes — see QUIZ_DURATION_MS in js/xploroo-quiz.js.
   ========================================================================== */
const xplorooQuizQuestions = [
  // ---------------------------------------------------------------------
  // SECTION A — About Xploroo (Q1–12)
  // ---------------------------------------------------------------------
  { question: "What is xploroo?", options: ["Food Delivery App", "India's First Creator Travel Community", "Job Portal", "Hotel Booking Site"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What is the core idea of xploroo?", options: ["Book flights", "Earn While You Travel", "Rent cars", "Sell merch"], correctAnswer: "B", section: "About Xploroo" },
  { question: "xploroo is a unit of which company?", options: ["Taj Group", "Secret Ventures", "OYO", "MakeMyTrip"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What kind of destinations does xploroo focus on for VIP Tours?", options: ["Budget Hostels", "Camping", "Luxury 4★/5★", "Day trips only"], correctAnswer: "C", section: "About Xploroo" },
  { question: "How many creators is xploroo onboarding as Founding Creators pre-launch?", options: ["50", "100", "500", "1000"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What does xploroo handle for creators?", options: ["Only Marketing", "Travel, Stay, Venue, Security, Professional Crew", "Nothing", "Only Tickets"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What tool do creators get to track bookings and earnings?", options: ["Google Sheet", "Creator Dashboard", "WhatsApp", "Instagram"], correctAnswer: "B", section: "About Xploroo" },
  { question: "Who shoots and edits content for xploroo experiences?", options: ["Creator", "Fans", "xploroo Professional Team", "No one"], correctAnswer: "C", section: "About Xploroo" },
  { question: "Official website of xploroo?", options: ["www.xploroo.com", "www.secretplaces.in", "www.travelx.com", "www.creator.in"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What do fans get in xploroo packages?", options: ["Only Photos", "Memories, Content, Signed Merchandise", "Nothing", "Discount coupons"], correctAnswer: "B", section: "About Xploroo" },
  { question: "xploroo is building which new economy in India?", options: ["Crypto Economy", "Creator-led Travel Economy", "Gaming Economy", "Food Economy"], correctAnswer: "B", section: "About Xploroo" },
  { question: "What type of packages does xploroo offer?", options: ["Solo only", "Couple only", "Solo, Couple, Family", "Group only"], correctAnswer: "C", section: "About Xploroo" },

  // ---------------------------------------------------------------------
  // SECTION B — Founder Vision – Anurag Sharma (Q13–20)
  // ---------------------------------------------------------------------
  { question: "Who is the Founder & CEO of xploroo?", options: ["Rohit Roy", "Anurag Sharma", "Charli Chauhan", "Karan Johar"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "Anurag Sharma is also Founder of which parent company?", options: ["Secret Ventures", "Google", "Zomato", "Swiggy"], correctAnswer: "A", section: "Founder Vision – Anurag Sharma" },
  { question: "What is Anurag's vision for xploroo?", options: ["Build IT company", "Bring stars and fans closer through travel", "Open restaurants", "Sell clothes"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "What term does Anurag use for top onboarded creators?", options: ["Employees", "Founding Faces / Founding Celebrities", "Interns", "Partners"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "How does Anurag describe xploroo?", options: ["Just an App", "A Movement", "A Website", "A Game"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "What is Anurag's focus for xploroo launch?", options: ["Sell products", "Build India's most trusted network of icons", "Hire staff", "Open offices"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "What background is Anurag from with Secret Ventures?", options: ["Real Estate", "Travel & Entrepreneurship", "Banking", "Education"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },
  { question: "What does Anurag believe creators should do during xploroo trips?", options: ["Handle logistics", "Focus on Experience & Connecting with Fans", "Do billing", "Manage marketing"], correctAnswer: "B", section: "Founder Vision – Anurag Sharma" },

  // ---------------------------------------------------------------------
  // SECTION C — Xploroo VIP Experiences (Q21–30)
  // ---------------------------------------------------------------------
  { question: "What is included in a VIP Meet & Greet package?", options: ["Online Zoom Call", "Lunch/Dinner + 1-on-1 interaction", "Only Photo", "Gift Hamper"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "Who manages security during xploroo events?", options: ["Creator", "Fans", "xploroo Team", "Hotel"], correctAnswer: "C", section: "Xploroo VIP Experiences" },
  { question: "What benefit do Founding Creators get?", options: ["No benefit", "Priority visibility + launch campaign feature", "Free t-shirt", "Nothing"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "How are creator earnings handled on xploroo?", options: ["After 6 months", "Fast + Transparent payouts via Dashboard", "Cheque only", "No payment"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "What kind of content does xploroo deliver to creators post-trip?", options: ["Raw footage", "Ready-to-post edited videos", "Text only", "Audio only"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "Where are all package terms and safety protocols listed?", options: ["Instagram", "VIP Section on website", "Email", "Not listed"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "Can families book xploroo experiences?", options: ["No", "Yes", "Only couples", "Only singles"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "What makes xploroo different from normal travel agencies?", options: ["Cheaper rates", "Creator + Fan experience focus", "International tours only", "Bus booking"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "xploroo focuses on which type of fan engagement?", options: ["Online only", "Real-world experiences", "Gaming", "Chat"], correctAnswer: "B", section: "Xploroo VIP Experiences" },
  { question: "What is the goal of a typical xploroo trip?", options: ["Sell products", "Create unforgettable memories", "Do ads", "Collect data"], correctAnswer: "B", section: "Xploroo VIP Experiences" },

  // ---------------------------------------------------------------------
  // SECTION D — Dream Destinations & Activities (Q31–40)
  // ---------------------------------------------------------------------
  { question: "Which activity would be part of a xploroo VIP Himachal package?", options: ["Toy Train Ride + Bonfire", "Desert Safari", "Scuba Diving", "Casino Night"], correctAnswer: "A", section: "Dream Destinations & Activities" },
  { question: "For a xploroo Goa package, what experience is likely?", options: ["Beach Dinner with Creator + Sunset Cruise", "Skiing", "Snow trek", "Cave exploration"], correctAnswer: "A", section: "Dream Destinations & Activities" },
  { question: "What content idea works best for xploroo trips?", options: ["\"24 Hours with in Rajasthan\" Vlog", "News report", "Recipe video", "Meme"], correctAnswer: "A", section: "Dream Destinations & Activities" },
  { question: "Which destination is perfect for xploroo \"Hidden Gems\" series?", options: ["Mall Road", "Mashobra / Shoghi homestays", "Bus Stand", "Airport"], correctAnswer: "B", section: "Dream Destinations & Activities" },
  { question: "What makes xploroo trips creator-friendly?", options: ["No internet", "Professional shoot crew + editing", "No photos allowed", "Solo travel only"], correctAnswer: "B", section: "Dream Destinations & Activities" },
  { question: "Which experience would fans love most on xploroo?", options: ["Group Selfie + Q&A Dinner", "Watching TV", "Reading book", "Sleeping"], correctAnswer: "A", section: "Dream Destinations & Activities" },
  { question: "Best time for xploroo to host creator trips in mountains?", options: ["Monsoon", "Summer + Winter for different vibes", "Never", "Only weekdays"], correctAnswer: "B", section: "Dream Destinations & Activities" },
  { question: "What hashtag should fans use for xploroo trips?", options: ["#travel", "#xploroo", "#food", "#fashion"], correctAnswer: "B", section: "Dream Destinations & Activities" },
  { question: "Which is a xploroo safety promise?", options: ["No safety", "End-to-end managed by xploroo team", "Fan managed", "Creator managed"], correctAnswer: "B", section: "Dream Destinations & Activities" },
  { question: "What's the most exciting part of winning a xploroo package?", options: ["Only hotel", "Travel + Stay + Meals + Content Shoot + Creator Meet", "Bus ticket", "Nothing"], correctAnswer: "B", section: "Dream Destinations & Activities" },

  // ---------------------------------------------------------------------
  // SECTION E — Creator Economy & Fun Facts (Q41–50)
  // ---------------------------------------------------------------------
  { question: "What is the biggest income opportunity for creators on xploroo?", options: ["YouTube Ads", "Monetize fan engagement through travel", "Brand posts", "Affiliate"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "How can you join xploroo as a creator?", options: ["Instagram DM", "Website Signup", "Email only", "Phone call"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "xploroo helps creators turn fan love into?", options: ["Money only", "Unforgettable real-world experiences", "Followers only", "Nothing"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "Which is a core value of xploroo?", options: ["Fast delivery", "Trust + Safety + Experience", "Low price", "Ads"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "xploroo is first of its kind in which country?", options: ["USA", "UK", "India", "Japan"], correctAnswer: "C", section: "Creator Economy & Fun Facts" },
  { question: "How does xploroo select creators for launch?", options: ["Random", "Limited 100 pre-launch slots", "Anyone can join anytime", "Paid only"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "What type of memories does xploroo create?", options: ["Digital only", "Travel + Content + Signed Merchandise", "Text messages", "None"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "What should you do if you win an xploroo travel package?", options: ["Keep it secret", "Create content and tag xploroo", "Sell it", "Cancel it"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "Which word best describes xploroo community?", options: ["Boring", "VIP + Exclusive + Creator-driven", "Crowded", "Cheap"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
  { question: "Final Q: Why should you take the xploroo quiz?", options: ["For fun", "To test knowledge + Win a Travel Package", "Waste time", "No reason"], correctAnswer: "B", section: "Creator Economy & Fun Facts" },
];

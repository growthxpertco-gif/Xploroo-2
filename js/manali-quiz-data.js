/* ==========================================================================
   XPLOROO · Manali Quiz — question dataset
   manali-quiz-data.js — All 50 questions, options and correct answers,
   transcribed verbatim from the source document ("Manali quiz.docx"). This
   file is loaded before js/manali-quiz.js and exposes a single global,
   `manaliQuizQuestions`. Nothing here renders UI or touches the DOM.

   `correctAnswer` is a letter (A–D) matching the `options` array position
   (A = options[0], B = options[1], ...). It is never written into the DOM
   during the quiz — js/manali-quiz.js keeps scoring logic separate from
   the rendered question markup and only reveals correctness on the result
   screen, after the quiz is over.

   Entirely independent of `japanQuizQuestions` and `shimlaQuizQuestions` —
   a separate global, a separate file, never loaded together with intent
   to share state.
   ========================================================================== */
const manaliQuizQuestions = [
  // ---------------------------------------------------------------------
  // ROUND 1 — Basics & Travel (Q1–10)
  // ---------------------------------------------------------------------
  { question: "Manali is located in which Indian state?", options: ["Himachal Pradesh", "Uttarakhand", "J&K", "Sikkim"], correctAnswer: "A", section: "Basics & Travel" },
  { question: "Which district is Manali part of?", options: ["Shimla", "Kullu", "Kangra", "Mandi"], correctAnswer: "B", section: "Basics & Travel" },
  { question: "Which river flows through Manali?", options: ["Ravi", "Sutlej", "Beas", "Chenab"], correctAnswer: "C", section: "Basics & Travel" },
  { question: "What is the approximate altitude of Manali?", options: ["1200m", "2050m", "3500m", "5000m"], correctAnswer: "B", section: "Basics & Travel" },
  { question: "Best months for snowfall in Manali?", options: ["Mar-May", "Jun-Aug", "Sep-Nov", "Dec-Feb"], correctAnswer: "D", section: "Basics & Travel" },
  { question: "Which tunnel connects Manali to Lahaul Valley?", options: ["Rohtang Tunnel", "Atal Tunnel", "Banihal Tunnel", "Zojila Tunnel"], correctAnswer: "B", section: "Basics & Travel" },
  { question: "Nearest airport to Manali?", options: ["Shimla", "Chandigarh", "Bhuntar, Kullu", "Dharamshala"], correctAnswer: "C", section: "Basics & Travel" },
  { question: "How many hours from Delhi to Manali by road approx?", options: ["5-6 hrs", "7-8 hrs", "9-10 hrs", "12-13 hrs"], correctAnswer: "C", section: "Basics & Travel" },
  { question: "Best time for pleasant weather and sightseeing?", options: ["Dec-Feb", "Mar-Jun", "Jul-Sep", "Oct-Nov"], correctAnswer: "B", section: "Basics & Travel" },
  { question: "Manali is a starting point for which famous highway?", options: ["NH1", "Leh-Manali Highway", "NH44", "Golden Quadrilateral"], correctAnswer: "B", section: "Basics & Travel" },

  // ---------------------------------------------------------------------
  // ROUND 2 — Tourism & Landmarks (Q11–20)
  // ---------------------------------------------------------------------
  { question: "Famous 4-floor wooden temple with no nails?", options: ["Manu Temple", "Vashisht Temple", "Hadimba Devi Temple", "Gayatri Temple"], correctAnswer: "C", section: "Tourism & Landmarks" },
  { question: "Village famous for hot springs and sulphur baths?", options: ["Naggar", "Sethan", "Vashisht", "Jana"], correctAnswer: "C", section: "Tourism & Landmarks" },
  { question: "\"Mini Switzerland of India\" near Manali?", options: ["Gulaba", "Solang Valley", "Hamta", "Kothi"], correctAnswer: "B", section: "Tourism & Landmarks" },
  { question: "Ancient castle 3km from Naggar?", options: ["Kangra Fort", "Naggar Castle", "Taragarh Fort", "Kullu Fort"], correctAnswer: "B", section: "Tourism & Landmarks" },
  { question: "Scenic park in Manali town with deodar trees?", options: ["Hidimba Park", "Van Vihar", "Club House", "Nature Park"], correctAnswer: "B", section: "Tourism & Landmarks" },
  { question: "Tibetan monastery in Manali town?", options: ["Key Monastery", "Tabo Monastery", "Gadhan Thekchhokling Gompa", "Tharpa Choeling"], correctAnswer: "C", section: "Tourism & Landmarks" },
  { question: "Pass required to reach Lahaul-Spiti from Manali?", options: ["Kunzum Pass", "Rohtang Pass", "Baralacha La", "Both B & A"], correctAnswer: "D", section: "Tourism & Landmarks" },
  { question: "Temple dedicated to the lawgiver of Manu?", options: ["Hadimba", "Manu Temple, Old Manali", "Vashisht", "Bijli Mahadev"], correctAnswer: "B", section: "Tourism & Landmarks" },
  { question: "Hill station 52km from Manali famous for art & apples?", options: ["Kasol", "Tosh", "Naggar", "Jibhi"], correctAnswer: "C", section: "Tourism & Landmarks" },
  { question: "Club House in Manali is famous for?", options: ["Shopping", "Indoor games + River view", "Skiing", "Monastery"], correctAnswer: "B", section: "Tourism & Landmarks" },

  // ---------------------------------------------------------------------
  // ROUND 3 — Hidden Gems (Q21–30)
  // ---------------------------------------------------------------------
  { question: "Secret waterfall 30-min trek from Vashisht?", options: ["Rahla Falls", "Jogini Waterfall", "Jana Falls", "Sissu Falls"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Village famous for igloos and skiing in winter?", options: ["Jana", "Sethan", "Shuru", "Kothi"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Offbeat village known for organic farms and peace?", options: ["Gulaba", "Jana Village", "Prini", "Aleo"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Less crowded skiing spot than Solang?", options: ["Kothi", "Gulaba", "Marhi", "Palchan"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Village with traditional wooden houses and valley view?", options: ["Shuru Village", "Burua", "Goshal", "Naggar"], correctAnswer: "A", section: "Hidden Gems" },
  { question: "Best spot for sunrise over Beas Valley?", options: ["Hamta Village", "Old Manali", "Vashisht", "Solang"], correctAnswer: "A", section: "Hidden Gems" },
  { question: "Trout fishing destination near Manali?", options: ["Patlikuhal", "Bajaura", "Bhuntar", "Katrain"], correctAnswer: "A", section: "Hidden Gems" },
  { question: "Cafe hub in Old Manali?", options: ["Mall Road", "Drifter's Cafe Lane", "Vashisht Market", "Naggar Market"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Hidden viewpoint for paragliders landing?", options: ["Solang", "Dobhi", "Kothi", "Prini"], correctAnswer: "B", section: "Hidden Gems" },
  { question: "Which place is called \"Apple Bowl of Himachal\" near Manali?", options: ["Kullu Valley", "Lahaul", "Spiti", "Kinnaur"], correctAnswer: "A", section: "Hidden Gems" },

  // ---------------------------------------------------------------------
  // ROUND 4 — Culture, Food & People (Q31–40)
  // ---------------------------------------------------------------------
  { question: "Traditional folk dance of Himachal?", options: ["Bhangra", "Garba", "Nati", "Ghoomar"], correctAnswer: "C", section: "Culture, Food & People" },
  { question: "Steamed Himachali bread?", options: ["Babroo", "Siddu", "Tudkiya Bhat", "Dham"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Himachali dish made with kidney beans?", options: ["Rajma Chawal", "Madra", "Chana Madra", "All of above"], correctAnswer: "D", section: "Culture, Food & People" },
  { question: "Famous festival celebrated in Kullu near Manali?", options: ["Diwali", "Holi", "Kullu Dussehra", "Lohri"], correctAnswer: "C", section: "Culture, Food & People" },
  { question: "Traditional Himachali cap?", options: ["Pahari Topi", "Kulluvi Topi", "Kinnauri Cap", "Both B & C"], correctAnswer: "D", section: "Culture, Food & People" },
  { question: "Famous woolen shawl from region?", options: ["Pashmina", "Kullu Shawl", "Kinnauri Shawl", "Chamba Rumal"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Local alcoholic drink made from barley?", options: ["Lassi", "Chhang", "Chaas", "Sharbat"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Main instruments in Nati dance?", options: ["Tabla + Sitar", "Dhol + Nagara", "Flute + Guitar", "Violin + Drum"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Traditional Himachali feast called?", options: ["Thali", "Dham", "Langar", "Bhandara"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Primary local language besides Hindi?", options: ["Punjabi", "Kulluvi/Pahari", "Dogri", "Ladakhi"], correctAnswer: "B", section: "Culture, Food & People" },

  // ---------------------------------------------------------------------
  // ROUND 5 — Adventure & Xploroo VIP (Q41–50)
  // ---------------------------------------------------------------------
  { question: "Top adventure sport in Solang Valley?", options: ["River Rafting", "Paragliding", "Scuba", "Bungee"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "Best river for rafting near Manali?", options: ["Sutlej", "Beas", "Ravi", "Chenab"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "Popular 4-day trek starting near Manali?", options: ["Valley of Flowers", "Hampta Pass", "Kedarkantha", "Triund"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "Zorbing and ATV rides are famous in?", options: ["Vashisht", "Solang Valley", "Naggar", "Jana"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "What does xploroo provide on VIP Manali trips?", options: ["Only Hotel", "Creator Meet & Greet + 4★/5★ Stay + Travel + Crew", "Bus Ticket", "Food only"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "Content delivery time by xploroo crew after trip?", options: ["7 days", "15 days", "30 days", "45 days"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "What type of content does xploroo shoot?", options: ["Reels + Vlogs + Photos", "Only Photos", "Only Vlogs", "Only Drone"], correctAnswer: "A", section: "Adventure & Xploroo VIP" },
  { question: "xploroo's mission tagline?", options: ["Travel More", "Earn While You Travel", "See The World", "Go Explore"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
  { question: "Where does xploroo list Manali packages?", options: ["http://secretplaces.in", "http://xploroo.in", "Both A & B", "http://makemytrip.com"], correctAnswer: "C", section: "Adventure & Xploroo VIP" },
  { question: "How many Founding Creators is xploroo onboarding pre-launch?", options: ["50", "100", "200", "500"], correctAnswer: "B", section: "Adventure & Xploroo VIP" },
];

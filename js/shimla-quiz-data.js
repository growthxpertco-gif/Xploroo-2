/* ==========================================================================
   XPLOROO · Shimla Quiz — question dataset
   shimla-quiz-data.js — All 50 questions, options and correct answers,
   transcribed verbatim from the source document ("shimla quiz.docx"). This
   file is loaded before js/shimla-quiz.js and exposes a single global,
   `shimlaQuizQuestions`. Nothing here renders UI or touches the DOM.

   `correctAnswer` is a letter (A–D) matching the `options` array position
   (A = options[0], B = options[1], ...). It is never written into the DOM
   during the quiz — js/shimla-quiz.js keeps scoring logic separate from
   the rendered question markup and only reveals correctness on the result
   screen, after the quiz is over.

   Entirely independent of `japanQuizQuestions` (js/japan-quiz-data.js) —
   a separate global, a separate file, never loaded together with intent
   to share state.
   ========================================================================== */
const shimlaQuizQuestions = [
  // ---------------------------------------------------------------------
  // SECTION A — Shimla Travel Basics (Q1–12)
  // ---------------------------------------------------------------------
  { question: "What is the capital of Himachal Pradesh?", options: ["Manali", "Dharamshala", "Shimla", "Kullu"], correctAnswer: "C", section: "Shimla Travel Basics" },
  { question: "Which is the famous narrow-gauge railway to Shimla, a UNESCO World Heritage Site?", options: ["Darjeeling Toy Train", "Kalka-Shimla Toy Train", "Nilgiri Express", "Shatabdi"], correctAnswer: "B", section: "Shimla Travel Basics" },
  { question: "How many hours approx from Delhi to Shimla by road?", options: ["4-5 hours", "7-8 hours", "10-11 hours", "12+ hours"], correctAnswer: "B", section: "Shimla Travel Basics" },
  { question: "What is the height of Shimla above sea level?", options: ["1200m", "1600m", "2200m", "2800m"], correctAnswer: "C", section: "Shimla Travel Basics" },
  { question: "Which is the main shopping street in Shimla?", options: ["Mall Road", "Ridge Road", "Circular Road", "Summer Hill Road"], correctAnswer: "A", section: "Shimla Travel Basics" },
  { question: "Best time to experience snowfall in Shimla?", options: ["June-July", "Sept-Oct", "Dec-Jan", "March-April"], correctAnswer: "C", section: "Shimla Travel Basics" },
  { question: "Which airport is closest to Shimla?", options: ["Chandigarh", "Jubbarhatti", "Bhuntar", "Dharamshala"], correctAnswer: "B", section: "Shimla Travel Basics" },
  { question: "What does \"Shimla\" name come from?", options: ["Goddess Shyamala", "Shivalik Hills", "Snow Hills", "River Sutlej"], correctAnswer: "A", section: "Shimla Travel Basics" },
  { question: "Which pass connects Shimla to Kinnaur?", options: ["Rohtang Pass", "Kunzum Pass", "Hatu Peak Pass", "Sach Pass"], correctAnswer: "C", section: "Shimla Travel Basics" },
  { question: "Which mode is most scenic to reach Shimla?", options: ["Bus", "Flight", "Kalka-Shimla Toy Train", "Taxi"], correctAnswer: "C", section: "Shimla Travel Basics" },
  { question: "What is the local name for Shimla residents?", options: ["Pahari", "Shimlaites", "Himachali", "Both A & C"], correctAnswer: "D", section: "Shimla Travel Basics" },
  { question: "Which month hosts the famous \"Shimla Summer Festival\"?", options: ["April", "June", "August", "October"], correctAnswer: "B", section: "Shimla Travel Basics" },

  // ---------------------------------------------------------------------
  // SECTION B — Landmarks & Hidden Gems (Q13–25)
  // ---------------------------------------------------------------------
  { question: "Which church on The Ridge is the 2nd oldest church in North India?", options: ["Christ Church", "St. Michael's", "St. Paul's", "Holy Trinity"], correctAnswer: "A", section: "Landmarks & Hidden Gems" },
  { question: "Hidden waterfall 20km from Shimla, perfect for picnics?", options: ["Jogini Falls", "Chadwick Falls", "Bhagsu Falls", "Kufri Falls"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Which palace near Shimla is now a heritage hotel?", options: ["Rashtrapati Niwas", "Wildflower Hall", "Gorton Castle", "Peterhoff"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "\"Scandal Point\" got its name from a story involving?", options: ["British General", "Maharaja of Patiala", "Local Poet", "Freedom Fighter"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Hidden village known for apples and wooden houses, 60km from Shimla?", options: ["Narkanda", "Rohru", "Rampur", "Chail"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Which temple is dedicated to Goddess Tara Devi?", options: ["Jakhoo Temple", "Tara Devi Temple", "Kali Bari", "Sankat Mochan"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Secret viewpoint with 360° view of Shimla, locals love it?", options: ["Prospect Hill", "Summer Hill", "Annandale", "Glen Forest"], correctAnswer: "A", section: "Landmarks & Hidden Gems" },
  { question: "Which British-era building houses the Indian Institute of Advanced Study?", options: ["Gaiety Theatre", "Viceregal Lodge / Rashtrapati Niwas", "Town Hall", "Gorton Castle"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Hidden gem cafe street in Shimla famous among creators?", options: ["Lakkad Bazaar", "Lower Bazaar", "Lakkar Bazaar Cafe Lane", "Cart Road"], correctAnswer: "C", section: "Landmarks & Hidden Gems" },
  { question: "Which lake is 7km from Shimla, great for boating?", options: ["Rewalsar", "Nako", "Tattapani", "None - Shimla has no natural lake"], correctAnswer: "D", section: "Landmarks & Hidden Gems" },
  { question: "\"Mashobra\" near Shimla is famous for?", options: ["Skiing", "Apple Orchards & Nature Walks", "Monasteries", "Hot Springs"], correctAnswer: "B", section: "Landmarks & Hidden Gems" },
  { question: "Hidden British-era tunnel on Mall Road?", options: ["Victoria Tunnel", "Railway Tunnel No. 103", "Mall Road Tunnel", "No tunnel exists"], correctAnswer: "C", section: "Landmarks & Hidden Gems" },
  { question: "Which village near Shimla is called \"Mini Switzerland\"?", options: ["Chail", "Kufri", "Naldehra", "Narkanda"], correctAnswer: "C", section: "Landmarks & Hidden Gems" },

  // ---------------------------------------------------------------------
  // SECTION C — Culture, Food & People (Q26–35)
  // ---------------------------------------------------------------------
  { question: "Traditional Himachali dress for women is called?", options: ["Lehenga", "Churidar", "Chamba Rumal + Ghagra", "Sari"], correctAnswer: "C", section: "Culture, Food & People" },
  { question: "Famous sweet of Shimla/Himachal?", options: ["Jalebi", "Dham + Babru", "Rasgulla", "Gulab Jamun"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "What is \"Dham\" in Himachali culture?", options: ["Dance", "Festive Feast", "Song", "Temple"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Main language spoken in Shimla?", options: ["Punjabi", "Hindi + Pahari", "Dogri", "English only"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Which folk dance is famous in Shimla region?", options: ["Bhangra", "Nati", "Garba", "Ghoomar"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "\"Siddu\" is a famous dish made of?", options: ["Wheat", "Rice", "Maize", "Bajra"], correctAnswer: "A", section: "Culture, Food & People" },
  { question: "Jakhoo Temple is dedicated to which God?", options: ["Shiva", "Hanuman", "Durga", "Krishna"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "What do locals offer at temples as prasad?", options: ["Laddoos", "Kadha + Chana", "Coconut", "Kheer"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Which festival is celebrated with bonfires in Shimla in winter?", options: ["Diwali", "Lohri", "Minjar", "Losar"], correctAnswer: "B", section: "Culture, Food & People" },
  { question: "Traditional Himachali cap is called?", options: ["Gandhi Topi", "Pahari Topi", "Turban", "Fez"], correctAnswer: "B", section: "Culture, Food & People" },

  // ---------------------------------------------------------------------
  // SECTION D — Activities & Adventure (Q36–45)
  // ---------------------------------------------------------------------
  { question: "Best place near Shimla for skiing?", options: ["Kufri", "Manali", "Solang", "Auli"], correctAnswer: "A", section: "Activities & Adventure" },
  { question: "Adventure activity at Annandale, Shimla?", options: ["Paragliding", "Golf + Picnic", "River Rafting", "Bungee"], correctAnswer: "B", section: "Activities & Adventure" },
  { question: "Which is the highest peak near Shimla for trekking?", options: ["Triund", "Hatu Peak", "Indrahar", "Pin Parvati"], correctAnswer: "B", section: "Activities & Adventure" },
  { question: "Best activity in Shimla for content creators?", options: ["Mall Road Walk + Vintage Photo Shoot", "Night Clubbing", "Casino", "Desert Safari"], correctAnswer: "A", section: "Activities & Adventure" },
  { question: "Where can you do ice skating in Shimla in winter?", options: ["Kufri", "Open Ice Skating Rink, Shimla", "Narkanda", "Chail"], correctAnswer: "B", section: "Activities & Adventure" },
  { question: "Tattapani near Shimla is famous for?", options: ["Skiing", "Hot Springs + River Rafting", "Shopping", "Temples"], correctAnswer: "B", section: "Activities & Adventure" },
  { question: "Which activity is unique to Shimla Toy Train?", options: ["Food Trolley", "Crossing 102 tunnels & 864 bridges", "AC coaches", "Night journey"], correctAnswer: "B", section: "Activities & Adventure" },
  { question: "Best place for camping near Shimla?", options: ["Chail", "Mashobra", "Naldehra", "All of the above"], correctAnswer: "D", section: "Activities & Adventure" },
  { question: "What should you NOT miss in Shimla for Instagram content?", options: ["Sunrise at The Ridge", "Mall Road at night with lights", "Toy Train Journey", "All of the above"], correctAnswer: "D", section: "Activities & Adventure" },
  { question: "Which wildlife sanctuary is 15km from Shimla?", options: ["Pin Valley", "Shimla Water Catchment Sanctuary", "Great Himalayan", "Manali Sanctuary"], correctAnswer: "B", section: "Activities & Adventure" },

  // ---------------------------------------------------------------------
  // SECTION E — Xploroo & Creator Focus (Q46–50)
  // ---------------------------------------------------------------------
  { question: "Which xploroo property is in Shoghi, near Shimla?", options: ["Wood Smoke Resort", "Taj Theog", "Clarkes Hotel", "Oberoi Cecil"], correctAnswer: "A", section: "Xploroo & Creator Focus" },
  { question: "Best content idea for xploroo Shimla package?", options: ["\"48 Hours in Shimla\" Vlog", "Political debate", "Gaming stream", "Cooking only"], correctAnswer: "A", section: "Xploroo & Creator Focus" },
  { question: "Which hidden gem would xploroo recommend for peaceful stays?", options: ["Mall Road", "Shoghi / Mashobra homestays", "Bus Stand", "Lower Bazaar"], correctAnswer: "B", section: "Xploroo & Creator Focus" },
  { question: "What must creators do on xploroo Shimla trip?", options: ["Tag @xploroo + Use #xplorooShimla", "Nothing", "Post only food", "Avoid photos"], correctAnswer: "A", section: "Xploroo & Creator Focus" },
  { question: "Win the xploroo Shimla package and you get?", options: ["Cab + Stay + Meals + Content Shoot", "Only Bus Ticket", "Only Hotel", "Nothing"], correctAnswer: "A", section: "Xploroo & Creator Focus" },
];

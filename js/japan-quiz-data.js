/* ==========================================================================
   XPLOROO · Japan Quiz — question dataset
   japan-quiz-data.js — All 50 questions, options and correct answers,
   transcribed verbatim from the source document ("japan quiz.docx"). This
   file is loaded before js/japan-quiz.js and exposes a single global,
   `japanQuizQuestions`. Nothing here renders UI or touches the DOM.

   `correctAnswer` is a letter (A–D) matching the `options` array position
   (A = options[0], B = options[1], ...). It is never written into the DOM
   during the quiz — js/japan-quiz.js keeps scoring logic separate from the
   rendered question markup and only reveals correctness on the result
   screen, after the quiz is over.
   ========================================================================== */
const japanQuizQuestions = [
  // ---------------------------------------------------------------------
  // SECTION A — Japan Travel Essentials (Q1–15)
  // ---------------------------------------------------------------------
  { question: "What is the fastest way to travel between Tokyo and Osaka?", options: ["Bus", "Bullet Train Shinkansen", "Ferry", "Domestic Flight"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "Which pass is best for unlimited train travel across Japan for tourists?", options: ["IC Card", "JR Pass", "Metro Pass", "Bus Pass"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "What does \"Ryokan\" mean in Japan?", options: ["Restaurant", "Temple", "Traditional Inn", "Shopping Mall"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "Which airport is the main international gateway to Tokyo?", options: ["Osaka Kansai", "Narita Airport", "Chitose", "Fukuoka"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "Best season for Cherry Blossoms - Sakura in Japan?", options: ["June-July", "Dec-Jan", "March-April", "Sept-Oct"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "What should you NOT do on a train in Japan?", options: ["Keep quiet", "Talk loudly on phone", "Carry luggage", "Eat light snacks"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "Which city is famous for Fushimi Inari Torii Gates?", options: ["Tokyo", "Kyoto", "Osaka", "Nara"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "Which island is home to Mount Fuji?", options: ["Hokkaido", "Shikoku", "Honshu", "Okinawa"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "What is \"Onsen\"?", options: ["Sushi Bar", "Hot Spring Bath", "Garden", "Street Food"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "Which district in Tokyo is famous for anime, manga & electronics?", options: ["Ginza", "Harajuku", "Akihabara", "Shibuya"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "Best place to see teamLab Borderless digital art museum?", options: ["Osaka", "Tokyo", "Kyoto", "Nagoya"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "What is the tipping culture in Japan?", options: ["10% Expected", "15% Expected", "No Tipping", "5% Expected"], correctAnswer: "C", section: "Japan Travel Essentials" },
  { question: "Which theme park in Osaka is very popular with Indian tourists?", options: ["Disneyland", "Universal Studios Japan", "Fuji Q", "Legoland"], correctAnswer: "B", section: "Japan Travel Essentials" },
  { question: "What is the traditional Japanese tea ceremony called?", options: ["Ikebana", "Chanoyu", "Origami", "Kabuki"], correctAnswer: "B", section: "Japan Travel Essentials" },

  // ---------------------------------------------------------------------
  // SECTION B — Japan Culture & Food (Q16–25)
  // ---------------------------------------------------------------------
  { question: "Which dish is considered Japan's national dish?", options: ["Ramen", "Sushi", "Tempura", "Udon"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "What does \"Arigato\" mean?", options: ["Hello", "Thank You", "Goodbye", "Sorry"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "Which clothing is Japan's traditional wear?", options: ["Hanbok", "Kimono", "Sari", "Cheongsam"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "Which festival is famous for giant paper lanterns in Tokyo?", options: ["Diwali", "Sanja Matsuri", "Holi", "Obon"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "What is \"Bento\"?", options: ["Soup", "Lunch Box", "Dessert", "Tea"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "Which animal is considered lucky in Japan?", options: ["Cat", "Maneki Neko", "Dog", "Crane"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "What is the art of Japanese paper folding called?", options: ["Ikebana", "Origami", "Calligraphy", "Pottery"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "Which Japanese martial art is an Olympic sport?", options: ["Karate", "Judo", "Aikido", "Kendo"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "What do Japanese people say before eating?", options: ["Namaste", "Itadakimasu", "Cheers", "Bon Appetit"], correctAnswer: "B", section: "Japan Culture & Food" },
  { question: "Which garden style is most famous in Kyoto?", options: ["Mughal Garden", "Zen Rock Garden", "French Garden", "English Garden"], correctAnswer: "B", section: "Japan Culture & Food" },

  // ---------------------------------------------------------------------
  // SECTION C — India – Japan Relations (Q26–35)
  // ---------------------------------------------------------------------
  { question: "Which Indian city has a \"Japan Town\" with many Japanese companies?", options: ["Pune", "Chennai", "Bengaluru", "Ahmedabad"], correctAnswer: "B", section: "India – Japan Relations" },
  { question: "Which Indian Prime Minister signed a major economic partnership with Japan?", options: ["Atal Bihari Vajpayee", "Narendra Modi", "Manmohan Singh", "Indira Gandhi"], correctAnswer: "B", section: "India – Japan Relations" },
  { question: "The Mumbai-Ahmedabad Bullet Train is being built with help from which country?", options: ["China", "France", "Japan", "Germany"], correctAnswer: "C", section: "India – Japan Relations" },
  { question: "Which Indian festival has similarities with Japan's Obon festival?", options: ["Holi", "Diwali", "Pitru Paksha / Ancestor remembrance", "Navratri"], correctAnswer: "C", section: "India – Japan Relations" },
  { question: "Which Japanese company is most popular in India for cars?", options: ["Toyota", "Honda", "Suzuki - Maruti", "Nissan"], correctAnswer: "C", section: "India – Japan Relations" },
  { question: "Buddhism traveled from India to Japan via which country?", options: ["Thailand", "China", "Sri Lanka", "Nepal"], correctAnswer: "B", section: "India – Japan Relations" },
  { question: "Which Indian state has strong ties with Japan for skill development?", options: ["Kerala", "Gujarat", "Rajasthan", "Goa"], correctAnswer: "B", section: "India – Japan Relations" },
  { question: "\"Lotus Temple\" in Delhi and Japanese architecture share which concept?", options: ["Minimalism", "Symmetry", "Use of Natural Light", "Domes"], correctAnswer: "C", section: "India – Japan Relations" },
  { question: "Which year did India and Japan establish diplomatic relations?", options: ["1947", "1952", "1965", "1991"], correctAnswer: "B", section: "India – Japan Relations" },
  { question: "Which Japanese brand is known for cameras and popular with Indian travel vloggers?", options: ["Sony", "Canon", "Nikon", "All of the above"], correctAnswer: "D", section: "India – Japan Relations" },

  // ---------------------------------------------------------------------
  // SECTION D — Travel, Influencers & Content Creators (Q36–50)
  // ---------------------------------------------------------------------
  { question: "Which spot in Tokyo is most filmed by travel influencers for the \"Scramble Crossing\" shot?", options: ["Ginza", "Shibuya", "Shinjuku", "Roppongi"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Best location in Japan for creator content with Mount Fuji in background?", options: ["Osaka Castle", "Lake Kawaguchi", "Nara Park", "Hiroshima"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Which Japanese cafe concept is viral among Indian food influencers?", options: ["Cat Cafe", "Maid Cafe", "Robot Cafe", "All of the above"], correctAnswer: "D", section: "Travel, Influencers & Content Creators" },
  { question: "What is the #1 tip creators give for filming in Japan?", options: ["Shoot at night only", "Respect privacy, no filming in trains/temples", "Use drone everywhere", "Film in malls"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Which Japanese city is trending for \"Street Fashion\" content by influencers?", options: ["Kyoto", "Harajuku, Tokyo", "Fukuoka", "Sapporo"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Best time for creators to shoot Sakura content without crowds?", options: ["Noon", "Early Morning 5-7 AM", "Evening", "Midnight"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Which Japanese vending machine is most loved by travel vloggers?", options: ["Drink Vending", "Hot Food Vending", "Toy Capsule Vending", "All of the above"], correctAnswer: "D", section: "Travel, Influencers & Content Creators" },
  { question: "What type of content performs best about Japan on Instagram Reels?", options: ["Political videos", "Aesthetic travel + food + culture", "Gaming", "News"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Which Japanese app is used by creators to translate menus instantly?", options: ["Google Translate", "Duolingo", "TikTok", "WhatsApp"], correctAnswer: "A", section: "Travel, Influencers & Content Creators" },
  { question: "Which Indian travel creator is famous for Japan series on YouTube?", options: ["Nomadic Indian", "Karl Rock", "Mountain Trekker", "Multiple creators have covered it"], correctAnswer: "D", section: "Travel, Influencers & Content Creators" },
  { question: "What must creators carry for monetizing YouTube videos shot in Japan?", options: ["Permit for commercial filming in some places", "Nothing", "Japanese SIM only", "Local guide"], correctAnswer: "A", section: "Travel, Influencers & Content Creators" },
  { question: "Which Japanese aesthetic is trending with Indian lifestyle influencers?", options: ["Maximalism", "Wabi-Sabi - Simple & Imperfect", "Glam", "Retro"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Best hashtag for Japan travel content on Instagram?", options: ["#IndiaTravel", "#ExploreJapan", "#JapanTrip", "#TravelVlog"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "Which experience do Indian family travel influencers recommend most in Japan?", options: ["Clubbing", "Disneyland Tokyo + teamLab", "Night bars", "Hiking only"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
  { question: "If you win the xploroo trip to Japan, what should you create first?", options: ["Political debate", "\"My First Day in Japan\" Vlog for xploroo community", "Cooking video", "Gaming stream"], correctAnswer: "B", section: "Travel, Influencers & Content Creators" },
];

/* Seoul 2-Week Itinerary — default data
 * Costs are rough estimates in KRW (₩). type: sight|food|activity|transport|rest|shopping
 * coords: [lat, lng]. All places are real with approximate coordinates.
 */
const DEFAULT_ITINERARY = {
  title: "Seoul · 2-Week Adventure",
  startDate: "2026-06-01",
  days: [
    {
      title: "Arrival & Myeongdong",
      theme: "Settle in, first taste of the city",
      area: "Jung-gu",
      items: [
        { time: "14:00", type: "transport", name: "Arrive Incheon (ICN) → AREX train", cost: 4750, coords: [37.4602, 126.4407], notes: "AREX All-Stop to Seoul Station (~60 min). T-money card recommended.", url: "https://www.arex.or.kr/main.do" },
        { time: "16:00", type: "rest", name: "Check in to hotel", cost: 0, coords: [37.5636, 126.9826], notes: "Drop bags, freshen up. Myeongdong is central & convenient." },
        { time: "18:00", type: "food", name: "Myeongdong Street Food", cost: 15000, coords: [37.5637, 126.9850], notes: "Tornado potato, hotteok, gyeranppang, lobster cheese. Cash helps." },
        { time: "20:00", type: "shopping", name: "Myeongdong Shopping & Cosmetics", cost: 0, coords: [37.5609, 126.9858], notes: "Skincare flagship stores (Olive Young), fashion. Tax-free over ₩15,000." },
        { time: "21:30", type: "sight", name: "Namsangol Hanok Village (evening stroll)", cost: 0, coords: [37.5591, 126.9940], notes: "Quiet traditional houses, lit up at night." }
      ]
    },
    {
      title: "Palaces & Old Seoul",
      theme: "Joseon-era grandeur",
      area: "Jongno-gu",
      items: [
        { time: "09:00", type: "sight", name: "Gyeongbokgung Palace", cost: 3000, coords: [37.5796, 126.9770], notes: "Wear a hanbok (rental ~₩15k) to enter free! Catch the Changing of the Guard at 10:00.", url: "https://www.royalpalace.go.kr/" },
        { time: "11:00", type: "sight", name: "National Folk Museum of Korea", cost: 0, coords: [37.5817, 126.9799], notes: "Inside palace grounds. Free entry." },
        { time: "12:30", type: "food", name: "Tosokchon Samgyetang", cost: 20000, coords: [37.5790, 126.9718], notes: "Famous ginseng chicken soup. Expect a queue at lunch." },
        { time: "14:00", type: "sight", name: "Bukchon Hanok Village", cost: 0, coords: [37.5826, 126.9830], notes: "Photogenic alleys. Be respectful — people live here, keep quiet." },
        { time: "16:00", type: "activity", name: "Insadong Art Street", cost: 0, coords: [37.5740, 126.9849], notes: "Galleries, tea houses, Ssamzigil mall, traditional crafts." },
        { time: "18:30", type: "food", name: "Gwangjang Market dinner", cost: 12000, coords: [37.5701, 126.9999], notes: "Bindaetteok (mung bean pancake), mayak gimbap, live octopus if brave." }
      ]
    },
    {
      title: "Namsan & Itaewon",
      theme: "City views and global flavors",
      area: "Yongsan-gu",
      items: [
        { time: "10:00", type: "activity", name: "Namsan Cable Car", cost: 14000, coords: [37.5512, 126.9882], notes: "Round trip. Or hike up (~30 min) for free." },
        { time: "10:45", type: "sight", name: "N Seoul Tower", cost: 16000, coords: [37.5512, 126.9882], notes: "Observation deck + love locks. Great panoramic views.", url: "https://www.nseoultower.co.kr/" },
        { time: "13:00", type: "food", name: "Itaewon lunch (global cuisine)", cost: 18000, coords: [37.5345, 126.9945], notes: "Kebabs, Thai, burgers — the international district." },
        { time: "15:00", type: "sight", name: "War Memorial of Korea", cost: 0, coords: [37.5369, 126.9774], notes: "Free, excellent museum on Korean War history. Outdoor tank/jet exhibits." },
        { time: "18:00", type: "activity", name: "Gyeongnidan-gil & Haebangchon", cost: 0, coords: [37.5390, 126.9890], notes: "Trendy hillside cafes, craft beer, sunset city views." }
      ]
    },
    {
      title: "Hongdae Youth Culture",
      theme: "Indie, street art, nightlife",
      area: "Mapo-gu",
      items: [
        { time: "11:00", type: "activity", name: "Hongdae Free Market & street performances", cost: 0, coords: [37.5563, 126.9236], notes: "Buskers, art market (weekends), youthful energy." },
        { time: "12:30", type: "food", name: "Korean BBQ lunch", cost: 25000, coords: [37.5558, 126.9230], notes: "Samgyeopsal (pork belly) — grill it yourself." },
        { time: "14:30", type: "activity", name: "Trick Eye Museum / themed cafes", cost: 17000, coords: [37.5546, 126.9220], notes: "Interactive 3D art. Or hop the famous animal & dessert cafes." },
        { time: "16:30", type: "sight", name: "Yeonnam-dong & Gyeongui Line Forest Park", cost: 0, coords: [37.5610, 126.9250], notes: "'Yeontral Park' — linear park, brunch spots, boutiques." },
        { time: "20:00", type: "activity", name: "Hongdae nightlife", cost: 20000, coords: [37.5547, 126.9258], notes: "Clubs, live music, noraebang (karaoke). Stays lively till dawn." }
      ]
    },
    {
      title: "Gangnam & COEX",
      theme: "Modern, upscale Seoul",
      area: "Gangnam-gu",
      items: [
        { time: "10:00", type: "sight", name: "Bongeunsa Temple", cost: 0, coords: [37.5150, 127.0573], notes: "Serene Buddhist temple amid skyscrapers. Temple-stay programs available." },
        { time: "11:30", type: "sight", name: "Starfield Library (COEX Mall)", cost: 0, coords: [37.5126, 127.0590], notes: "Iconic giant open library. Free, very photogenic." },
        { time: "13:00", type: "food", name: "COEX food court / Mall dining", cost: 15000, coords: [37.5118, 127.0590], notes: "Huge underground mall, aquarium, SMTOWN (K-pop)." },
        { time: "15:00", type: "activity", name: "Gangnam Style & Apgujeong Rodeo", cost: 0, coords: [37.5273, 127.0286], notes: "Luxury shopping, K-pop entertainment HQs, plastic surgery alley." },
        { time: "18:00", type: "sight", name: "Banpo Bridge Rainbow Fountain", cost: 0, coords: [37.5126, 126.9966], notes: "Evening light & water show (Apr–Oct). Picnic at Banpo Hangang Park." }
      ]
    },
    {
      title: "DMZ Day Trip",
      theme: "The world's most fortified border",
      area: "Paju / Gyeonggi-do",
      items: [
        { time: "07:30", type: "transport", name: "Join DMZ tour (pickup)", cost: 60000, coords: [37.5636, 126.9826], notes: "Book a guided tour in advance (passport required). Imjingak departure." },
        { time: "09:30", type: "sight", name: "Imjingak Park & Freedom Bridge", cost: 0, coords: [37.8895, 126.7400], notes: "Memorials, rusted train, ribbons of hope." },
        { time: "11:00", type: "sight", name: "3rd Infiltration Tunnel", cost: 0, coords: [37.9320, 126.7080], notes: "Walk into a tunnel dug by North Korea. No photos inside." },
        { time: "12:30", type: "sight", name: "Dora Observatory", cost: 0, coords: [37.9355, 126.7090], notes: "Telescopes overlooking North Korea." },
        { time: "16:00", type: "transport", name: "Return to Seoul", cost: 0, coords: [37.5636, 126.9826], notes: "Tour drops back in central Seoul." },
        { time: "19:00", type: "food", name: "Easy dinner near hotel", cost: 12000, coords: [37.5636, 126.9826], notes: "Rest — long day." }
      ]
    },
    {
      title: "Dongdaemun & Markets",
      theme: "Shopping, design, night markets",
      area: "Jung-gu",
      items: [
        { time: "11:00", type: "sight", name: "Dongdaemun Design Plaza (DDP)", cost: 0, coords: [37.5669, 127.0095], notes: "Zaha Hadid landmark. Exhibitions, LED rose garden at night.", url: "https://www.ddp.or.kr/" },
        { time: "13:00", type: "food", name: "Majang-dong / local lunch", cost: 14000, coords: [37.5700, 127.0240], notes: "Or grab makgeolli + jeon nearby." },
        { time: "15:00", type: "shopping", name: "Dongdaemun fashion wholesale", cost: 0, coords: [37.5663, 127.0090], notes: "Doota, Migliore — many shops run late into the night." },
        { time: "18:00", type: "activity", name: "Cheonggyecheon Stream walk", cost: 0, coords: [37.5696, 126.9784], notes: "Restored urban stream, lovely at dusk." },
        { time: "20:00", type: "food", name: "Gwangjang or Dongdaemun night market", cost: 13000, coords: [37.5701, 126.9999], notes: "Street eats, late-night energy." }
      ]
    },
    {
      title: "Nami Island Day Trip",
      theme: "Tree-lined romance & nature",
      area: "Chuncheon / Gangwon",
      items: [
        { time: "08:00", type: "transport", name: "ITX-Cheong to Gapyeong", cost: 9000, coords: [37.5547, 126.9707], notes: "From Yongsan/Cheongnyangni (~1hr). Or Gyeongchun subway line." },
        { time: "10:00", type: "sight", name: "Nami Island (ferry + entry)", cost: 16000, coords: [37.7906, 127.5256], notes: "Famous metasequoia lanes (Winter Sonata). Bike rentals available." },
        { time: "13:00", type: "food", name: "Chuncheon Dakgalbi", cost: 16000, coords: [37.7900, 127.5260], notes: "Spicy stir-fried chicken — the regional specialty." },
        { time: "14:30", type: "activity", name: "Petite France / Garden of Morning Calm", cost: 12000, coords: [37.7720, 127.4860], notes: "Pick one. Garden is gorgeous; Petite France is whimsical." },
        { time: "18:00", type: "transport", name: "Return to Seoul", cost: 9000, coords: [37.5547, 126.9707], notes: "Relax on the train back." }
      ]
    },
    {
      title: "Murals, Hilltops & Hanok",
      theme: "Hidden creative corners",
      area: "Jongno-gu",
      items: [
        { time: "10:00", type: "sight", name: "Ihwa Mural Village", cost: 0, coords: [37.5790, 127.0060], notes: "Hillside art village. Quiet streets, painted stairs." },
        { time: "11:30", type: "activity", name: "Naksan Park & Seoul City Wall", cost: 0, coords: [37.5805, 127.0073], notes: "Walk a stretch of the fortress wall with great views." },
        { time: "13:00", type: "food", name: "Daehangno lunch (Hyehwa)", cost: 13000, coords: [37.5821, 127.0019], notes: "Theater district, lots of cafes and student eats." },
        { time: "15:00", type: "sight", name: "Changdeokgung & Secret Garden", cost: 8000, coords: [37.5794, 126.9910], notes: "UNESCO site. Huwon (Secret Garden) needs a timed guided ticket.", url: "https://www.cdg.go.kr/" },
        { time: "18:00", type: "food", name: "Ikseon-dong Hanok alleys dinner", cost: 18000, coords: [37.5740, 126.9905], notes: "Trendy restored hanok lanes, atmospheric restaurants & bars." }
      ]
    },
    {
      title: "Seongsu & Seoul Forest",
      theme: "Brooklyn of Seoul — cafes & design",
      area: "Seongdong-gu",
      items: [
        { time: "10:30", type: "sight", name: "Seoul Forest Park", cost: 0, coords: [37.5444, 127.0374], notes: "Deer park, wetlands, art. Free and spacious." },
        { time: "12:00", type: "food", name: "Seongsu-dong brunch", cost: 17000, coords: [37.5444, 127.0557], notes: "Converted warehouse cafes, specialty coffee." },
        { time: "14:00", type: "shopping", name: "Seongsu concept stores & pop-ups", cost: 0, coords: [37.5445, 127.0560], notes: "Flagship brand spaces (often free exhibitions), boutiques." },
        { time: "16:00", type: "activity", name: "Ttukseom Hangang Park", cost: 0, coords: [37.5310, 127.0660], notes: "River park — rent a bike, ramyeon by the water." },
        { time: "19:00", type: "food", name: "Konjiam / local Korean dinner", cost: 16000, coords: [37.5445, 127.0560], notes: "Try jokbal (braised pig's trotters) or naengmyeon." }
      ]
    },
    {
      title: "Lotte World & Jamsil",
      theme: "Theme park fun",
      area: "Songpa-gu",
      items: [
        { time: "10:00", type: "activity", name: "Lotte World (Adventure + Magic Island)", cost: 62000, coords: [37.5111, 127.0980], notes: "Largest indoor theme park. Buy day pass online for slight discount.", url: "https://adventure.lotteworld.com/" },
        { time: "13:00", type: "food", name: "Lunch inside park / food street", cost: 14000, coords: [37.5111, 127.0980], notes: "Plenty of options on site." },
        { time: "17:00", type: "sight", name: "Lotte World Tower & Seoul Sky", cost: 29000, coords: [37.5125, 127.1025], notes: "One of the world's tallest towers — sunset from the observatory." },
        { time: "19:00", type: "sight", name: "Seokchon Lake (evening)", cost: 0, coords: [37.5095, 127.1010], notes: "Pleasant lakeside loop, lit up at night." }
      ]
    },
    {
      title: "Suwon Hwaseong Day Trip",
      theme: "Fortress walls & history",
      area: "Suwon / Gyeonggi-do",
      items: [
        { time: "09:00", type: "transport", name: "Subway/Train to Suwon", cost: 2000, coords: [37.5547, 126.9707], notes: "Line 1 to Suwon Station (~1hr)." },
        { time: "10:30", type: "sight", name: "Hwaseong Fortress walk", cost: 1000, coords: [37.2880, 127.0150], notes: "UNESCO 18th-century fortress. Walk the full ~5.7km wall loop." },
        { time: "12:30", type: "activity", name: "Hwaseong Haenggung Palace", cost: 1500, coords: [37.2810, 127.0130], notes: "Royal travel palace; martial arts demos some days." },
        { time: "13:30", type: "food", name: "Suwon Wang Galbi", cost: 25000, coords: [37.2820, 127.0170], notes: "Suwon's famous king-sized beef ribs." },
        { time: "15:30", type: "activity", name: "Flying Suwon balloon / Haenggungdong cafe street", cost: 8000, coords: [37.2830, 127.0120], notes: "Tethered helium balloon ride + mural village cafes." },
        { time: "18:00", type: "transport", name: "Return to Seoul", cost: 2000, coords: [37.5547, 126.9707], notes: "" }
      ]
    },
    {
      title: "Museums & Hangang",
      theme: "Culture and the river",
      area: "Yongsan-gu",
      items: [
        { time: "10:00", type: "sight", name: "National Museum of Korea", cost: 0, coords: [37.5240, 126.9803], notes: "Free, world-class. Don't miss the Pensive Bodhisattva.", url: "https://www.museum.go.kr/" },
        { time: "13:00", type: "food", name: "Lunch near Ichon", cost: 13000, coords: [37.5220, 126.9760], notes: "" },
        { time: "14:30", type: "activity", name: "Yongsan Electronics / I'Park Mall", cost: 0, coords: [37.5298, 126.9648], notes: "Gadgets galore, or skip for more river time." },
        { time: "16:00", type: "activity", name: "Hangang River cruise", cost: 16000, coords: [37.5174, 126.9966], notes: "Yeouido ferry — sunset cruise is lovely.", url: "https://www.elandcruise.com/" },
        { time: "18:30", type: "sight", name: "Yeouido Hangang Park picnic", cost: 10000, coords: [37.5285, 126.9330], notes: "Order chicken & beer ('chimaek') to the park via app." }
      ]
    },
    {
      title: "Last Bites & Departure",
      theme: "Souvenirs and farewell",
      area: "Jung-gu",
      items: [
        { time: "09:00", type: "shopping", name: "Last-minute souvenirs", cost: 30000, coords: [37.5609, 126.9858], notes: "Snacks, K-beauty, gifts. Namdaemun Market is great & cheap." },
        { time: "10:30", type: "food", name: "Final Korean breakfast/brunch", cost: 12000, coords: [37.5594, 126.9776], notes: "Maybe gukbap or a last bowl of bibimbap." },
        { time: "12:00", type: "rest", name: "Pack & check out", cost: 0, coords: [37.5636, 126.9826], notes: "Claim VAT refund at the airport for tax-free purchases." },
        { time: "13:30", type: "transport", name: "Head to Incheon (AREX)", cost: 4750, coords: [37.5547, 126.9707], notes: "Allow 3+ hours before international flight." }
      ]
    }
  ]
};

const TYPE_META = {
  sight:     { label: "Sight",     icon: "🏛️", color: "#3b82f6" },
  food:      { label: "Food",      icon: "🍜", color: "#ef4444" },
  activity:  { label: "Activity",  icon: "🎟️", color: "#8b5cf6" },
  transport: { label: "Transport", icon: "🚇", color: "#10b981" },
  shopping:  { label: "Shopping",  icon: "🛍️", color: "#f59e0b" },
  rest:      { label: "Rest",      icon: "🏨", color: "#64748b" }
};

// Handy phrases for travelers
const PHRASES = [
  { ko: "안녕하세요", rom: "Annyeonghaseyo", en: "Hello" },
  { ko: "감사합니다", rom: "Gamsahamnida", en: "Thank you" },
  { ko: "얼마예요?", rom: "Eolmayeyo?", en: "How much is it?" },
  { ko: "이거 주세요", rom: "Igeo juseyo", en: "I'll have this, please" },
  { ko: "화장실 어디예요?", rom: "Hwajangsil eodiyeyo?", en: "Where is the bathroom?" },
  { ko: "맛있어요", rom: "Masisseoyo", en: "It's delicious" },
  { ko: "계산서 주세요", rom: "Gyesanseo juseyo", en: "Check, please" },
  { ko: "영어 하세요?", rom: "Yeongeo haseyo?", en: "Do you speak English?" },
  { ko: "도와주세요", rom: "Dowajuseyo", en: "Please help me" },
  { ko: "안 매워요?", rom: "An maewoyo?", en: "Is it not spicy?" }
];

const TIPS = [
  "Get a T-money card at any convenience store — tap for subway, bus, and even some taxis.",
  "Subway is the easiest way around. Use the Naver Map or KakaoMap app (Google Maps is limited in Korea).",
  "Free public Wi-Fi is everywhere, but a rental SIM/eSIM or pocket Wi-Fi is worth it.",
  "Convenience stores (CU, GS25, 7-Eleven) are lifesavers — meals, cash, umbrellas, SIM cards.",
  "Tipping is not customary in Korea. The price is the price.",
  "Many palaces are closed on different weekdays — Gyeongbokgung closes Tuesdays.",
  "Tax-free shopping: spend ₩15,000+ at participating stores and claim a refund at the airport.",
  "Cafés are everywhere and double as workspaces/rest stops — use them to recharge."
];

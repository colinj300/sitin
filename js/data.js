/* Korea 8-day itinerary (Jun 12–20) — default data
 * Costs are rough per-person estimates in KRW (₩). type: sight|food|activity|transport|rest|shopping
 * coords: [lat, lng]. Bump `version` whenever this trip changes so saved browsers refresh it.
 */
const DEFAULT_ITINERARY = {
  version: "korea-2026-06-v2",
  title: "Korea · Seoul, Busan & the DMZ",
  startDate: "2026-06-12",
  base: "Itaewon Airbnb · 5+ people",
  days: [
    {
      title: "Arrival · Skin Analysis · Myeongdong",
      theme: "Land, skin clinic, skincare haul",
      area: "Myeongdong / Itaewon",
      transport: "Line 4: Myeongdong ↔ Jongno (Insadong); Line 6 home to Itaewon.",
      note: "Area logic: Myeongdong → Insadong → Itaewon is a straight line on subway Line 4 / Line 6. No backtracking. Bring passports for tax-refund shopping today.",
      items: [
        { time: "4:20 AM", type: "transport", name: "Land at Incheon (ICN)", cost: 4750, coords: [37.4602, 126.4407], notes: "Clear customs, grab T-money cards from the airport convenience store. Take AREX express to Seoul Station (43 min)." },
        { time: "5:30 AM", type: "transport", name: "Depart airport → Itaewon Airbnb", cost: 0, coords: [37.5345, 126.9945], notes: "Taxi or subway to the Airbnb. Drop bags, freshen up." },
        { time: "6:30 AM", type: "food", name: "Check in + 7-Eleven run", cost: 6000, coords: [37.5345, 126.9946], notes: "Nearest convenience store for breakfast — triangle kimbap, onigiri, ramen cups, banana milk. Stock up and eat at the Airbnb." },
        { time: "9:00 AM", type: "activity", name: "Lijin Skin Clinic — Myeongdong", cost: 0, coords: [37.5636, 126.9850], notes: "Top foreigner-friendly skin clinic with English-speaking doctors and skin-analysis tech (VISIA or equivalent). Personalized recommendations to guide your Olive Young shopping. Book all 5+ slots in advance via email/KakaoTalk — ~45–60 min per person, ask about group scheduling. MUST BOOK AHEAD." },
        { time: "12:00 PM", type: "food", name: "Myeongdong street food lunch", cost: 8000, coords: [37.5637, 126.9850], notes: "Tteokbokki, hotteok, egg bread, tornado potatoes — stalls run from noon. Budget ₩5,000–10,000 per person." },
        { time: "1:00 PM", type: "shopping", name: "Olive Young Myeongdong + skincare shopping", cost: 0, coords: [37.5609, 126.9847], notes: "Armed with your skin-analysis results, hit the massive Olive Young flagship. Bring your passport for on-the-spot tax refund. If the flagship is sold out, the Myeongdong Station branch (300 m away) has better stock." },
        { time: "3:00 PM", type: "sight", name: "Jogyesa Temple + Insadong wander", cost: 0, coords: [37.5715, 126.9818], notes: "10-min subway from Myeongdong. Jogyesa is peaceful and free. Insadong's teahouse alleys and Bukchon Hanok Village are right nearby — a slow afternoon to recover from the overnight flight." },
        { time: "6:30 PM", type: "food", name: "Dinner in Itaewon — home base", cost: 18000, coords: [37.5345, 126.9945], notes: "Back to Itaewon — best international food in Seoul. Try Petra (Middle Eastern), Vatos (Korean-Tex Mex), or walk the strip. Early night — you've been up 24+ hours." }
      ]
    },
    {
      title: "DMZ Day Trip",
      theme: "The North Korean border",
      area: "Paju / DMZ",
      transport: "PLK Travel bus picks up near Itaewon (~6:30 AM). Passport required.",
      note: "Passport is mandatory — the DMZ is a military zone. Book PLK Travel at plktravel.com as soon as possible; specific guides sell out by name.",
      items: [
        { time: "6:30 AM", type: "transport", name: "Bus pickup (near Itaewon / central Seoul)", cost: 60000, coords: [37.5345, 126.9945], notes: "PLK Travel picks up from major hotels — confirm your pickup point when booking. Bring your passport (required for DMZ entry, no exceptions). MUST BOOK AHEAD.", url: "https://plktravel.com" },
        { time: "Morning", type: "sight", name: "DMZ — 3rd Tunnel · Dora Observatory · Imjingak", cost: 0, coords: [37.9355, 126.7090], notes: "Walk through the Third Infiltration Tunnel dug by North Korea, look across the border from Dora Observatory, and explore the haunting Imjingak grounds. Guides are retired military officers. For a 5+ group, the 'Insider' tour with a North Korean defector Q&A is a remarkable add-on." },
        { time: "~5:00 PM", type: "transport", name: "Return to Seoul", cost: 0, coords: [37.5345, 126.9945], notes: "Drop-off near central Seoul. Easy walk or 5-min taxi back to Itaewon." },
        { time: "Evening", type: "food", name: "Itaewon dinner + explore", cost: 22000, coords: [37.5340, 126.9930], notes: "Explore your own neighborhood properly. Bogwangjung (4.9★ Korean BBQ) is a short walk and perfect for a group — open till midnight. Or wander the Itaewon strip for bars and street food." }
      ]
    },
    {
      title: "Namsan · N Seoul Tower · War Memorial",
      theme: "Views & history close to home",
      area: "Itaewon / Yongsan",
      transport: "All within ~1.5 km of the Itaewon Airbnb — mostly walkable.",
      note: "Area logic: War Memorial → N Seoul Tower → Itaewon are all within a 1.5 km radius of your Airbnb. Easiest transit day of the trip.",
      items: [
        { time: "Morning", type: "sight", name: "War Memorial of Korea", cost: 0, coords: [37.5369, 126.9774], notes: "Free entry, a 10-min walk from the Airbnb. One of the best war museums in Asia — outdoor tanks, jets, a submarine, plus gripping Korean War exhibits. Plan 2+ hours. Closed Mondays — Jun 14 is a Sunday, you're good." },
        { time: "12:00 PM", type: "food", name: "Lunch near Itaewon", cost: 12000, coords: [37.5345, 126.9945], notes: "So many options right in the neighborhood — bibimbap, a pocha lunch, or international food. Quick stop before Namsan." },
        { time: "2:00 PM", type: "sight", name: "N Seoul Tower — Namsan", cost: 16000, coords: [37.5512, 126.9882], notes: "Cable car or hike up from Itaewon (~40 min on foot). 360° views, love locks, observation deck. Time it ~1 hour before sunset (~7:30 PM in June). Buy on Klook to skip the cable-car queue.", url: "https://www.nseoultower.co.kr/" },
        { time: "5:00 PM", type: "activity", name: "Itaewon antique street + Haebangchon", cost: 0, coords: [37.5390, 126.9890], notes: "Explore the antique furniture street (Itaewon-ro 55-gil) and Haebangchon (HBC) — a hilly village of indie cafes, vintage shops, and Namsan views. Good spot for a group coffee break." },
        { time: "Evening", type: "activity", name: "Itaewon night out", cost: 25000, coords: [37.5345, 126.9945], notes: "The main strip comes alive after dark — rooftop bars, pojangmacha tents, live music. Great group night since everyone can split up and regroup easily." }
      ]
    },
    {
      title: "Busan Day Trip",
      theme: "KTX to the coast",
      area: "Busan",
      transport: "KTX from Yongsan Station (1 stop from Itaewon) → Busan, ~2.5 hr each way.",
      note: "Yongsan tip: Yongsan Station is literally one subway stop from Itaewon — use it instead of Seoul Station for the KTX. Saves 20+ minutes of transit on a long day.",
      items: [
        { time: "6:30 AM", type: "transport", name: "KTX from Yongsan Station", cost: 120000, coords: [37.5299, 126.9648], notes: "Walk/taxi from Itaewon to Yongsan Station (5 min). Arrive Busan ~9 AM. Book both legs in advance on letskorail.com or Klook. Round trip ~₩120,000/person. MUST BOOK AHEAD.", url: "https://www.letskorail.com" },
        { time: "9:30 AM", type: "sight", name: "Gamcheon Culture Village", cost: 0, coords: [35.0976, 129.0107], notes: "Korea's 'Santorini' — colorful hillside houses, murals, hidden cafes. Best in the morning before crowds. Take Bus 2 / 2-2 from Busan Station to avoid the uphill climb. Allow 1.5–2 hours." },
        { time: "12:00 PM", type: "food", name: "Jagalchi Fish Market — lunch", cost: 20000, coords: [35.0966, 129.0306], notes: "Korea's largest seafood market. Pick live seafood downstairs, have it prepared upstairs. Iconic, fresh, and affordable for a group." },
        { time: "2:00 PM", type: "sight", name: "Haeundae Beach", cost: 0, coords: [35.1587, 129.1604], notes: "1.5 km of white sand backed by high-rises — good for a June swim. Metro Line 2 from Jagalchi (30 min). Optional: Haedong Yonggungsa coastal temple is 15 min by taxi — stunning if you have energy." },
        { time: "6:00 PM", type: "sight", name: "Gwangalli Beach at sunset", cost: 15000, coords: [35.1532, 129.1185], notes: "Quieter and arguably prettier than Haeundae. Gwangan Bridge lights up at dusk — grab beers and fried chicken from a beachfront tent. One stop back on Metro Line 2." },
        { time: "8:30 PM", type: "transport", name: "KTX back to Seoul → Itaewon", cost: 0, coords: [35.1150, 129.0413], notes: "Train back arrives Seoul ~11 PM. Short taxi to the Itaewon Airbnb." }
      ]
    },
    {
      title: "Big Shopping Day — Gangnam + Seongsu",
      theme: "Malls, boutiques & baseball",
      area: "Gangnam / Seongsu",
      transport: "Line 2 ties it together: Samseong (COEX) → Seongsu → Jamsil; Line 2→6 home.",
      note: "Shopping day logic: COEX for department-level brands → Seongsu for indie/boutique finds → baseball to cap the day. All on one subway line.",
      items: [
        { time: "10:30 AM", type: "shopping", name: "COEX Mall + Starfield Library — Gangnam", cost: 0, coords: [37.5126, 127.0590], notes: "Start with the Starfield Library for photos (free, opens 10:30 AM). Then a couple of hours in COEX's underground mall — fashion, beauty, electronics, food hall. Huge and air-conditioned; easy for a group to split and meet back." },
        { time: "1:00 PM", type: "food", name: "Lunch in Gangnam", cost: 13000, coords: [37.5110, 127.0590], notes: "Plenty around COEX — Korean BBQ, bento sets, ramen. Or the Gangnam Underground Shopping Center nearby for cheap eats." },
        { time: "2:30 PM", type: "shopping", name: "Seongsu-dong ('Seoul's Brooklyn')", cost: 0, coords: [37.5445, 127.0560], notes: "15-min taxi from COEX. Converted-factory cafes, indie fashion boutiques, pop-ups, and Seoul's best specialty coffee. More local and curated than Myeongdong — great for unique finds. Budget 2 hours." },
        { time: "6:30 PM", type: "activity", name: "KBO Baseball — Jamsil Stadium", cost: 13000, coords: [37.5121, 127.0719], notes: "One stop from Seongsu (Line 2). LG Twins or Doosan Bears play here — check eng.koreabaseball.com for Jun 16. Sit in the cheering section (응원석) for cheerleaders, chants, and chicken to your seat. ~₩9,000–15,000 on Ticketpark. MUST BOOK AHEAD.", url: "https://eng.koreabaseball.com" },
        { time: "Post-game", type: "transport", name: "Subway back to Itaewon", cost: 0, coords: [37.5345, 126.9945], notes: "Line 2 to Hongik University, transfer to Line 6 to Itaewon (~35 min). Or grab a late-night bite on the Itaewon strip on the way in." }
      ]
    },
    {
      title: "Jjimjilbang · Hongdae · Pokpo Café",
      theme: "Spa day & indie Hongdae",
      area: "Insadong / Hongdae",
      transport: "Line 3/2 between Insadong, Seodaemun (Pokpo) and Hongdae.",
      note: "Hair-analysis option: Several Hongdae salons offer hair analysis / consultation — look for '헤어 진단' services. Book via Naver or Kakao beforehand if you want to add this in the afternoon.",
      items: [
        { time: "Morning", type: "activity", name: "Insadong Spa & Sauna — Jjimjilbang", cost: 22000, coords: [37.5740, 126.9849], notes: "Traditional bathhouse — hot tubs, saunas, full body scrub (때밀이). Entry ~₩22,000, scrub ~₩40,000 extra. Open 9 AM–9 PM. For this group size, call ahead to book scrub slots so you're not all waiting. Cash preferred." },
        { time: "Afternoon", type: "food", name: "Cafe Pokpo — waterfall café", cost: 8000, coords: [37.5800, 126.9400], notes: "Cult-favorite café beside an artificial waterfall in Seodaemun. Affordable drinks, peaceful outdoor seating, very photogenic. Best midday before it fills. ~15-min subway from Insadong." },
        { time: "3:00 PM", type: "shopping", name: "Hongdae — street performers + indie shopping", cost: 0, coords: [37.5563, 126.9236], notes: "15-min subway from Pokpo. Buskers start ~5–6 PM on the main strip. Great indie fashion, vintage, K-pop merch, and boutiques — a fun 'smaller stop' shopping burst with very different energy from Seongsu or Myeongdong." },
        { time: "Evening", type: "food", name: "Hongdae dinner + nightlife", cost: 20000, coords: [37.5547, 126.9230], notes: "Tons of options — Korean BBQ, ramen, western, street food. After dinner the area is great for bar-hopping or live music. Club FF (4.9★) is popular with locals and foreigners on weekends." }
      ]
    },
    {
      title: "Nature Day — Botanic Garden · Inwangsan",
      theme: "Greenhouses, a hike & a stream",
      area: "Magok / Central Seoul",
      transport: "Line 9 to Magok Naru (Botanic Park); Line 3 to Dongnimmun for Inwangsan.",
      note: "Yongmasan swap: If the group finds Inwangsan too strenuous, swap to Yongmasan Skywalk in East Seoul — flat wooden deck, barrier-free, and pairs easily with Yongma Waterfall Park nearby.",
      items: [
        { time: "Morning", type: "sight", name: "Seoul Botanic Park — Magok", cost: 5000, coords: [37.5694, 126.8350], notes: "Stunning tropical greenhouse and Mediterranean plant house (great escape from June heat). Open Tue–Sun from 9:30 AM. ₩5,000 for the conservatory; outdoor park free. Budget 2 hours. Line 9, Magok Naru Station." },
        { time: "Midday", type: "activity", name: "Inwangsan Mountain hike", cost: 0, coords: [37.5805, 126.9590], notes: "338 m peak in central Seoul — moderate 2–2.5 hr round trip through pine forest, the ancient Seoul City Wall, and shaman shrines. Summit views are among the best in the city. From Dongnimmun Station (Line 3). Wear trainers, bring water." },
        { time: "3:30 PM", type: "activity", name: "Cheonggyecheon Stream", cost: 0, coords: [37.5696, 126.9784], notes: "Post-hike recovery walk along the restored urban stream — 6 km of art installations, cascading water, shaded paths. Dip your feet in on a hot June afternoon. Beautiful lit up at dusk too." },
        { time: "Evening", type: "food", name: "Gwangjang Market dinner", cost: 12000, coords: [37.5701, 126.9999], notes: "One of Seoul's oldest covered markets, right off Cheonggyecheon. Famous for bindaetteok (mung bean pancakes), mayak gimbap, and yukhoe (beef tartare). Atmospheric and delicious for a group." }
      ]
    },
    {
      title: "Jongno · Gyeongbokgung · Last Shopping · Fly",
      theme: "Palace, final haul, departure",
      area: "Jongno / Itaewon",
      transport: "Line 3 to Gyeongbokgung; AREX from Yongsan → Incheon on Jun 20.",
      note: "Airport duty-free tip: If anyone has tax-refund slips from non-participating stores, process them at Incheon kiosks before security. Allow 30 extra minutes for the queue on busy afternoons.",
      items: [
        { time: "Jun 19 · AM", type: "sight", name: "Gyeongbokgung Palace + Bukchon Hanok Village", cost: 20000, coords: [37.5796, 126.9770], notes: "Seoul's grandest Joseon palace. Wear a hanbok (rentals right outside the gate, ~₩20,000/hr) and entry is free. Time the changing-of-the-guard ceremony. Closed Tuesdays — Jun 19 is a Friday. Walk 15 min uphill to Bukchon's tile-roofed alleyways and city views." },
        { time: "Jun 19 · PM", type: "shopping", name: "Final shopping sweep — Myeongdong or Namdaemun", cost: 0, coords: [37.5594, 126.9776], notes: "Last-chance Olive Young run if anyone needs to top up. Namdaemun Market is nearby — Korea's largest traditional market for clothes, accessories, street food, and souvenirs at wholesale prices. Great for last-minute gifts." },
        { time: "Jun 19 · Eve", type: "food", name: "Farewell dinner — Itaewon", cost: 25000, coords: [37.5340, 126.9930], notes: "Final meal back at home base. Korean BBQ as a group send-off — Bogwangjung (5-min walk, 4.9★) is perfect. Stock up on convenience-store snacks for the flight home." },
        { time: "Jun 20 · AM", type: "transport", name: "Check out + AREX to Incheon", cost: 4750, coords: [37.5299, 126.9648], notes: "Mid-afternoon departure — leave the Airbnb by 11 AM. Yongsan Station (one stop from Itaewon) has a direct AREX express to Incheon Terminal 1 in 43 min. Arrive 3 hrs before your flight; T1 duty-free airside for last-minute shopping." }
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

/* ---------- Transport ---------- */
// Seoul Metro lines. Times are typical published schedules (offline estimates, not live).
// headPeak / headOff = minutes between trains (peak vs off-peak). Hours in 24h "HH:MM".
const METRO_LINES = [
  { id: "1", name: "Line 1",  color: "#0052A4", headPeak: 4, headOff: 7,  first: "05:15", last: "00:00", note: "Soyosan ↔ Incheon/Sinchang. Oldest, longest line." },
  { id: "2", name: "Line 2",  color: "#00A84D", headPeak: 2.5, headOff: 5, first: "05:30", last: "00:30", note: "Green loop line — Hongik Univ, Gangnam, Jamsil, City Hall." },
  { id: "3", name: "Line 3",  color: "#EF7C1C", headPeak: 3.5, headOff: 6, first: "05:20", last: "00:10", note: "Gyeongbokgung, Anguk (Bukchon), Apgujeong, Express Bus Terminal." },
  { id: "4", name: "Line 4",  color: "#00A4E3", headPeak: 3.5, headOff: 6, first: "05:25", last: "00:05", note: "Myeongdong, Dongdaemun, Seoul Station, Hyehwa." },
  { id: "5", name: "Line 5",  color: "#996CAC", headPeak: 4, headOff: 7,  first: "05:30", last: "00:00", note: "Gimpo Airport, Yeouido, Gwanghwamun, Dongdaemun History & Culture Park." },
  { id: "6", name: "Line 6",  color: "#CD7C2F", headPeak: 4.5, headOff: 8, first: "05:30", last: "00:00", note: "Itaewon, Hangangjin, World Cup Stadium, Sangsu (Hongdae)." },
  { id: "7", name: "Line 7",  color: "#747F00", headPeak: 4, headOff: 7,  first: "05:30", last: "00:00", note: "Gangnam (Express Bus Terminal), Konkuk Univ, Ttukseom Resort." },
  { id: "8", name: "Line 8",  color: "#E6186C", headPeak: 5, headOff: 9,  first: "05:30", last: "23:50", note: "Jamsil, Lotte World, Seokchon, Moran." },
  { id: "9", name: "Line 9",  color: "#BDB092", headPeak: 4, headOff: 7,  first: "05:30", last: "00:00", note: "Gimpo Airport ↔ Gangnam. Express trains skip stops (faster)." },
  { id: "A", name: "AREX (Airport)", color: "#0090D2", headPeak: 6, headOff: 12, first: "05:20", last: "00:00", note: "Incheon Airport ↔ Seoul Station. All-stop ₩4,750; Express ~43 min." },
  { id: "SB", name: "Sinbundang", color: "#D4003B", headPeak: 5, headOff: 8, first: "05:30", last: "00:00", note: "Gangnam ↔ Gwanggyo. Fast, but small surcharge on top of base fare." },
  { id: "GB", name: "Suin–Bundang", color: "#FABE00", headPeak: 6, headOff: 10, first: "05:30", last: "00:00", note: "Wangsimni, Seoul Forest, Apgujeong Rodeo, Gangnam-gu Office." }
];

const TRANSPORT_INFO = {
  fareBase: 1400,           // KRW, base fare with T-money (first 10 km)
  fareStep: "+₩100 per 5 km beyond 10 km (≈ +₩100 per ~5 km up to 50 km).",
  cashSurcharge: 100,       // single-journey paper ticket costs ₩100 more + ₩500 refundable deposit
  transferFree: true,
  peakWindows: [["07:00", "09:00"], ["18:00", "20:00"]],
  notes: [
    "Tap a T-money card on entry AND exit — fares are distance-based.",
    "Transfers between subway lines and to buses are free within 30 min (4 transfers).",
    "Buy/refill T-money at any convenience store or station machine. ₩500 buys the card.",
    "Use Naver Map or KakaoMap for live routing — Google Maps transit is limited in Korea.",
    "Trains are frequent: every 2–5 min at peak, 6–10 min late evening. Avoid 08:00–09:00 rush.",
    "Last trains leave terminals around midnight — check the last-train time for your line."
  ]
};

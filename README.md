# Seoul · 2-Week Interactive Itinerary 🇰🇷

A fully interactive, self-contained travel itinerary webapp for a two-week trip to Seoul.
**No login, no build step, no paid API keys** — just open it in a browser.

## ✨ Features

- **14-day curated itinerary** with real Seoul attractions, food spots, day trips (DMZ, Nami Island, Suwon) and approximate coordinates.
- **Interactive map** (Leaflet + OpenStreetMap, no API key) — numbered markers per day, a dashed route line connecting stops, click any activity to fly to it.
- **Check off activities** as you go, with a live completion progress bar.
- **Add / edit / delete** your own activities — fully customizable.
- **Budget tracker** — per-day totals, category breakdown, and a grand total per person with live USD conversion.
- **Offline currency converter** with an editable exchange rate.
- **Search & filter** by keyword or activity type (sights, food, transport, etc.).
- **Packing checklist** you can edit, plus handy **Korean phrases** and **travel tips**.
- **Day navigation rail** that follows your scroll.
- **Dark mode**, fully responsive (mobile / tablet / desktop).
- **Save / Export / Import / Print** — all data lives in your browser's `localStorage`; export to JSON to back up or share.

## 🚀 How to run

It's a static site. Any of these work:

```bash
# Option 1 — just open the file
open index.html        # macOS
xdg-open index.html    # Linux

# Option 2 — serve locally (recommended; some browsers restrict file:// )
python3 -m http.server 8000
# then visit http://localhost:8000
```

No installation, no dependencies to fetch beyond the two CDN files (Leaflet) loaded automatically.

## 🗂 Project structure

```
index.html      # markup
css/styles.css  # styling + dark mode + responsive + print
js/data.js      # the default itinerary data (edit to customize)
js/app.js       # all the interactivity
```

## 🔧 Customizing the itinerary

Edit `js/data.js` to change the default trip, or just use the in-app **+ Add activity** /
**Edit** buttons — your edits are saved automatically in the browser. Use **Export** to
save a JSON backup and **Reset** to return to the bundled default.

## Privacy

Everything runs client-side. Your changes never leave your device.
The only external requests are to OpenStreetMap for map tiles and unpkg for the Leaflet library.

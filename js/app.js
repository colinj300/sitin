/* Seoul Itinerary — app logic. No frameworks, no API keys. State in localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "seoul-itinerary-v1";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- State ----------
  const state = load();

  function freshState() {
    return {
      itinerary: structuredClone(DEFAULT_ITINERARY),
      done: {},            // item id -> true
      packing: defaultPacking(),
      places: defaultPlaces(),
      notes: "",
      expenses: defaultExpenses(),
      theme: "light",
      activeFilters: [],   // type filter; empty = all
      search: "",
      hideDone: false,
      rate: 1370,
      activeDay: 0
    };
  }
  function defaultExpenses() {
    return {
      members: [],                 // {id, name}
      baseCurrency: "KRW",
      rates: { KRW: 1, USD: 1370, EUR: 1480, GBP: 1740, JPY: 9, AUD: 910, CAD: 1000 },
      list: [],                    // {id, desc, amount, currency, date, category, paidBy:{mid:amt}, split:{type, among:[mid], values:{mid:n}}}
      settlements: []              // {id, from, to, amount(baseMinor), date, note}
    };
  }
  function defaultPlaces() {
    // Reusable spots. ids are assigned by ensureIds(). Edit "Home" with your own address.
    return [
      { emoji: "🏠", name: "Itaewon Airbnb", type: "rest", address: "Itaewon, Yongsan-gu, Seoul", coords: [37.5345, 126.9945], cost: 0, time: "", url: "", notes: "Back to the Airbnb to rest." }
    ];
  }
  function defaultPacking() {
    return [
      "Passport & copies", "T-money card", "Universal power adapter (Type C/F)",
      "Comfortable walking shoes", "Portable charger", "Rain jacket / umbrella",
      "Reusable water bottle", "Hand sanitizer & tissues", "Translation app (Papago)",
      "eSIM / pocket Wi-Fi"
    ].map(t => ({ text: t, done: false }));
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      const s = Object.assign(freshState(), parsed);
      // If the bundled trip has a newer version, replace the itinerary (but keep
      // personal stuff: packing list, saved places, theme, rate, filters).
      if (!parsed.itinerary || parsed.itinerary.version !== DEFAULT_ITINERARY.version) {
        s.itinerary = structuredClone(DEFAULT_ITINERARY);
        s.done = {};
        s.activeDay = 0;
      }
      return s;
    } catch { return freshState(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    pushSync();
  }

  // Stable per-item ids so completion survives reordering / moving between days.
  const uid = () => "i" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  function ensureIds() {
    state.itinerary.days.forEach(day => day.items.forEach(it => { if (!it.id) it.id = uid(); }));
    (state.places || (state.places = [])).forEach(p => { if (!p.id) p.id = uid(); });
    if (!state.expenses) state.expenses = defaultExpenses();
    const ex = state.expenses;
    (ex.members || (ex.members = [])).forEach(m => { if (!m.id) m.id = uid(); });
    (ex.list || (ex.list = [])).forEach(e => { if (!e.id) e.id = uid(); });
    (ex.settlements || (ex.settlements = [])).forEach(s => { if (!s.id) s.id = uid(); });
    if (!ex.rates) ex.rates = defaultExpenses().rates;
    if (!ex.baseCurrency) ex.baseCurrency = "KRW";
    repairRates();
    ex.rates[ex.baseCurrency] = 1;
  }
  // Migrate legacy "dayIndex-itemIndex" completion keys to id-based keys (one-time).
  function migrateDone() {
    const keys = Object.keys(state.done || {});
    if (!keys.some(k => /^\d+-\d+$/.test(k))) return;
    const nd = {};
    keys.forEach(k => {
      const m = k.match(/^(\d+)-(\d+)$/);
      if (m) {
        const it = state.itinerary.days[+m[1]] && state.itinerary.days[+m[1]].items[+m[2]];
        if (it && state.done[k]) nd[it.id] = true;
      } else if (state.done[k]) { nd[k] = true; }
    });
    state.done = nd;
  }

  // ---------- Helpers ----------
  const fmtKRW = n => "₩" + Math.round(n).toLocaleString("en-US");
  const fmtDate = ds => new Date(ds + "T00:00:00")
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  // The actual ISO date (YYYY-MM-DD) of a day: explicit day.date wins, else startDate + index.
  const dayISO = i => {
    const day = state.itinerary.days[i];
    if (day && day.date) return day.date;
    if (!state.itinerary.startDate) return "";
    const d = new Date(state.itinerary.startDate + "T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  };
  const dayDate = i => { const iso = dayISO(i); return iso ? fmtDate(iso) : ""; };
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._t);
    t._t = setTimeout(() => (t.hidden = true), 2200);
  }

  // ---------- Map ----------
  let map, markerLayer, routeLayer;
  function initMap() {
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView([37.5665, 126.9780], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);
  }
  function renderMap() {
    if (!map) return;
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    const day = state.itinerary.days[state.activeDay];
    if (!day) return;
    const pts = [];
    day.items.forEach((it, i) => {
      if (!Array.isArray(it.coords) || it.coords.length !== 2) return;
      const meta = TYPE_META[it.type] || TYPE_META.sight;
      const icon = L.divIcon({
        className: "",
        html: `<div class="marker-num" style="background:${meta.color}">${i + 1}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
      });
      const m = L.marker(it.coords, { icon }).addTo(markerLayer);
      m.bindPopup(
        `<b>${escapeHtml(it.name)}</b><br>${meta.icon} ${meta.label}` +
        (it.time ? ` · ${it.time}` : "") +
        (it.cost ? `<br>${fmtKRW(it.cost)}` : "") +
        (it.notes ? `<br><span style="color:#666">${escapeHtml(it.notes)}</span>` : "")
      );
      pts.push(it.coords);
    });
    if (pts.length > 1) {
      L.polyline(pts, { color: "#4f46e5", weight: 3, opacity: .5, dashArray: "6 8" }).addTo(routeLayer);
    }
    if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 15 });
  }
  function flyTo(coords) {
    if (map && coords) {
      setMobileView("map");           // on phones, jump to the map view
      setTimeout(() => map.flyTo(coords, 16, { duration: .6 }), 60);
    }
  }

  // ---------- Directions (deep-links to native map apps; free, no API key) ----------
  function openDirections(name, coords) {
    if (!Array.isArray(coords) || coords.length !== 2) return;
    const [lat, lng] = coords;
    const n = encodeURIComponent(name || "Destination");
    const host = location.host || "korea-itinerary";
    $("#dir-title").textContent = name || "Directions";
    $("#dir-kakao").href = `https://map.kakao.com/link/to/${n},${lat},${lng}`;
    // Naver: app deep-link (transit) — works on phones with the Naver Map app installed
    $("#dir-naver").href = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${n}&appname=${host}`;
    $("#dir-google").href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
    $("#dir-backdrop").hidden = false;
  }
  function closeDirections() { $("#dir-backdrop").hidden = true; }

  // ---------- Mobile view switching (Plan / Map) ----------
  function setMobileView(view) {
    if (!window.matchMedia || !window.matchMedia("(max-width: 760px)").matches) return;
    const map_ = view === "map";
    document.body.classList.toggle("view-map", map_);
    document.body.classList.toggle("view-list", !map_);
    $$("#mobile-nav button[data-view]").forEach(b =>
      b.classList.toggle("active", b.dataset.view === (map_ ? "map" : "list")));
    if (map_ && map) setTimeout(() => { map.invalidateSize(); renderMap(); }, 80);
  }

  // ---------- Render itinerary ----------
  function matchesFilters(it) {
    if (state.activeFilters.length && !state.activeFilters.includes(it.type)) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = `${it.name} ${it.notes || ""} ${it.type}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderItinerary() {
    const root = $("#itinerary");
    root.innerHTML = "";
    state.itinerary.days.forEach((day, di) => {
      const visibleItems = day.items
        .map((it, ii) => ({ it, ii }))
        .filter(({ it, ii }) => {
          if (!matchesFilters(it)) return false;
          if (state.hideDone && state.done[it.id]) return false;
          return true;
        });

      // When searching/filtering, hide days with no matches
      if ((state.search || state.activeFilters.length) && !visibleItems.length) return;

      const dayCost = day.items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
      const card = document.createElement("section");
      card.className = "day-card";
      card.id = `day-${di}`;
      card.innerHTML = `
        <div class="day-header">
          <div style="display:flex; gap:14px; align-items:flex-start;">
            <div class="day-badge">Day ${di + 1}<small>${dayDate(di) || "&nbsp;"}</small></div>
            <div class="day-headinfo">
              <h2>${escapeHtml(day.title)}</h2>
              <div class="theme">${escapeHtml(day.theme || "")}</div>
              <div class="area">📍 ${escapeHtml(day.area || "Seoul")}</div>
              ${day.transport ? `<div class="day-transport">🚇 ${escapeHtml(day.transport)}</div>` : ""}
            </div>
          </div>
          <div class="day-meta">
            <button class="day-edit-btn" data-editday="${di}" title="Edit day">✏️</button>
            <div class="day-cost">${fmtKRW(dayCost)}</div>
            <div>${day.items.length} stops</div>
          </div>
        </div>
        <ul class="items"></ul>
        <button class="add-item-btn" data-add="${di}">+ Add activity to Day ${di + 1}</button>
      `;
      const ul = $(".items", card);
      visibleItems.forEach(({ it, ii }) => ul.appendChild(renderItem(day, di, it, ii)));
      if (day.note) {
        const noteEl = document.createElement("div");
        noteEl.className = "day-note";
        noteEl.innerHTML = `💡 ${escapeHtml(day.note)}`;
        card.insertBefore(noteEl, $(".add-item-btn", card));
      }
      root.appendChild(card);
    });
    if (!root.children.length) {
      root.innerHTML = `<p class="muted" style="text-align:center; padding:40px;">No activities match your search/filters.</p>`;
    }
    // "Add day" row (hidden while searching/filtering to avoid confusion)
    if (!state.search && !state.activeFilters.length) {
      const row = document.createElement("div");
      row.className = "add-day-row";
      row.innerHTML = `<button id="add-day-inline">📅 Add another day</button>`;
      row.querySelector("button").addEventListener("click", () => openDayModal(null));
      root.appendChild(row);
    }
  }

  function renderItem(day, di, it, ii) {
    const meta = TYPE_META[it.type] || TYPE_META.sight;
    const li = document.createElement("li");
    const isDone = !!state.done[it.id];
    li.className = "item" + (isDone ? " done" : "");
    const hasCoords = Array.isArray(it.coords) && it.coords.length === 2;
    li.innerHTML = `
      <input type="checkbox" class="item-check" ${isDone ? "checked" : ""} title="Mark done" />
      <div class="item-time">${escapeHtml(it.time || "")}</div>
      <div class="item-body">
        <div class="item-name">
          ${escapeHtml(it.name)}
          <span class="type-tag" style="background:${meta.color}">${meta.icon} ${meta.label}</span>
        </div>
        ${it.notes ? `<div class="item-notes">${escapeHtml(it.notes)}</div>` : ""}
        <div class="item-links">
          ${hasCoords ? `<button class="dir-btn" data-dir="${ii}">🧭 Directions</button>` : ""}
          ${hasCoords ? `<button data-focus="${di}-${ii}">📍 Map</button>` : ""}
          ${it.url ? `<a href="${escapeAttr(it.url)}" target="_blank" rel="noopener">🔗 Website</a>` : ""}
          <button data-edit="${di}-${ii}">✏️ Edit</button>
        </div>
      </div>
      <div class="item-right">
        <div class="item-cost">${it.cost ? fmtKRW(it.cost) : "Free"}</div>
      </div>
    `;
    // events
    $(".item-check", li).addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.done[it.id]) delete state.done[it.id]; else state.done[it.id] = true;
      save(); li.classList.toggle("done"); renderStats();
    });
    li.addEventListener("click", (e) => {
      if (e.target.closest("a") || e.target.closest("button") || e.target.closest("input")) return;
      if (hasCoords) flyTo(it.coords);
    });
    const focusBtn = $("[data-focus]", li);
    if (focusBtn) focusBtn.addEventListener("click", (e) => { e.stopPropagation(); flyTo(it.coords); });
    const dirBtn = $("[data-dir]", li);
    if (dirBtn) dirBtn.addEventListener("click", (e) => { e.stopPropagation(); openDirections(it.name, it.coords); });
    $("[data-edit]", li).addEventListener("click", (e) => { e.stopPropagation(); openModal(di, ii); });
    return li;
  }

  // ---------- Day rail ----------
  function renderRail() {
    const rail = $("#day-rail");
    rail.innerHTML = "";
    state.itinerary.days.forEach((day, di) => {
      const b = document.createElement("button");
      b.className = di === state.activeDay ? "active" : "";
      b.innerHTML = `<span class="rail-day">Day ${di + 1} · ${dayDate(di) || ""}</span>
                     <span class="rail-title">${escapeHtml(day.title)}</span>`;
      b.addEventListener("click", () => {
        state.activeDay = di; save();
        renderRail(); renderMap();
        document.getElementById(`day-${di}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      rail.appendChild(b);
    });
  }

  // ---------- Stats ----------
  function renderStats() {
    const days = state.itinerary.days;
    let total = 0, count = 0, done = 0;
    days.forEach((day) => day.items.forEach((it) => {
      count++; total += Number(it.cost) || 0;
      if (state.done[it.id]) done++;
    }));
    $("#stat-days").textContent = days.length;
    $("#stat-activities").textContent = count;
    const pct = count ? Math.round((done / count) * 100) : 0;
    $("#stat-done").textContent = pct + "%";
    $("#stat-budget").textContent = fmtKRW(total);
    $("#progress-bar").style.width = pct + "%";
    renderBudget(total);
  }

  function renderBudget(total) {
    const byType = {};
    state.itinerary.days.forEach(day => day.items.forEach(it => {
      byType[it.type] = (byType[it.type] || 0) + (Number(it.cost) || 0);
    }));
    const root = $("#budget-breakdown");
    root.innerHTML = "";
    Object.keys(TYPE_META).forEach(type => {
      const amt = byType[type] || 0;
      if (!amt) return;
      const meta = TYPE_META[type];
      const pct = total ? (amt / total) * 100 : 0;
      const row = document.createElement("div");
      row.className = "budget-row";
      row.innerHTML = `<span title="${meta.label}">${meta.icon}</span>
        <div class="bar"><div style="width:${pct}%; background:${meta.color}"></div></div>
        <span class="amt">${fmtKRW(amt)}</span>`;
      root.appendChild(row);
    });
    const usd = total / (state.rate || 1370);
    const totalRow = document.createElement("div");
    totalRow.className = "budget-row";
    totalRow.style.marginTop = "6px";
    totalRow.innerHTML = `<strong style="flex:1">Total / person</strong>
      <span class="amt"><strong>${fmtKRW(total)}</strong><br><span class="muted">≈ $${usd.toFixed(0)}</span></span>`;
    root.appendChild(totalRow);
  }

  // ---------- Filters ----------
  function renderFilters() {
    const root = $("#type-filters");
    root.innerHTML = "";
    Object.entries(TYPE_META).forEach(([type, meta]) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (state.activeFilters.includes(type) ? " active" : "");
      chip.innerHTML = `${meta.icon} ${meta.label}`;
      chip.addEventListener("click", () => {
        const i = state.activeFilters.indexOf(type);
        if (i >= 0) state.activeFilters.splice(i, 1); else state.activeFilters.push(type);
        save(); renderFilters(); renderItinerary();
      });
      root.appendChild(chip);
    });
  }

  // ---------- Modal (add/edit) ----------
  function fillTypeSelect(sel) {
    sel.innerHTML = "";
    Object.entries(TYPE_META).forEach(([t, m]) => {
      const o = document.createElement("option");
      o.value = t; o.textContent = `${m.icon} ${m.label}`;
      sel.appendChild(o);
    });
  }
  function buildTypeSelect() { fillTypeSelect($("#f-type")); fillTypeSelect($("#p-type")); }
  let editingId = null;  // id of the item being edited, or null when adding

  function buildDaySelect(selectedIndex) {
    const sel = $("#f-day");
    sel.innerHTML = "";
    state.itinerary.days.forEach((day, di) => {
      const o = document.createElement("option");
      o.value = String(di);
      const date = dayDate(di);
      o.textContent = `Day ${di + 1}${date ? " · " + date : ""} — ${day.title}`;
      sel.appendChild(o);
    });
    const nw = document.createElement("option");
    nw.value = "new"; nw.textContent = "➕ Create a new day…";
    sel.appendChild(nw);
    sel.value = selectedIndex == null ? "new" : String(selectedIndex);
    toggleNewDayFields();
  }
  function toggleNewDayFields() {
    const isNew = $("#f-day").value === "new";
    $("#f-newday-fields").hidden = !isNew;
    if (isNew && !$("#f-newdate").value) $("#f-newdate").value = nextDayISO();
  }
  function nextDayISO() {
    const n = state.itinerary.days.length;
    if (!state.itinerary.startDate && !(state.itinerary.days[n - 1] || {}).date) return "";
    return dayISO(n - 1) ? addDaysISO(dayISO(n - 1), 1) : "";
  }
  function addDaysISO(iso, delta) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  // ii: item index within day di. Pass (di, null) to add to a day, (null, null) to add (day chooser open).
  function openModal(di, ii) {
    const editing = di != null && ii != null;
    editingId = editing ? state.itinerary.days[di].items[ii].id : null;
    $("#f-itemIndex").value = editing ? `${di}:${ii}` : "";
    $("#modal-title").textContent = editing ? "Edit activity" : "Add activity";
    $("#f-delete").hidden = !editing;
    const it = editing ? state.itinerary.days[di].items[ii] : {};
    buildDaySelect(editing ? di : (di != null ? di : (state.itinerary.days.length ? state.activeDay : null)));
    $("#f-time").value = it.time || "";
    $("#f-type").value = it.type || "sight";
    $("#f-name").value = it.name || "";
    $("#f-cost").value = it.cost || "";
    $("#f-url").value = it.url || "";
    $("#f-notes").value = it.notes || "";
    $("#f-coords").value = Array.isArray(it.coords) ? it.coords.join(", ") : "";
    $("#f-adv").open = !!(it.url || (Array.isArray(it.coords) && it.coords.length === 2));
    renderQuickfill(editing);  // saved-place shortcuts (only useful when adding)
    $("#modal-backdrop").hidden = false;
    setTimeout(() => $("#f-name").focus(), 50);
  }
  function closeModal() { $("#modal-backdrop").hidden = true; editingId = null; }
  function parseCoords(str) {
    if (!str.trim()) return null;
    const parts = str.split(",").map(s => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every(n => !isNaN(n))) return parts;
    return null;
  }
  // Convert a human time label into sortable minutes. Handles "9:00 AM", "13:00",
  // "~5:00 PM", descriptive words ("Morning", "Post-game"), and "Jun 19 · AM" date prefixes.
  function timeValue(str) {
    if (!str) return 1e9;
    let s = String(str).toLowerCase().trim();
    let base = 0;
    const jun = s.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})/);
    if (jun) { base = parseInt(jun[1], 10) * 1440; s = s.replace(jun[0], "").trim(); }
    s = s.replace(/^[~≈]\s*/, "").replace(/^(around|about|approx\.?)\s+/, "").replace(/^[·•\-\s]+/, "");
    const clock = s.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/);
    if (clock) {
      let h = parseInt(clock[1], 10); const min = parseInt(clock[2], 10);
      const ap = clock[3] ? clock[3].replace(/\./g, "") : "";
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      return base + h * 60 + min;
    }
    const hour = s.match(/\b(\d{1,2})\s*(am|pm)\b/);
    if (hour) {
      let h = parseInt(hour[1], 10);
      if (hour[2] === "pm" && h < 12) h += 12;
      if (hour[2] === "am" && h === 12) h = 0;
      return base + h * 60;
    }
    const kw = [
      [/dawn|sunrise/, 360], [/early\s*morning/, 420], [/morning/, 540],
      [/midday|noon|lunch/, 720], [/early\s*afternoon/, 780], [/late\s*afternoon/, 960],
      [/afternoon/, 840], [/sunset|dusk/, 1140], [/evening|\beve\b/, 1170],
      [/night|nightlife/, 1260], [/post[-\s]?game|post/, 1320], [/late/, 1380],
      [/\bam\b/, 540], [/\bpm\b/, 840]
    ];
    for (const [re, val] of kw) if (re.test(s)) return base + val;
    return base + 1e6; // unknown times sort after known ones (within the same day/date)
  }
  function sortByTime(day) {
    day.items = day.items
      .map((it, i) => ({ it, i }))
      .sort((a, b) => (timeValue(a.it.time) - timeValue(b.it.time)) || (a.i - b.i))
      .map(o => o.it);
  }
  function normalizeOrder() { state.itinerary.days.forEach(sortByTime); }

  function saveActivity(e) {
    e.preventDefault();
    const name = $("#f-name").value.trim();
    if (!name) return;
    const fields = {
      time: $("#f-time").value,
      type: $("#f-type").value,
      name,
      cost: Number($("#f-cost").value) || 0,
      url: $("#f-url").value.trim(),
      notes: $("#f-notes").value.trim(),
      coords: parseCoords($("#f-coords").value)
    };

    // Resolve target day (possibly creating a new one)
    let targetIndex;
    if ($("#f-day").value === "new") {
      const title = $("#f-newtitle").value.trim() || `Day ${state.itinerary.days.length + 1}`;
      state.itinerary.days.push({
        title,
        theme: $("#f-newtheme").value.trim(),
        area: $("#f-newarea").value.trim() || "Seoul",
        date: $("#f-newdate").value || undefined,
        items: []
      });
      targetIndex = state.itinerary.days.length - 1;
    } else {
      targetIndex = +$("#f-day").value;
    }

    if (editingId) {
      // remove the existing item from wherever it currently lives, then re-add to target
      for (const day of state.itinerary.days) {
        const idx = day.items.findIndex(x => x.id === editingId);
        if (idx >= 0) { day.items.splice(idx, 1); break; }
      }
      const moved = Object.assign({ id: editingId }, fields);
      state.itinerary.days[targetIndex].items.push(moved);
      sortByTime(state.itinerary.days[targetIndex]);
      toast("Activity updated");
    } else {
      state.itinerary.days[targetIndex].items.push(Object.assign({ id: uid() }, fields));
      sortByTime(state.itinerary.days[targetIndex]);
      toast("Activity added");
    }
    state.activeDay = Math.min(targetIndex, state.itinerary.days.length - 1);
    save(); closeModal(); refreshAll();
  }

  function deleteActivity() {
    if (!editingId) return;
    if (!confirm("Delete this activity?")) return;
    for (const day of state.itinerary.days) {
      const idx = day.items.findIndex(x => x.id === editingId);
      if (idx >= 0) { day.items.splice(idx, 1); break; }
    }
    delete state.done[editingId];
    save(); closeModal(); refreshAll(); toast("Deleted");
  }

  // ---------- Day modal (add/edit/delete a whole day) ----------
  function openDayModal(di) {
    const editing = di != null;
    $("#d-index").value = editing ? di : "";
    $("#day-modal-title").textContent = editing ? `Edit Day ${di + 1}` : "Add a new day";
    $("#d-delete").hidden = !editing;
    const day = editing ? state.itinerary.days[di] : {};
    $("#d-date").value = editing ? dayISO(di) : nextDayISO();
    $("#d-title").value = day.title || "";
    $("#d-theme").value = day.theme || "";
    $("#d-area").value = day.area || "";
    $("#d-transport").value = day.transport || "";
    $("#day-modal-backdrop").hidden = false;
    setTimeout(() => $("#d-title").focus(), 50);
  }
  function closeDayModal() { $("#day-modal-backdrop").hidden = true; }
  // Reorder days chronologically by their effective date (explicit day.date, else
  // derived from startDate + current position). Returns the day object order changed.
  function dayKey(day, idx) {
    if (day.date) return day.date;
    if (state.itinerary.startDate) return addDaysISO(state.itinerary.startDate, idx);
    return "9999-" + String(idx).padStart(3, "0");  // no dates set → keep original order
  }
  function sortDaysByDate() {
    state.itinerary.days = state.itinerary.days
      .map((day, i) => ({ day, k: dayKey(day, i), i }))
      .sort((a, b) => a.k.localeCompare(b.k) || (a.i - b.i))
      .map(o => o.day);
  }
  function saveDay(e) {
    e.preventDefault();
    const title = $("#d-title").value.trim();
    if (!title) return;
    const idxRaw = $("#d-index").value;
    const data = {
      title,
      theme: $("#d-theme").value.trim(),
      area: $("#d-area").value.trim() || "Seoul",
      transport: $("#d-transport").value.trim() || undefined,
      date: $("#d-date").value || undefined
    };
    let edited;
    if (idxRaw === "") {
      edited = Object.assign(data, { items: [] });
      state.itinerary.days.push(edited);
      toast("Day added");
    } else {
      edited = state.itinerary.days[+idxRaw];
      Object.assign(edited, data);
      toast("Day updated");
    }
    sortDaysByDate();                                   // reorder by date
    state.activeDay = state.itinerary.days.indexOf(edited);
    save(); closeDayModal(); refreshAll();
  }
  function deleteDay() {
    const idx = +$("#d-index").value;
    if (isNaN(idx)) return;
    if (!confirm(`Delete Day ${idx + 1} and all its activities?`)) return;
    (state.itinerary.days[idx].items || []).forEach(it => delete state.done[it.id]);
    state.itinerary.days.splice(idx, 1);
    state.activeDay = Math.max(0, Math.min(state.activeDay, state.itinerary.days.length - 1));
    save(); closeDayModal(); refreshAll(); toast("Day deleted");
  }

  // ---------- Saved places (reusable presets) ----------
  function renderPlaces() {
    const root = $("#places-list");
    root.innerHTML = "";
    if (!state.places.length) {
      root.innerHTML = `<p class="muted small">No saved places yet. Add your Airbnb, hotel, or go-to spots.</p>`;
      return;
    }
    state.places.forEach(p => {
      const meta = TYPE_META[p.type] || TYPE_META.rest;
      const sub = p.address ? p.address : (Array.isArray(p.coords) ? "📍 location set" : "no location yet");
      const row = document.createElement("div");
      row.className = "place-row";
      row.innerHTML = `<span class="place-emoji">${escapeHtml(p.emoji || "📍")}</span>
        <div class="place-info">
          <div class="pn">${escapeHtml(p.name)}</div>
          <div class="ps">${meta.icon} ${meta.label} · ${escapeHtml(sub)}</div>
        </div>
        <button class="btn small" data-place-add="${p.id}" title="Add to a day">＋ Add</button>
        <button class="icon-mini" data-place-edit="${p.id}" title="Edit">✏️</button>`;
      root.appendChild(row);
    });
  }
  function renderQuickfill(editing) {
    const root = $("#quickfill-row");
    root.innerHTML = "";
    if (editing || !state.places.length) { root.hidden = true; return; }
    root.hidden = false;
    const lbl = document.createElement("span");
    lbl.className = "qf-label"; lbl.textContent = "Quick fill:";
    root.appendChild(lbl);
    state.places.forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip qf-chip";
      b.innerHTML = `${escapeHtml(p.emoji || "📍")} ${escapeHtml(p.name)}`;
      b.addEventListener("click", () => prefillActivityFromPlace(p));
      root.appendChild(b);
    });
  }
  function prefillActivityFromPlace(p) {
    $("#f-name").value = p.name || "";
    $("#f-type").value = p.type || "rest";
    $("#f-cost").value = p.cost || "";
    $("#f-url").value = p.url || "";
    $("#f-notes").value = p.notes || p.address || "";
    $("#f-coords").value = Array.isArray(p.coords) ? p.coords.join(", ") : "";
    if (p.time) $("#f-time").value = p.time;
    toast(`Filled from “${p.name}” — pick the day & time, then Save`);
    $("#f-time").focus();
  }
  function openPlaceModal(id) {
    const p = id ? state.places.find(x => x.id === id) || {} : {};
    $("#p-id").value = id || "";
    $("#place-modal-title").textContent = id ? "Edit place" : "New saved place";
    $("#p-delete").hidden = !id;
    $("#p-emoji").value = p.emoji || "";
    $("#p-type").value = p.type || "rest";
    $("#p-name").value = p.name || "";
    $("#p-address").value = p.address || "";
    $("#p-coords").value = Array.isArray(p.coords) ? p.coords.join(", ") : "";
    $("#p-time").value = p.time || "";
    $("#p-cost").value = p.cost || "";
    $("#p-url").value = p.url || "";
    $("#p-notes").value = p.notes || "";
    $("#place-modal-backdrop").hidden = false;
    setTimeout(() => $("#p-name").focus(), 50);
  }
  function closePlaceModal() { $("#place-modal-backdrop").hidden = true; }
  function savePlace(e) {
    e.preventDefault();
    const name = $("#p-name").value.trim();
    if (!name) return;
    const data = {
      emoji: $("#p-emoji").value.trim() || "📍",
      name,
      type: $("#p-type").value,
      address: $("#p-address").value.trim(),
      coords: parseCoords($("#p-coords").value),
      time: $("#p-time").value,
      cost: Number($("#p-cost").value) || 0,
      url: $("#p-url").value.trim(),
      notes: $("#p-notes").value.trim()
    };
    const id = $("#p-id").value;
    if (id) {
      Object.assign(state.places.find(x => x.id === id), data);
      toast("Place updated");
    } else {
      data.id = uid(); state.places.push(data);
      toast("Place saved");
    }
    save(); closePlaceModal(); renderPlaces();
  }
  function deletePlace() {
    const id = $("#p-id").value;
    if (!id) return;
    if (!confirm("Delete this saved place?")) return;
    state.places = state.places.filter(x => x.id !== id);
    save(); closePlaceModal(); renderPlaces(); toast("Place deleted");
  }
  async function geocodePlace() {
    const q = $("#p-address").value.trim();
    if (!q) { toast("Enter an address first"); return; }
    const btn = $("#p-geocode");
    const orig = btn.textContent; btn.disabled = true; btn.textContent = "Searching…";
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q),
        { headers: { "Accept": "application/json" } });
      const j = await r.json();
      if (j && j[0]) {
        $("#p-coords").value = `${(+j[0].lat).toFixed(5)}, ${(+j[0].lon).toFixed(5)}`;
        toast("Coordinates found ✓");
      } else { toast("No match — enter coordinates manually"); }
    } catch { toast("Lookup failed (offline?) — enter coordinates manually"); }
    finally { btn.disabled = false; btn.textContent = orig; }
  }

  // ---------- Packing ----------
  function renderPacking() {
    const ul = $("#packing-list");
    ul.innerHTML = "";
    state.packing.forEach((item, i) => {
      const li = document.createElement("li");
      if (item.done) li.classList.add("done");
      li.innerHTML = `<input type="checkbox" ${item.done ? "checked" : ""}/>
        <span>${escapeHtml(item.text)}</span>
        <button class="del" title="Remove">🗑</button>`;
      $("input", li).addEventListener("change", () => { item.done = !item.done; save(); li.classList.toggle("done"); });
      $(".del", li).addEventListener("click", () => { state.packing.splice(i, 1); save(); renderPacking(); });
      ul.appendChild(li);
    });
  }

  // ---------- Static lists ----------
  function renderPhrases() {
    $("#phrases-list").innerHTML = PHRASES.map(p =>
      `<li><div class="ko">${escapeHtml(p.ko)}</div>
       <div class="rom">${escapeHtml(p.rom)}</div>
       <div class="en">${escapeHtml(p.en)}</div></li>`).join("");
  }
  function renderTips() {
    $("#tips-list").innerHTML = TIPS.map(t => `<li>${escapeHtml(t)}</li>`).join("");
  }
  function renderLegend() {
    $("#map-legend").innerHTML = Object.values(TYPE_META).map(m =>
      `<span><i class="dot" style="background:${m.color}"></i>${m.label}</span>`).join("");
  }

  // ---------- Metro / transport (offline next-train estimates) ----------
  const tmin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const isPeakNow = nowM => TRANSPORT_INFO.peakWindows.some(([a, b]) => nowM >= tmin(a) && nowM < tmin(b));
  function nextTrain(line, nowM) {
    const peak = isPeakNow(nowM);
    const head = peak ? line.headPeak : line.headOff;
    let firstM = tmin(line.first), lastM = tmin(line.last);
    if (lastM <= firstM) lastM += 1440;             // service crosses midnight
    let nm = nowM; if (nm < firstM) nm += 1440;     // we might be in the post-midnight tail
    if (nm < firstM || nm > lastM) return { closed: true, head };
    const offset = nm - firstM;
    let wait = head - (offset % head);
    if (wait === head) wait = 0;                    // exactly on a departure
    if (nm + wait > lastM) return { closed: true, head };
    return { closed: false, wait: Math.round(wait), head, peak };
  }
  function renderMetro() {
    const fareEl = $("#metro-fare");
    if (!fareEl) return;
    fareEl.innerHTML = `Base fare <strong>${fmtKRW(TRANSPORT_INFO.fareBase)}</strong> with T-money (first 10 km). ${escapeHtml(TRANSPORT_INFO.fareStep)}`;
    const now = new Date();
    const nowM = now.getHours() * 60 + now.getMinutes();
    $("#metro-clock").textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const root = $("#metro-lines");
    root.innerHTML = "";
    METRO_LINES.forEach(line => {
      const nx = nextTrain(line, nowM);
      const next = nx.closed
        ? `<div class="nt closed">Closed</div><div class="freq">${line.first}–${line.last}</div>`
        : `<div class="nt">${nx.wait <= 0 ? "Arriving" : "~" + nx.wait + " min"}</div>
           <div class="freq">every ${nx.head} min${nx.peak ? " · peak" : ""}</div>`;
      const row = document.createElement("div");
      row.className = "metro-line";
      row.innerHTML = `<div class="metro-badge" style="background:${line.color}">${escapeHtml(line.id)}</div>
        <div class="metro-info"><div class="mn">${escapeHtml(line.name)}</div>
        <div class="ms" title="${escapeAttr(line.note)}">${escapeHtml(line.note)}</div></div>
        <div class="metro-next">${next}</div>`;
      root.appendChild(row);
    });
    $("#metro-notes").innerHTML = TRANSPORT_INFO.notes.map(n => `<li>${escapeHtml(n)}</li>`).join("");
  }

  // ---------- Currency ----------
  function setupConverter() {
    const krw = $("#conv-krw"), usd = $("#conv-usd"), rate = $("#conv-rate");
    rate.value = state.rate;
    krw.addEventListener("input", () => { usd.value = krw.value ? (krw.value / state.rate).toFixed(2) : ""; });
    usd.addEventListener("input", () => { krw.value = usd.value ? Math.round(usd.value * state.rate) : ""; });
    rate.addEventListener("input", () => {
      state.rate = Number(rate.value) || 1370; save();
      if (krw.value) usd.value = (krw.value / state.rate).toFixed(2);
      renderStats();
    });
  }

  // ---------- Import / Export ----------
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seoul-itinerary.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Exported JSON");
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.itinerary || !Array.isArray(data.itinerary.days)) throw new Error("bad file");
        Object.assign(state, freshState(), data);
        ensureIds(); migrateDone(); sortDaysByDate(); normalizeOrder();
        save(); applyTheme(); renderFilters(); refreshAll(); renderPacking(); renderPlaces();
        $("#start-date").value = state.itinerary.startDate || "";
        $("#search").value = state.search || ""; $("#hide-done").checked = !!state.hideDone;
        toast("Imported successfully");
      } catch { alert("Could not import: invalid file."); }
    };
    reader.readAsText(file);
  }

  // ---------- Theme ----------
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("#theme-toggle").textContent = state.theme === "dark" ? "☀️" : "🌙";
  }

  // ---------- Util ----------
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

  function refreshAll() {
    renderRail(); renderItinerary(); renderStats(); renderMap();
  }
  function rerenderEverything() {
    refreshAll(); renderPacking(); renderPlaces(); renderNotes(); renderExpenses();
    $("#start-date").value = state.itinerary.startDate || "";
  }
  function renderNotes() {
    const ta = $("#notes-area");
    if (!ta || document.activeElement === ta) return;  // don't clobber while typing
    ta.value = state.notes || "";
  }

  // ---------- Live sync (Firebase Realtime Database, optional) ----------
  // Only the shared trip data is synced; per-user prefs (theme, rate, filters) stay local.
  const SHARED_KEYS = ["itinerary", "done", "packing", "places", "notes", "expenses"];
  const sync = {
    enabled: false, db: null, ref: null, tripCode: null,
    clientId: Math.random().toString(36).slice(2),
    applyingRemote: false, pushT: null
  };
  function sharedSnapshot() {
    const o = { updatedAt: Date.now(), by: sync.clientId };
    SHARED_KEYS.forEach(k => { o[k] = state[k]; });
    return o;
  }
  function applyShared(data) {
    SHARED_KEYS.forEach(k => { if (data[k] !== undefined) state[k] = data[k]; });
    ensureIds(); sortDaysByDate(); normalizeOrder();
  }
  function setSyncStatus(status, msg) {
    const dot = $("#sync-dot"), txt = $("#sync-status");
    if (dot) dot.className = "sync-dot " + status;
    if (txt && msg) txt.textContent = msg;
    if (dot) dot.title = msg || status;
  }
  function isConfigured() {
    return typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG &&
      FIREBASE_CONFIG.databaseURL && !/YOUR_/.test(JSON.stringify(FIREBASE_CONFIG));
  }
  function initSync() {
    const configured = isConfigured();
    const fbLoaded = typeof firebase !== "undefined" && firebase && firebase.database;
    console.log("[sync] configured:", configured, "· firebase loaded:", !!fbLoaded,
      "· project:", configured ? FIREBASE_CONFIG.projectId : "(none)");
    if (!configured) {
      $("#sync-on").hidden = true; $("#sync-off").hidden = false;
      $("#sync-off").innerHTML = `<p class="muted small">This build has no Firebase config — you're viewing an older version of the app. Re-download the latest file (or hard-refresh the page) and it'll connect automatically.</p>`;
      setSyncStatus("local", "Local only (old build — no config).");
      return;
    }
    if (!fbLoaded) {
      $("#sync-on").hidden = true; $("#sync-off").hidden = false;
      $("#sync-off").innerHTML = `<p class="muted small">Sync is configured (project <b>${escapeHtml(FIREBASE_CONFIG.projectId)}</b>) but the Firebase library didn't load — usually an ad-blocker / privacy extension, a strict network, or no internet. Allow <code>gstatic.com</code> for this page and reload.</p>`;
      setSyncStatus("error", "Firebase library blocked or offline.");
      return;
    }
    $("#sync-off").hidden = true; $("#sync-on").hidden = false;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      sync.db = firebase.database();
      const code = localStorage.getItem("trip-code") ||
        (typeof DEFAULT_TRIP_CODE !== "undefined" ? DEFAULT_TRIP_CODE : "shared-trip");
      $("#sync-code").value = code;
      connectTrip(code);
    } catch (e) {
      console.warn("Sync init failed:", e);
      setSyncStatus("error", "Sync error — running locally.");
    }
  }
  function connectTrip(code) {
    if (!sync.db || !code) return;
    if (sync.ref) sync.ref.off();
    sync.tripCode = code;
    localStorage.setItem("trip-code", code);
    sync.ref = sync.db.ref("trips/" + code);
    setSyncStatus("connecting", `Connecting to “${code}”…`);
    sync.ref.on("value", (snap) => {
      const data = snap.val();
      if (!data) {                       // brand-new trip code: seed it from our data
        sync.ref.set(sharedSnapshot());
        setSyncStatus("synced", `Synced · trip “${code}” (you started it)`);
        return;
      }
      if (data.by === sync.clientId) {    // our own write echoing back
        setSyncStatus("synced", `Synced · trip “${code}”`);
        return;
      }
      sync.applyingRemote = true;
      applyShared(data);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
      rerenderEverything();
      sync.applyingRemote = false;
      setSyncStatus("synced", `Synced · trip “${code}” · updated just now`);
    }, (err) => {
      console.warn("Sync read error:", err);
      const code = (err && (err.code || err.message) || "").toString();
      const hint = /permission|denied/i.test(code)
        ? "Permission denied — update your Realtime Database rules (see README)."
        : "Can't reach the database" + (code ? ` (${code})` : "") + " — running locally.";
      setSyncStatus("error", hint);
    });
    sync.enabled = true;
  }
  function pushSync() {
    if (!sync.enabled || sync.applyingRemote || !sync.ref) return;
    clearTimeout(sync.pushT);
    sync.pushT = setTimeout(() => {
      sync.ref.set(sharedSnapshot())
        .then(() => setSyncStatus("synced", `Synced · trip “${sync.tripCode}”`))
        .catch((err) => setSyncStatus("error", "Couldn't save to the cloud (" + ((err && (err.code || err.message)) || "denied") + ") — kept locally."));
    }, 500);
  }

  // ===================================================================
  //  EXPENSES  (Splitwise-style splitting, multi-currency, Firebase-synced)
  // ===================================================================
  const CUR_SYMBOLS = { KRW: "₩", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$", CNY: "¥", THB: "฿", SGD: "S$", HKD: "HK$", NZD: "NZ$", CHF: "CHF " };
  const EXP_CATEGORIES = [
    ["general", "🧾", "General"], ["food", "🍽️", "Food & drink"], ["transport", "🚗", "Transport"],
    ["lodging", "🏨", "Lodging"], ["activity", "🎟️", "Activities"], ["shopping", "🛍️", "Shopping"],
    ["groceries", "🛒", "Groceries"], ["entertainment", "🎉", "Entertainment"], ["other", "•", "Other"]
  ];
  const catMeta = id => EXP_CATEGORIES.find(c => c[0] === id) || EXP_CATEGORIES[0];
  // Canonical reference rates expressed in KRW (value of 1 unit). Used to rebuild/repair
  // the rate table relative to whatever base currency is chosen.
  const CANON_RATES = { KRW: 1, USD: 1370, EUR: 1480, GBP: 1740, JPY: 9, AUD: 910, CAD: 1000, CNY: 190, THB: 38, SGD: 1010, HKD: 175, NZD: 830, CHF: 1530 };
  // Rebuild the rate table relative to `base` from canonical KRW values.
  function ratesForBase(base) {
    const div = CANON_RATES[base] || 1;
    const out = {};
    Object.keys(CANON_RATES).forEach(c => { out[c] = CANON_RATES[c] / div; });
    out[base] = 1;
    return out;
  }
  // One-time repair: if the base isn't KRW but KRW still reads 1 (leftover KRW-anchored
  // defaults from before a base switch), the table is inconsistent — rebuild it.
  function repairRates() {
    const ex = state.expenses;
    const b = ex.baseCurrency;
    if (b && b !== "KRW" && CANON_RATES[b] && Math.abs((ex.rates && ex.rates.KRW != null ? ex.rates.KRW : 1) - 1) < 1e-9) {
      const fixed = ratesForBase(b);
      // keep any custom currencies the user added that aren't in CANON
      Object.keys(ex.rates || {}).forEach(c => { if (fixed[c] == null) fixed[c] = ex.rates[c]; });
      ex.rates = fixed;
    }
  }
  const curSymbol = c => CUR_SYMBOLS[c] || (c + " ");
  const curDec = c => (c === "KRW" || c === "JPY") ? 0 : 2;
  const baseCur = () => state.expenses.baseCurrency;
  const baseDec = () => curDec(baseCur());
  const baseUnit = () => Math.pow(10, baseDec());
  const memberById = id => state.expenses.members.find(m => m.id === id);
  const memberName = id => (memberById(id) || {}).name || "—";
  function toBaseMinor(amount, currency) {
    const r = state.expenses.rates[currency] != null ? state.expenses.rates[currency] : 1;
    return Math.round((Number(amount) || 0) * r * baseUnit());
  }
  function baseToMinor(amount) { return Math.round((Number(amount) || 0) * baseUnit()); }
  function fmtBaseMinor(minor) {
    const v = (minor || 0) / baseUnit();
    return curSymbol(baseCur()) + v.toLocaleString(undefined, { minimumFractionDigits: baseDec(), maximumFractionDigits: baseDec() });
  }
  function fmtCur(amount, currency) {
    const d = curDec(currency);
    return curSymbol(currency) + (Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  // Largest-remainder distribution of an integer total over weights.
  function distribute(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return weights.map(() => 0);
    const raw = weights.map(w => total * w / sum);
    const floor = raw.map(Math.floor);
    let rem = total - floor.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
    for (let k = 0; k < rem; k++) floor[order[k % order.length].i]++;
    return floor;
  }
  function expensePaid(e) {
    const paid = {};
    Object.entries(e.paidBy || {}).forEach(([mid, amt]) => { paid[mid] = toBaseMinor(amt, e.currency); });
    return paid;
  }
  function expenseOwed(e) {
    const members = state.expenses.members.map(m => m.id);
    let among = (e.split && e.split.among && e.split.among.length) ? e.split.among : members;
    among = among.filter(id => members.includes(id));
    if (!among.length) return {};
    const type = (e.split && e.split.type) || "equal";
    const vals = (e.split && e.split.values) || {};
    const total = toBaseMinor(e.amount, e.currency);
    if (type === "exact") {
      const owed = {}; among.forEach(id => { owed[id] = toBaseMinor(vals[id], e.currency); });
      return owed;
    }
    let weights = among.map(id => type === "equal" ? 1 : (Number(vals[id]) || 0));
    if (weights.reduce((a, b) => a + b, 0) === 0) weights = among.map(() => 1);
    const dist = distribute(total, weights);
    const owed = {}; among.forEach((id, i) => { owed[id] = dist[i]; });
    return owed;
  }
  function computeBalances() {
    const bal = {}; state.expenses.members.forEach(m => bal[m.id] = 0);
    state.expenses.list.forEach(e => {
      Object.entries(expensePaid(e)).forEach(([id, v]) => { if (bal[id] != null) bal[id] += v; });
      Object.entries(expenseOwed(e)).forEach(([id, v]) => { if (bal[id] != null) bal[id] -= v; });
    });
    (state.expenses.settlements || []).forEach(s => {
      if (bal[s.from] != null) bal[s.from] += s.amount;
      if (bal[s.to] != null) bal[s.to] -= s.amount;
    });
    return bal;
  }
  function simplifyDebts(bal) {
    const cred = [], deb = [];
    Object.entries(bal).forEach(([id, v]) => { if (v > 0) cred.push({ id, v }); else if (v < 0) deb.push({ id, v: -v }); });
    cred.sort((a, b) => b.v - a.v); deb.sort((a, b) => b.v - a.v);
    const tx = []; let i = 0, j = 0;
    while (i < deb.length && j < cred.length) {
      const pay = Math.min(deb[i].v, cred[j].v);
      if (pay > 0) tx.push({ from: deb[i].id, to: cred[j].id, amount: pay });
      deb[i].v -= pay; cred[j].v -= pay;
      if (deb[i].v === 0) i++;
      if (cred[j].v === 0) j++;
    }
    return tx;
  }

  // ---------- Expenses rendering ----------
  function renderExpenses() {
    const view = $("#expenses-view");
    if (!view) return;
    const ex = state.expenses;
    const hasMembers = ex.members.length > 0;
    $("#exp-empty").innerHTML = hasMembers ? "" :
      `<div class="exp-card"><p class="muted">👋 Add the people on your trip to start splitting expenses.</p>
       <button class="btn primary small" id="exp-empty-add">👥 Add people</button></div>`;
    const grid = $(".exp-grid");
    if (!hasMembers) {
      grid.style.display = "none";
      const b = $("#exp-empty-add"); if (b) b.onclick = openPeople;
      return;
    }
    grid.style.display = "";

    const totalMinor = ex.list.reduce((s, e) => s + toBaseMinor(e.amount, e.currency), 0);
    const perHead = ex.members.length ? Math.round(totalMinor / ex.members.length) : 0;
    $("#exp-summary").innerHTML =
      `<div class="exp-stat"><span class="exp-stat-num">${fmtBaseMinor(totalMinor)}</span><span class="exp-stat-lbl">Total spent</span></div>
       <div class="exp-stat"><span class="exp-stat-num">${ex.list.length}</span><span class="exp-stat-lbl">Expenses</span></div>
       <div class="exp-stat"><span class="exp-stat-num">${fmtBaseMinor(perHead)}</span><span class="exp-stat-lbl">Avg / person</span></div>
       <div class="exp-stat"><span class="exp-stat-num">${ex.members.length}</span><span class="exp-stat-lbl">People</span></div>`;

    const bal = computeBalances();
    $("#exp-balances").innerHTML = ex.members.map(m => {
      const v = bal[m.id] || 0;
      const cls = v > 0 ? "pos" : (v < 0 ? "neg" : "zero");
      const label = v > 0 ? "gets back" : (v < 0 ? "owes" : "settled");
      return `<div class="bal-row"><span class="bal-name">${escapeHtml(m.name)}</span>
        <span class="bal-amt ${cls}">${v === 0 ? "✓ settled" : label + " " + fmtBaseMinor(Math.abs(v))}</span></div>`;
    }).join("");

    const tx = simplifyDebts(bal);
    $("#exp-settle-list").innerHTML = tx.length
      ? tx.map(t => `<div class="settle-row">
          <span><b>${escapeHtml(memberName(t.from))}</b> → <b>${escapeHtml(memberName(t.to))}</b></span>
          <span class="settle-amt">${fmtBaseMinor(t.amount)}</span>
          <button class="btn small settle-go" data-from="${t.from}" data-to="${t.to}" data-amt="${t.amount}">Settle</button>
        </div>`).join("")
      : `<p class="muted small">All settled up 🎉</p>`;
    $$(".settle-go").forEach(b => b.onclick = () =>
      openSettle({ from: b.dataset.from, to: b.dataset.to, amount: (+b.dataset.amt) / baseUnit() }));

    // History: expenses + settlements, newest first by date
    const rows = [];
    ex.list.forEach(e => rows.push({ kind: "exp", date: e.date || "", e }));
    (ex.settlements || []).forEach(s => rows.push({ kind: "settle", date: s.date || "", s }));
    rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("#exp-list").innerHTML = rows.length ? rows.map(r => {
      if (r.kind === "settle") {
        const s = r.s;
        return `<div class="exp-item settle-item" data-settle="${s.id}">
          <div class="exp-ico">💸</div>
          <div class="exp-item-body"><div class="exp-item-name">${escapeHtml(memberName(s.from))} paid ${escapeHtml(memberName(s.to))}</div>
          <div class="exp-item-sub">${r.date || ""}${s.note ? " · " + escapeHtml(s.note) : ""}</div></div>
          <div class="exp-item-amt">${fmtBaseMinor(s.amount)}</div></div>`;
      }
      const e = r.e, cm = catMeta(e.category);
      const payers = Object.keys(e.paidBy || {});
      const paidLabel = payers.length === 1 ? memberName(payers[0]) : payers.length + " people";
      const splitType = (e.split && e.split.type) || "equal";
      const baseM = toBaseMinor(e.amount, e.currency);
      const baseNote = e.currency !== baseCur() ? ` · ${fmtBaseMinor(baseM)}` : "";
      return `<div class="exp-item" data-exp="${e.id}">
        <div class="exp-ico" title="${cm[2]}">${cm[1]}</div>
        <div class="exp-item-body">
          <div class="exp-item-name">${escapeHtml(e.desc || "(no description)")}</div>
          <div class="exp-item-sub">${escapeHtml(paidLabel)} paid · split ${splitType}${e.date ? " · " + e.date : ""}</div>
        </div>
        <div class="exp-item-amt">${fmtCur(e.amount, e.currency)}<span class="exp-item-base">${baseNote}</span></div>
      </div>`;
    }).join("") : `<p class="muted small">No expenses yet. Tap “Add expense”.</p>`;
    $$("#exp-list [data-exp]").forEach(el => el.onclick = () => openExpense(el.dataset.exp));
    $$("#exp-list [data-settle]").forEach(el => el.onclick = () => {
      if (confirm("Delete this settlement?")) {
        ex.settlements = ex.settlements.filter(s => s.id !== el.dataset.settle);
        save(); renderExpenses();
      }
    });
  }

  // ---------- People modal ----------
  function openPeople() {
    renderPeopleList();
    $("#people-modal-backdrop").hidden = false;
    setTimeout(() => $("#person-input").focus(), 50);
  }
  function renderPeopleList() {
    const root = $("#people-list");
    root.innerHTML = state.expenses.members.length
      ? state.expenses.members.map(m => `<div class="person-row"><span>${escapeHtml(m.name)}</span>
          <button class="icon-mini" data-rm="${m.id}" title="Remove">🗑</button></div>`).join("")
      : `<p class="muted small">No one yet.</p>`;
    $$("#people-list [data-rm]").forEach(b => b.onclick = () => {
      const id = b.dataset.rm;
      const used = state.expenses.list.some(e => (e.paidBy && e.paidBy[id]) || (e.split && e.split.among && e.split.among.includes(id)))
        || (state.expenses.settlements || []).some(s => s.from === id || s.to === id);
      if (used && !confirm("This person appears in existing expenses. Remove anyway? Those expenses keep their data but the person won't be counted.")) return;
      state.expenses.members = state.expenses.members.filter(m => m.id !== id);
      save(); renderPeopleList(); renderExpenses();
    });
  }
  function addPerson() {
    const v = $("#person-input").value.trim();
    if (!v) return;
    state.expenses.members.push({ id: uid(), name: v });
    $("#person-input").value = "";
    save(); renderPeopleList(); renderExpenses();
  }

  // ---------- Currencies / rates modal ----------
  function openRates() {
    const sel = $("#base-currency-select");
    sel.innerHTML = Object.keys(state.expenses.rates).sort().map(c => `<option value="${c}">${c}</option>`).join("");
    sel.value = baseCur();
    renderRatesList();
    $("#rates-modal-backdrop").hidden = false;
  }
  function renderRatesList() {
    const ex = state.expenses;
    $("#rates-list").innerHTML = Object.keys(ex.rates).sort().map(c => {
      const isBase = c === ex.baseCurrency;
      return `<div class="rate-row">
        <span class="rate-code">${c}${isBase ? " <span class='muted'>(base)</span>" : ""}</span>
        <span class="rate-eq">1 ${c} =</span>
        <input type="number" step="any" min="0" class="rate-input" data-c="${c}" value="${ex.rates[c]}" ${isBase ? "disabled" : ""}/>
        <span class="rate-base">${escapeHtml(ex.baseCurrency)}</span>
        ${isBase ? "" : `<button class="icon-mini" data-rmcur="${c}" title="Remove">🗑</button>`}
      </div>`;
    }).join("");
    $$("#rates-list .rate-input").forEach(inp => inp.onchange = () => {
      ex.rates[inp.dataset.c] = Number(inp.value) || 0; save(); renderExpenses();
    });
    $$("#rates-list [data-rmcur]").forEach(b => b.onclick = () => {
      delete ex.rates[b.dataset.rmcur]; save(); renderRatesList(); renderExpenses();
    });
  }
  function addCurrency() {
    const code = $("#rate-code").value.trim().toUpperCase();
    const val = Number($("#rate-val").value);
    if (!code || !(val > 0)) { toast("Enter a currency code and rate"); return; }
    state.expenses.rates[code] = val;
    $("#rate-code").value = ""; $("#rate-val").value = "";
    save(); renderRatesList(); renderExpenses();
  }

  // ---------- Expense modal ----------
  function fillSelect(sel, options, selected) {
    sel.innerHTML = options.map(([v, label]) => `<option value="${v}" ${v === selected ? "selected" : ""}>${label}</option>`).join("");
  }
  function openExpense(id) {
    const ex = state.expenses;
    if (!ex.members.length) { openPeople(); return; }
    const editing = !!id;
    const e = editing ? ex.list.find(x => x.id === id) : null;
    $("#ex-id").value = id || "";
    $("#exp-modal-title").textContent = editing ? "Edit expense" : "Add expense";
    $("#ex-delete").hidden = !editing;
    $("#ex-desc").value = e ? e.desc : "";
    $("#ex-amount").value = e ? e.amount : "";
    fillSelect($("#ex-currency"), Object.keys(ex.rates).sort().map(c => [c, c]), e ? e.currency : baseCur());
    $("#ex-date").value = (e && e.date) || todayISO();
    fillSelect($("#ex-category"), EXP_CATEGORIES.map(c => [c[0], `${c[1]} ${c[2]}`]), e ? e.category : "general");
    // payer single-select default
    fillSelect($("#ex-paid"), ex.members.map(m => [m.id, m.name]),
      e && Object.keys(e.paidBy || {}).length === 1 ? Object.keys(e.paidBy)[0] : (ex.members[0] && ex.members[0].id));
    // multiple payers
    const multi = e && Object.keys(e.paidBy || {}).length > 1;
    $("#ex-multi").checked = !!multi;
    buildPayers(e ? e.paidBy : null);
    togglePayers();
    // split
    const split = e && e.split ? e.split : { type: "equal", among: ex.members.map(m => m.id), values: {} };
    fillSelect($("#ex-method"), [["equal", "Equally"], ["exact", "Exact amounts"], ["percent", "Percentages"], ["shares", "Shares"]], split.type || "equal");
    buildAmong(split.among && split.among.length ? split.among : ex.members.map(m => m.id));
    window._exSplitValues = Object.assign({}, split.values || {});
    updateSplitInputs();
    $("#exp-modal-backdrop").hidden = false;
    setTimeout(() => $("#ex-desc").focus(), 50);
  }
  function buildPayers(paidBy) {
    $("#ex-payers").innerHTML = state.expenses.members.map(m =>
      `<label class="split-row"><span>${escapeHtml(m.name)}</span>
        <input type="number" step="any" min="0" class="ex-payer" data-mid="${m.id}" value="${paidBy && paidBy[m.id] != null ? paidBy[m.id] : ""}" placeholder="0"/>
        <span class="unit" id="payer-unit-${m.id}"></span></label>`).join("");
    updatePayerUnits();
  }
  function updatePayerUnits() {
    const sym = curSymbol($("#ex-currency").value);
    $$("#ex-payers .unit").forEach(u => u.textContent = sym);
  }
  function togglePayers() {
    const multi = $("#ex-multi").checked;
    $("#ex-payers-wrap").hidden = !multi;
    $("#ex-paid-wrap").hidden = multi;
  }
  function buildAmong(selectedIds) {
    $("#ex-among").innerHTML = state.expenses.members.map(m =>
      `<label class="chk"><input type="checkbox" class="ex-among-cb" value="${m.id}" ${selectedIds.includes(m.id) ? "checked" : ""}/> ${escapeHtml(m.name)}</label>`).join("");
    $$(".ex-among-cb").forEach(cb => cb.addEventListener("change", updateSplitInputs));
  }
  function selectedAmong() { return $$(".ex-among-cb").filter(cb => cb.checked).map(cb => cb.value); }
  function updateSplitInputs() {
    const method = $("#ex-method").value;
    const among = selectedAmong();
    const wrap = $("#ex-splitvals");
    if (method === "equal") {
      wrap.innerHTML = `<p class="muted small">Split equally between ${among.length} ${among.length === 1 ? "person" : "people"}.</p>`;
      $("#ex-split-hint").textContent = "";
      return;
    }
    const unit = method === "percent" ? "%" : (method === "shares" ? "shares" : curSymbol($("#ex-currency").value));
    const sv = window._exSplitValues || {};
    wrap.innerHTML = among.map(id => `<label class="split-row"><span>${escapeHtml(memberName(id))}</span>
      <input type="number" step="any" min="0" class="ex-splitval" data-mid="${id}" value="${sv[id] != null ? sv[id] : ""}" placeholder="0"/>
      <span class="unit">${unit}</span></label>`).join("");
    $$(".ex-splitval").forEach(inp => inp.addEventListener("input", updateSplitHint));
    updateSplitHint();
  }
  function updateSplitHint() {
    const method = $("#ex-method").value;
    const hint = $("#ex-split-hint");
    const vals = $$(".ex-splitval").map(i => Number(i.value) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    if (method === "percent") {
      hint.textContent = `Total ${sum}% / 100%` + (Math.abs(sum - 100) > 0.01 ? " — must equal 100%" : " ✓");
      hint.className = "split-hint " + (Math.abs(sum - 100) < 0.01 ? "ok" : "warn");
    } else if (method === "exact") {
      const amt = Number($("#ex-amount").value) || 0;
      hint.textContent = `Allocated ${fmtCur(sum, $("#ex-currency").value)} / ${fmtCur(amt, $("#ex-currency").value)}` + (Math.abs(sum - amt) > 0.001 ? " — must match" : " ✓");
      hint.className = "split-hint " + (Math.abs(sum - amt) < 0.001 ? "ok" : "warn");
    } else if (method === "shares") {
      hint.textContent = `${sum} shares total`;
      hint.className = "split-hint";
    }
  }
  function closeExpense() { $("#exp-modal-backdrop").hidden = true; }
  function saveExpense(ev) {
    ev.preventDefault();
    const ex = state.expenses;
    const desc = $("#ex-desc").value.trim();
    const amount = Number($("#ex-amount").value);
    const currency = $("#ex-currency").value;
    if (!(amount > 0)) { toast("Enter an amount"); return; }
    // payers
    let paidBy = {};
    if ($("#ex-multi").checked) {
      $$("#ex-payers .ex-payer").forEach(inp => { const v = Number(inp.value); if (v > 0) paidBy[inp.dataset.mid] = v; });
      const sum = Object.values(paidBy).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - amount) > 0.001) { toast(`Payers must total ${fmtCur(amount, currency)}`); return; }
    } else {
      paidBy[$("#ex-paid").value] = amount;
    }
    if (!Object.keys(paidBy).length) { toast("Who paid?"); return; }
    const among = selectedAmong();
    if (!among.length) { toast("Select who's splitting"); return; }
    const method = $("#ex-method").value;
    const values = {};
    if (method !== "equal") $$(".ex-splitval").forEach(inp => { values[inp.dataset.mid] = Number(inp.value) || 0; });
    if (method === "percent") {
      const s = Object.values(values).reduce((a, b) => a + b, 0);
      if (Math.abs(s - 100) > 0.01) { toast("Percentages must add up to 100%"); return; }
    }
    if (method === "exact") {
      const s = Object.values(values).reduce((a, b) => a + b, 0);
      if (Math.abs(s - amount) > 0.001) { toast(`Exact amounts must total ${fmtCur(amount, currency)}`); return; }
    }
    const data = {
      desc, amount, currency, date: $("#ex-date").value || todayISO(),
      category: $("#ex-category").value, paidBy, split: { type: method, among, values }
    };
    const id = $("#ex-id").value;
    if (id) { Object.assign(ex.list.find(x => x.id === id), data); toast("Expense updated"); }
    else { ex.list.push(Object.assign({ id: uid() }, data)); toast("Expense added"); }
    save(); closeExpense(); renderExpenses();
  }
  function deleteExpense() {
    const id = $("#ex-id").value;
    if (!id || !confirm("Delete this expense?")) return;
    state.expenses.list = state.expenses.list.filter(x => x.id !== id);
    save(); closeExpense(); renderExpenses(); toast("Deleted");
  }

  // ---------- Settle-up modal ----------
  function openSettle(pre) {
    const ex = state.expenses;
    fillSelect($("#st-from"), ex.members.map(m => [m.id, m.name]), pre && pre.from);
    fillSelect($("#st-to"), ex.members.map(m => [m.id, m.name]), pre && pre.to);
    $("#st-amount").value = pre && pre.amount != null ? (pre.amount).toFixed(baseDec()) : "";
    $("#st-currency-lbl").textContent = baseCur();
    $("#st-date").value = todayISO();
    $("#st-note").value = "";
    $("#settle-modal-backdrop").hidden = false;
  }
  function saveSettle(ev) {
    ev.preventDefault();
    const from = $("#st-from").value, to = $("#st-to").value;
    const amt = Number($("#st-amount").value);
    if (from === to) { toast("Pick two different people"); return; }
    if (!(amt > 0)) { toast("Enter an amount"); return; }
    state.expenses.settlements.push({ id: uid(), from, to, amount: baseToMinor(amt), date: $("#st-date").value || todayISO(), note: $("#st-note").value.trim() });
    save(); $("#settle-modal-backdrop").hidden = true; renderExpenses(); toast("Payment recorded");
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ---------- Tab switching ----------
  function setTab(tab) {
    const exp = tab === "expenses";
    document.body.classList.toggle("tab-expenses", exp);
    $$("#tabbar button[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $$("#mobile-nav button[data-view]").forEach(b => {
      if (b.dataset.view === "split") b.classList.toggle("active", exp);
    });
    if (exp) renderExpenses();
    else if (map) setTimeout(() => map.invalidateSize(), 60);
  }

  // ---------- Init ----------
  function init() {
    ensureIds(); migrateDone(); sortDaysByDate(); normalizeOrder(); save();
    applyTheme();
    initMap();
    buildTypeSelect();
    renderFilters();
    renderPhrases();
    renderTips();
    renderLegend();
    renderMetro();
    setInterval(renderMetro, 30000);  // refresh next-train estimates
    renderPacking();
    setupConverter();
    $("#trip-title").textContent = state.itinerary.title.split("·")[0].trim() || "Seoul";
    $("#start-date").value = state.itinerary.startDate || "";
    $("#search").value = state.search;
    $("#hide-done").checked = state.hideDone;
    refreshAll();

    // events
    $("#start-date").addEventListener("change", (e) => {
      state.itinerary.startDate = e.target.value; save(); renderRail(); renderItinerary();
    });
    $("#search").addEventListener("input", (e) => { state.search = e.target.value; save(); renderItinerary(); });
    $("#hide-done").addEventListener("change", (e) => { state.hideDone = e.target.checked; save(); renderItinerary(); });
    $("#theme-toggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark"; save(); applyTheme();
    });

    // drawer
    const openDrawer = () => { $("#drawer").hidden = false; $("#drawer-backdrop").hidden = false; renderMetro(); };
    const closeDrawer = () => { $("#drawer").hidden = true; $("#drawer-backdrop").hidden = true; };
    $("#menu-btn").addEventListener("click", openDrawer);
    $("#drawer-close").addEventListener("click", closeDrawer);
    $("#drawer-backdrop").addEventListener("click", closeDrawer);

    // packing add
    const addPacking = () => {
      const v = $("#packing-input").value.trim();
      if (!v) return;
      state.packing.push({ text: v, done: false });
      $("#packing-input").value = ""; save(); renderPacking();
    };
    $("#packing-add").addEventListener("click", addPacking);
    $("#packing-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addPacking(); });

    // ideas & notes (shared + synced)
    renderNotes();
    $("#notes-area").addEventListener("input", (e) => { state.notes = e.target.value; save(); });

    // data buttons
    $("#export-btn").addEventListener("click", exportData);
    $("#print-btn").addEventListener("click", () => window.print());
    $("#import-btn").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
    $("#reset-btn").addEventListener("click", () => {
      if (!confirm("Reset everything to the default itinerary? Your changes will be lost.")) return;
      localStorage.removeItem(STORAGE_KEY);
      Object.assign(state, freshState());
      ensureIds(); save();
      applyTheme(); $("#start-date").value = state.itinerary.startDate;
      $("#search").value = ""; $("#hide-done").checked = false;
      renderFilters(); renderPacking(); renderPlaces(); renderNotes(); refreshAll(); toast("Reset to default");
    });

    // add/edit buttons (delegated)
    $("#itinerary").addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) { openModal(+add.dataset.add, null); return; }
      const editDay = e.target.closest("[data-editday]");
      if (editDay) openDayModal(+editDay.dataset.editday);
    });

    // top-level add buttons
    $("#add-activity-btn").addEventListener("click", () => openModal(null, null));
    $("#add-day-btn").addEventListener("click", () => openDayModal(null));

    // activity modal
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") closeModal(); });
    $("#activity-form").addEventListener("submit", saveActivity);
    $("#f-delete").addEventListener("click", deleteActivity);
    $("#f-day").addEventListener("change", toggleNewDayFields);

    // day modal
    $("#day-modal-close").addEventListener("click", closeDayModal);
    $("#day-modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "day-modal-backdrop") closeDayModal(); });
    $("#day-form").addEventListener("submit", saveDay);
    $("#d-delete").addEventListener("click", deleteDay);

    // saved places
    renderPlaces();
    $("#place-add").addEventListener("click", () => openPlaceModal(null));
    $("#places-list").addEventListener("click", (e) => {
      const add = e.target.closest("[data-place-add]");
      if (add) {
        const p = state.places.find(x => x.id === add.dataset.placeAdd);
        if (p) { closeDrawer(); openModal(null, null); prefillActivityFromPlace(p); }
        return;
      }
      const edit = e.target.closest("[data-place-edit]");
      if (edit) openPlaceModal(edit.dataset.placeEdit);
    });
    $("#place-modal-close").addEventListener("click", closePlaceModal);
    $("#place-modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "place-modal-backdrop") closePlaceModal(); });
    $("#place-form").addEventListener("submit", savePlace);
    $("#p-delete").addEventListener("click", deletePlace);
    $("#p-geocode").addEventListener("click", geocodePlace);

    // live sync
    initSync();
    $("#sync-connect").addEventListener("click", () => {
      const code = $("#sync-code").value.trim();
      if (code) { connectTrip(code); toast(`Connected to trip “${code}”`); }
    });

    // directions sheet
    $("#dir-close").addEventListener("click", closeDirections);
    $("#dir-backdrop").addEventListener("click", (e) => { if (e.target.id === "dir-backdrop") closeDirections(); });
    $$("#dir-backdrop .dir-opt").forEach(a => a.addEventListener("click", () => setTimeout(closeDirections, 100)));

    // mobile bottom nav
    $$("#mobile-nav button[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.view;
        if (v === "tools") { openDrawer(); return; }
        if (v === "split") { setTab("expenses"); $$("#mobile-nav button[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === "split")); return; }
        setTab("trip");
        const map_ = v === "map";
        document.body.classList.toggle("view-map", map_);
        document.body.classList.toggle("view-list", !map_);
        $$("#mobile-nav button[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
        if (map_ && map) setTimeout(() => { map.invalidateSize(); renderMap(); }, 80);
      });
    });
    document.body.classList.add("view-list");

    // tabs (Itinerary / Expenses)
    $$("#tabbar button[data-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));

    // expenses view buttons
    $("#exp-add").addEventListener("click", () => openExpense(null));
    $("#exp-people").addEventListener("click", openPeople);
    $("#exp-rates").addEventListener("click", openRates);
    $("#exp-settle").addEventListener("click", () => openSettle(null));

    // people modal
    $("#people-modal-close").addEventListener("click", () => $("#people-modal-backdrop").hidden = true);
    $("#people-modal-backdrop").addEventListener("click", e => { if (e.target.id === "people-modal-backdrop") $("#people-modal-backdrop").hidden = true; });
    $("#person-add").addEventListener("click", addPerson);
    $("#person-input").addEventListener("keydown", e => { if (e.key === "Enter") addPerson(); });

    // rates modal
    $("#rates-modal-close").addEventListener("click", () => $("#rates-modal-backdrop").hidden = true);
    $("#rates-modal-backdrop").addEventListener("click", e => { if (e.target.id === "rates-modal-backdrop") $("#rates-modal-backdrop").hidden = true; });
    $("#base-currency-select").addEventListener("change", e => {
      const ex = state.expenses, nb = e.target.value, div = ex.rates[nb];
      if (div > 0 && isFinite(div)) {
        // re-express every rate relative to the new base
        Object.keys(ex.rates).forEach(c => { ex.rates[c] = ex.rates[c] / div; });
      } else {
        ex.rates = ratesForBase(nb);
      }
      ex.baseCurrency = nb; ex.rates[nb] = 1;
      save(); renderRatesList(); renderExpenses();
    });
    $("#rate-add").addEventListener("click", addCurrency);
    $("#rate-reset").addEventListener("click", () => {
      if (!confirm("Reset all exchange rates to default values (relative to your base currency)?")) return;
      state.expenses.rates = ratesForBase(state.expenses.baseCurrency);
      save(); renderRatesList(); renderExpenses(); toast("Rates reset to defaults");
    });

    // expense modal
    $("#exp-modal-close").addEventListener("click", closeExpense);
    $("#exp-modal-backdrop").addEventListener("click", e => { if (e.target.id === "exp-modal-backdrop") closeExpense(); });
    $("#exp-form").addEventListener("submit", saveExpense);
    $("#ex-delete").addEventListener("click", deleteExpense);
    $("#ex-method").addEventListener("change", updateSplitInputs);
    $("#ex-multi").addEventListener("change", togglePayers);
    $("#ex-currency").addEventListener("change", () => { updatePayerUnits(); updateSplitInputs(); });
    $("#ex-amount").addEventListener("input", () => { if ($("#ex-method").value === "exact") updateSplitHint(); });

    // settle modal
    $("#settle-modal-close").addEventListener("click", () => $("#settle-modal-backdrop").hidden = true);
    $("#settle-modal-backdrop").addEventListener("click", e => { if (e.target.id === "settle-modal-backdrop") $("#settle-modal-backdrop").hidden = true; });
    $("#settle-form").addEventListener("submit", saveSettle);

    renderExpenses();

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal(); closeDayModal(); closePlaceModal(); closeDrawer();
        closeExpense();
        ["people-modal-backdrop", "rates-modal-backdrop", "settle-modal-backdrop"].forEach(id => $("#" + id).hidden = true);
      }
    });

    // sync active day on scroll
    let scrollT;
    $("#itinerary").addEventListener("scroll", () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        const cards = $$(".day-card");
        const top = $("#itinerary").getBoundingClientRect().top + 80;
        for (let i = cards.length - 1; i >= 0; i--) {
          if (cards[i].getBoundingClientRect().top <= top) {
            const di = +cards[i].id.split("-")[1];
            if (di !== state.activeDay) { state.activeDay = di; renderRail(); renderMap(); }
            break;
          }
        }
      }, 120);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

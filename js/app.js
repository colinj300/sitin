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
      theme: "light",
      activeFilters: [],   // type filter; empty = all
      search: "",
      hideDone: false,
      rate: 1370,
      activeDay: 0
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
    if (idxRaw === "") {
      state.itinerary.days.push(Object.assign(data, { items: [] }));
      state.activeDay = state.itinerary.days.length - 1;
      toast("Day added");
    } else {
      Object.assign(state.itinerary.days[+idxRaw], data);
      toast("Day updated");
    }
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
        ensureIds(); migrateDone(); normalizeOrder();
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
    refreshAll(); renderPacking(); renderPlaces();
    $("#start-date").value = state.itinerary.startDate || "";
  }

  // ---------- Live sync (Firebase Realtime Database, optional) ----------
  // Only the shared trip data is synced; per-user prefs (theme, rate, filters) stay local.
  const SHARED_KEYS = ["itinerary", "done", "packing", "places"];
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
    ensureIds(); normalizeOrder();
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

  // ---------- Init ----------
  function init() {
    ensureIds(); migrateDone(); normalizeOrder(); save();
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
      renderFilters(); renderPacking(); renderPlaces(); refreshAll(); toast("Reset to default");
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
        // force-apply even though setMobileView guards on width (nav is mobile-only anyway)
        const map_ = v === "map";
        document.body.classList.toggle("view-map", map_);
        document.body.classList.toggle("view-list", !map_);
        $$("#mobile-nav button[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
        if (map_ && map) setTimeout(() => { map.invalidateSize(); renderMap(); }, 80);
      });
    });
    document.body.classList.add("view-list");

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeDayModal(); closePlaceModal(); closeDrawer(); }
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

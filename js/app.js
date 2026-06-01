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
      done: {},            // "d-i" -> true
      packing: defaultPacking(),
      theme: "light",
      activeFilters: [],   // type filter; empty = all
      search: "",
      hideDone: false,
      rate: 1370,
      activeDay: 0
    };
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
      return Object.assign(freshState(), parsed);
    } catch { return freshState(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  // ---------- Helpers ----------
  const fmtKRW = n => "₩" + Math.round(n).toLocaleString("en-US");
  const dayDate = i => {
    if (!state.itinerary.startDate) return "";
    const d = new Date(state.itinerary.startDate + "T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };
  const key = (d, i) => `${d}-${i}`;
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
    if (map && coords) { map.flyTo(coords, 16, { duration: .6 }); }
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
          if (state.hideDone && state.done[key(di, ii)]) return false;
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
            </div>
          </div>
          <div class="day-meta">
            <div class="day-cost">${fmtKRW(dayCost)}</div>
            <div>${day.items.length} stops</div>
          </div>
        </div>
        <ul class="items"></ul>
        <button class="add-item-btn" data-add="${di}">+ Add activity to Day ${di + 1}</button>
      `;
      const ul = $(".items", card);
      visibleItems.forEach(({ it, ii }) => ul.appendChild(renderItem(day, di, it, ii)));
      root.appendChild(card);
    });
    if (!root.children.length) {
      root.innerHTML = `<p class="muted" style="text-align:center; padding:40px;">No activities match your search/filters.</p>`;
    }
  }

  function renderItem(day, di, it, ii) {
    const meta = TYPE_META[it.type] || TYPE_META.sight;
    const li = document.createElement("li");
    const isDone = !!state.done[key(di, ii)];
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
          ${hasCoords ? `<button data-focus="${di}-${ii}">📍 Show on map</button>` : ""}
          ${hasCoords ? `<a href="https://www.openstreetmap.org/?mlat=${it.coords[0]}&mlon=${it.coords[1]}#map=16/${it.coords[0]}/${it.coords[1]}" target="_blank" rel="noopener">🗺 Open map</a>` : ""}
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
      const k = key(di, ii);
      if (state.done[k]) delete state.done[k]; else state.done[k] = true;
      save(); li.classList.toggle("done"); renderStats();
    });
    li.addEventListener("click", (e) => {
      if (e.target.closest("a") || e.target.closest("button") || e.target.closest("input")) return;
      if (hasCoords) flyTo(it.coords);
    });
    const focusBtn = $("[data-focus]", li);
    if (focusBtn) focusBtn.addEventListener("click", (e) => { e.stopPropagation(); flyTo(it.coords); });
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
    days.forEach((day, di) => day.items.forEach((it, ii) => {
      count++; total += Number(it.cost) || 0;
      if (state.done[key(di, ii)]) done++;
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
  function buildTypeSelect() {
    const sel = $("#f-type");
    sel.innerHTML = "";
    Object.entries(TYPE_META).forEach(([t, m]) => {
      const o = document.createElement("option");
      o.value = t; o.textContent = `${m.icon} ${m.label}`;
      sel.appendChild(o);
    });
  }
  function openModal(di, ii) {
    $("#f-dayIndex").value = di;
    $("#f-itemIndex").value = ii == null ? "" : ii;
    const editing = ii != null;
    $("#modal-title").textContent = editing ? "Edit activity" : `Add activity · Day ${di + 1}`;
    $("#f-delete").hidden = !editing;
    const it = editing ? state.itinerary.days[di].items[ii] : {};
    $("#f-time").value = it.time || "";
    $("#f-type").value = it.type || "sight";
    $("#f-name").value = it.name || "";
    $("#f-cost").value = it.cost || "";
    $("#f-url").value = it.url || "";
    $("#f-notes").value = it.notes || "";
    $("#f-coords").value = Array.isArray(it.coords) ? it.coords.join(", ") : "";
    $("#modal-backdrop").hidden = false;
    setTimeout(() => $("#f-name").focus(), 50);
  }
  function closeModal() { $("#modal-backdrop").hidden = true; }
  function parseCoords(str) {
    if (!str.trim()) return null;
    const parts = str.split(",").map(s => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every(n => !isNaN(n))) return parts;
    return null;
  }
  function saveActivity(e) {
    e.preventDefault();
    const di = +$("#f-dayIndex").value;
    const iiRaw = $("#f-itemIndex").value;
    const item = {
      time: $("#f-time").value,
      type: $("#f-type").value,
      name: $("#f-name").value.trim(),
      cost: Number($("#f-cost").value) || 0,
      url: $("#f-url").value.trim(),
      notes: $("#f-notes").value.trim(),
      coords: parseCoords($("#f-coords").value)
    };
    if (!item.name) return;
    const day = state.itinerary.days[di];
    if (iiRaw === "") {
      day.items.push(item);
      // keep chronological order by time
      day.items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      toast("Activity added");
    } else {
      day.items[+iiRaw] = item;
      toast("Activity updated");
    }
    save(); closeModal(); refreshAll();
  }
  function deleteActivity() {
    const di = +$("#f-dayIndex").value;
    const ii = +$("#f-itemIndex").value;
    if (isNaN(ii)) return;
    if (!confirm("Delete this activity?")) return;
    state.itinerary.days[di].items.splice(ii, 1);
    // shift done flags for this day
    const newDone = {};
    Object.keys(state.done).forEach(k => {
      const [d, i] = k.split("-").map(Number);
      if (d !== di) { newDone[k] = state.done[k]; return; }
      if (i < ii) newDone[k] = state.done[k];
      else if (i > ii) newDone[key(d, i - 1)] = state.done[k];
    });
    state.done = newDone;
    save(); closeModal(); refreshAll(); toast("Deleted");
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
        save(); applyTheme(); refreshAll(); renderPacking();
        $("#start-date").value = state.itinerary.startDate || "";
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

  // ---------- Init ----------
  function init() {
    applyTheme();
    initMap();
    buildTypeSelect();
    renderFilters();
    renderPhrases();
    renderTips();
    renderLegend();
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
    const openDrawer = () => { $("#drawer").hidden = false; $("#drawer-backdrop").hidden = false; };
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
      applyTheme(); $("#start-date").value = state.itinerary.startDate;
      $("#search").value = ""; $("#hide-done").checked = false;
      renderFilters(); renderPacking(); refreshAll(); toast("Reset to default");
    });

    // add buttons (delegated)
    $("#itinerary").addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) openModal(+add.dataset.add, null);
    });

    // modal
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") closeModal(); });
    $("#activity-form").addEventListener("submit", saveActivity);
    $("#f-delete").addEventListener("click", deleteActivity);

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeDrawer(); }
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

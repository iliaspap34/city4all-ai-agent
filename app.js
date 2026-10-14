/* ============================================================================
   CITY4ALL AI — FRONTEND (app.js)
   ----------------------------------------------------------------------------
   - Καθοδηγούμενη αναζήτηση σημείων (φίλτρα + cascade τοποθεσίας)
   - Κάρτες αποτελεσμάτων, σελίδα λεπτομερειών, κοντινά σημεία
   - Ξεχωριστή λειτουργία «Πληροφορίες» με διαδικτυακές πηγές
   - Χάρτης ArcGIS, φωνητική εισαγωγή, AI βοηθός
   - Καμία πλασματική βαθμολογία/φωτογραφία/απόσταση/ώρα λειτουργίας
   ============================================================================ */

/* ============================ CONFIG ============================ */

const API_BASE =
  window.CITY4ALL_API_BASE ||
  "https://city4allfinalai.ilias-pap-net.workers.dev";

const ENDPOINTS = {
  fields: `${API_BASE}/fields`,
  locations: `${API_BASE}/locations`,
  search: `${API_BASE}/search`,
  nearby: `${API_BASE}/nearby`,
  chat: `${API_BASE}/chat`,
  info: `${API_BASE}/info`,
  summarize: `${API_BASE}/summarize`
};

/* ============================ STATE ============================ */

const state = {
  lang: localStorage.getItem("city4all_lang") || "el",
  mode: "home",
  fields: null,
  filters: {
    category: [],
    accessibility: [],
    location: { perifereia: "", nomoi: "", dimos: "", area: "", text: "" },
    keyword: ""
  },
  page: 1,
  pageSize: 10,
  lastSearch: null,
  results: [],
  mapFeatures: [],
  selected: null,
  nearbyRadius: 500,
  nearbyCategory: "",
  conversation: [],
  previousFeatures: [],
  chatEnabled: false,
  ttsEnabled: false,
  recognition: null,
  listening: false
};

/* ============================ i18n ============================ */

const I18N = {
  el: {
    tagline: "Ψηφιακός οδηγός προσβασιμότητας",
    home: "Αρχική",
    homeTitle: "Βρες προσβάσιμα σημεία",
    homeLead:
      "Ψάξε πραγματικά σημεία προσβασιμότητας στα δεδομένα City4All με φίλτρα κατηγορίας, προσβασιμότητας και τοποθεσίας. Αφού βρεις σημεία, ο <strong>AI βοηθός</strong> αναλαμβάνει: σου μιλάει για τα αποτελέσματα, απαντά στις ερωτήσεις σου και ψάχνει και γενικές πληροφορίες στο διαδίκτυο.",
    modeSearch: "Εύρεση σημείων",
    modeSearchDesc:
      "Φίλτρα κατηγορίας, προσβασιμότητας και τοποθεσίας. Κάρτες αποτελεσμάτων, λεπτομέρειες, κοντινά σημεία και AI βοηθός.",
    startSearch: "Ξεκίνα αναζήτηση →",
    modeInfo: "Πληροφορίες",
    modeInfoDesc:
      "Ρώτησε για προσβασιμότητα, δικαιώματα, νομοθεσία και τεχνολογίες. Απαντήσεις από αξιόπιστες πηγές με παραπομπές.",
    askInfo: "Κάνε μια ερώτηση →",
    mapLabel: "Χάρτης City4All",
    filtersTitle: "Αναζήτηση σημείων",
    filtersHint: "Επίλεξε τι ψάχνεις και πού.",
    categoryLabel: "Τύπος σημείου",
    accessLabel: "Μέσα προσβασιμότητας (προαιρετικά)",
    optional: "(προαιρετικά)",
    locationLabel: "Τοποθεσία",
    anyRegion: "Όλες οι περιφέρειες",
    anyPrefecture: "Όλοι οι νομοί",
    anyDimos: "Όλοι οι δήμοι",
    anyArea: "Όλες οι περιοχές",
    locTextPh: "Ή γράψε περιοχή/πόλη (π.χ. Καλλιθέα, London)",
    clearLocation: "Καθαρισμός τοποθεσίας",
    keywordLabel: "Λέξη-κλειδί (προαιρετικά)",
    keywordPh: "π.χ. ράμπα, βιβλιοθήκη",
    searchBtn: "Αναζήτηση",
    resetBtn: "Καθαρισμός",
    resultsTitle: "Αποτελέσματα",
    prev: "← Προηγούμενη",
    next: "Επόμενη →",
    backToFilters: "← Αλλαγή φίλτρων",
    send: "Αποστολή",
    infoTitle: "Πληροφορίες προσβασιμότητας",
    infoLead:
      "Ρώτησε για δικαιώματα, νομοθεσία, τεχνολογίες και καλές πρακτικές. Απαντήσεις από αξιόπιστες πηγές.",
    chatPh: "Ρώτησέ με για τα σημεία ή για γενικές πληροφορίες...",
    loading: "Φόρτωση…",
    searching: "Αναζήτηση στα δεδομένα City4All…",
    noResults: "Δεν βρέθηκαν σημεία με αυτά τα κριτήρια.",
    noResultsHint: "Δοκίμασε να αλλάξεις κατηγορία ή να διευρύνεις την περιοχή.",
    found: "Βρέθηκαν",
    resultsWord: "αποτελέσματα",
    page: "Σελίδα",
    of: "από",
    details: "Προβολή λεπτομερειών",
    viewOnMap: "Στον χάρτη",
    openMaps: "Άνοιγμα στους Χάρτες",
    nearby: "Κοντινά σημεία",
    nearbyAll: "Όλες οι κατηγορίες",
    nearbyEmpty: "Δεν βρέθηκαν κοντινά σημεία σε αυτή την ακτίνα.",
    nearbyLoading: "Φόρτωση κοντινών σημείων…",
    radius: "Ακτίνα",
    meters: "μ.",
    km: "χλμ.",
    recordedAccess: "Καταγεγραμμένα μέσα προσβασιμότητας",
    noAccessData:
      "Δεν υπάρχουν καταγεγραμμένα στοιχεία προσβασιμότητας για αυτό το σημείο. Η έλλειψη καταγραφής δεν σημαίνει έλλειψη υποδομής.",
    comments: "Σχόλια / Παρατηρήσεις",
    entrance: "Περιγραφή εισόδου",
    dataSource: "Προέλευση δεδομένων",
    category: "Κατηγορία",
    location: "Τοποθεσία",
    area: "Περιοχή",
    dimos: "Δήμος",
    nomoi: "Νομός",
    perifereia: "Περιφέρεια",
    recordId: "Αναγνωριστικό εγγραφής",
    moreInfo: "Περισσότερες πληροφορίες",
    moreInfoHint: "Γενικές πληροφορίες από το διαδίκτυο (όχι δεδομένα City4All).",
    askWeb: "Αναζήτηση στο διαδίκτυο",
    webLoading: "Αναζήτηση στο διαδίκτυο…",
    sources: "Πηγές",
    clarification: "Διευκρίνιση",
    errorGeneric: "Κάτι πήγε λάθος. Δοκίμασε ξανά.",
    clearAll: "Καθαρισμός όλων",
    selectCategories: "Επιλογή κατηγοριών",
    allCategories: "Όλες",
    disclaimer:
      "Η απόσταση είναι ευθεία γραμμή και δεν αποτελεί απόσταση πεζής διαδρομής."
  },
  en: {
    tagline: "Accessibility digital guide",
    home: "Home",
    homeTitle: "Find accessible places",
    homeLead:
      "Search real accessibility points in the City4All dataset with category, accessibility and location filters. Once you find places, the <strong>AI assistant</strong> takes over: it talks about the results, answers your questions and also searches general information on the web.",
    modeSearch: "Find places",
    modeSearchDesc:
      "Category, accessibility and location filters. Result cards, details, nearby places and AI assistant.",
    startSearch: "Start searching →",
    modeInfo: "Information",
    modeInfoDesc:
      "Ask about accessibility, rights, legislation and technologies. Answers from trusted sources with citations.",
    askInfo: "Ask a question →",
    mapLabel: "City4All Map",
    filtersTitle: "Find places",
    filtersHint: "Choose what and where.",
    categoryLabel: "Place type",
    accessLabel: "Accessibility features (optional)",
    optional: "(optional)",
    locationLabel: "Location",
    anyRegion: "All regions",
    anyPrefecture: "All prefectures",
    anyDimos: "All municipalities",
    anyArea: "All areas",
    locTextPh: "Or type an area/city (e.g. Kallithea, London)",
    clearLocation: "Clear location",
    keywordLabel: "Keyword (optional)",
    keywordPh: "e.g. ramp, library",
    searchBtn: "Search",
    resetBtn: "Reset",
    resultsTitle: "Results",
    prev: "← Previous",
    next: "Next →",
    backToFilters: "← Change filters",
    send: "Send",
    infoTitle: "Accessibility information",
    infoLead:
      "Ask about rights, legislation, technologies and good practices. Answers from trusted sources.",
    chatPh: "Ask me about the places or for general information...",
    loading: "Loading…",
    searching: "Searching the City4All dataset…",
    noResults: "No places found with these criteria.",
    noResultsHint: "Try changing the category or widening the area.",
    found: "Found",
    resultsWord: "results",
    page: "Page",
    of: "of",
    details: "View details",
    viewOnMap: "On map",
    openMaps: "Open in Maps",
    nearby: "Nearby places",
    nearbyAll: "All categories",
    nearbyEmpty: "No nearby places within this radius.",
    nearbyLoading: "Loading nearby places…",
    radius: "Radius",
    meters: "m",
    km: "km",
    recordedAccess: "Recorded accessibility features",
    noAccessData:
      "No accessibility data is recorded for this place. Missing data does not mean missing infrastructure.",
    comments: "Comments / Notes",
    entrance: "Entrance description",
    dataSource: "Data source",
    category: "Category",
    location: "Location",
    area: "Area",
    dimos: "Municipality",
    nomoi: "Prefecture",
    perifereia: "Region",
    recordId: "Record ID",
    moreInfo: "More information",
    moreInfoHint: "General information from the web (not City4All data).",
    askWeb: "Search the web",
    webLoading: "Searching the web…",
    sources: "Sources",
    clarification: "Clarification",
    errorGeneric: "Something went wrong. Please try again.",
    clearAll: "Clear all",
    selectCategories: "Select categories",
    allCategories: "All",
    disclaimer: "Distance is a straight line and is not a walking route distance."
  }
};

function t(key) {
  return I18N[state.lang][key] || I18N.el[key] || key;
}

/* ============================ DOM ============================ */

const $ = id => document.getElementById(id);

const dom = {
  statusText: $("statusText"),
  screens: {
    search: $("screen-search")
  },
  mapCount: $("mapCount"),
  categoryChips: $("categoryChips"),
  accessChips: $("accessChips"),
  locPerifereia: $("locPerifereia"),
  locNomoi: $("locNomoi"),
  locDimos: $("locDimos"),
  locArea: $("locArea"),
  locText: $("locText"),
  keywordInput: $("keywordInput"),
  filtersView: $("filtersView"),
  resultsView: $("resultsView"),
  resultsList: $("resultsList"),
  resultsCount: $("resultsCount"),
  pager: $("pager"),
  pageInfo: $("pageInfo"),
  prevPage: $("prevPage"),
  nextPage: $("nextPage"),
  searchAiLog: $("searchAiLog"),
  chatInput: $("chatInput"),
  chatLock: $("chatLock"),
  chatSuggestions: $("chatSuggestions"),
  ttsBtn: $("ttsBtn"),
  detailsModal: $("detailsModal"),
  detailName: $("detailName"),
  detailCategory: $("detailCategory"),
  detailBody: $("detailBody")
};

/* ============================ UTIL ============================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchJson(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function formatDistance(meters) {
  if (meters == null) return "";
  if (meters < 1000) return `${meters} ${t("meters")}`;
  return `${(meters / 1000).toFixed(1)} ${t("km")}`;
}

function locationLabelOf(feature) {
  const parts = [feature.area, feature.dimos, feature.nomoi, feature.perifereia]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  return parts.join(", ");
}

/* ============================ SCREENS ============================ */

function showScreen(mode) {
  state.mode = mode || "search";
  Object.entries(dom.screens).forEach(([key, el]) => {
    if (el) el.hidden = key !== state.mode;
  });
  setTimeout(() => window.city4allMap?.view?.resize?.(), 60);
  if (state.chatEnabled) setTimeout(() => dom.chatInput?.focus?.(), 80);
}

/* ============================ MAP ============================ */

let mapReadyResolved = false;
let resolveMapReady;
const mapReadyPromise = new Promise(resolve => {
  resolveMapReady = () => {
    if (mapReadyResolved) return;
    mapReadyResolved = true;
    resolve();
  };
});

function tryResolveExistingMap() {
  const map = window.city4allMap;
  if (map?.view) {
    if (map.view.when) {
      map.view.when(() => resolveMapReady()).catch(() => resolveMapReady());
    } else {
      resolveMapReady();
    }
  }
}

window.addEventListener("city4all-map-ready", () => resolveMapReady());
tryResolveExistingMap();

async function waitForMapReady() {
  if (mapReadyResolved) return true;
  const timeout = new Promise(resolve => setTimeout(() => resolve(false), 8000));
  await Promise.race([mapReadyPromise, timeout]);
  return mapReadyResolved;
}

const ACCESS_COLORS = {
  ramp: "#1d6fe0",
  elevator: "#7c3aed",
  signage: "#0891b2",
  stepfree: "#16a34a",
  autodoor: "#0d9488",
  parking: "#2563eb",
  tactile: "#d97706",
  handrail: "#64748b",
  doorbutton: "#9333ea",
  wc: "#dc2626"
};

function popupHtml(feature) {
  const access = feature.accessibility?.length
    ? feature.accessibility.map(a => `<li>${escapeHtml(a.label)}</li>`).join("")
    : `<li>${escapeHtml(t("noAccessData"))}</li>`;
  return `
    <div style="font-family:inherit;max-width:260px">
      <strong>${escapeHtml(feature.name)}</strong>
      <div style="color:#1d6fe0;font-size:11px;font-weight:700;margin:2px 0 6px">${escapeHtml(
        feature.category
      )}</div>
      <div style="color:#64748b;font-size:11px;margin-bottom:6px">${escapeHtml(
        locationLabelOf(feature)
      )}</div>
      <ul style="margin:0;padding-left:16px;font-size:11px">${access}</ul>
    </div>`;
}

async function drawFeatures(features) {
  state.mapFeatures = features || [];
  const ready = await waitForMapReady();
  const map = window.city4allMap;
  if (!ready || !map) return;

  map.resultsLayer.removeAll();

  const points = (features || []).filter(f => f.latitude != null && f.longitude != null);
  points.forEach(feature => {
    const color = ACCESS_COLORS[feature.accessibility?.[0]?.id] || "#3b82f6";
    const graphic = new map.Graphic({
      geometry: { type: "point", longitude: feature.longitude, latitude: feature.latitude },
      attributes: { id: feature.id, name: feature.name, __color: color },
      symbol: markerSymbol(color, 11, "#ffffff", 1.5),
      popupTemplate: {
        title: feature.name,
        content: popupHtml(feature)
      }
    });
    map.resultsLayer.add(graphic);
  });

  // Όταν βρεθούν σημεία, θαμπώνουμε/γκριζάρουμε όλα τα υπόλοιπα σημεία του
  // υποβάθρου ώστε να ξεχωρίζουν μόνο τα αποτελέσματα.
  dimBackgroundLayers(points.length > 0);
  resetMarkers();
  bindMarkerClick(map);

  dom.mapCount.hidden = points.length === 0;
  dom.mapCount.textContent = `${points.length} ${t("resultsWord")}`;

  if (points.length === 1) {
    await focusMapPoint(points[0], 16);
  } else if (points.length > 1) {
    try {
      await map.view.goTo(points.map(p => [p.longitude, p.latitude]), { padding: 60 });
    } catch (e) {
      console.warn("goTo failed", e);
    }
  }
}

/* ---------- Έμφαση στον χάρτη: γκριζάρουμε όλα τα άλλα εκτός από το επιλεγμένο ---------- */

function markerSymbol(color, size, outlineColor, outlineWidth) {
  return {
    type: "simple-marker",
    style: "circle",
    size,
    color,
    outline: { color: outlineColor, width: outlineWidth }
  };
}

/** Θαμπώνει (γκριζάρει) όλα τα layers του υποβάθρου εκτός από τα αποτελέσματα. */
function dimBackgroundLayers(on) {
  const map = window.city4allMap;
  if (!map) return;
  let layers = [];
  try {
    layers = map.view?.map?.allLayers?.toArray?.() || [];
  } catch {
    layers = [];
  }
  layers.forEach(layer => {
    if (!layer || layer === map.resultsLayer) return;
    try {
      layer.opacity = on ? 0.18 : 1;
      if ("effect" in layer) layer.effect = on ? "grayscale(1)" : null;
    } catch {
      /* αγνοούμε layers που δεν το υποστηρίζουν */
    }
  });
}

/** Επαναφέρει όλα τα markers στα κανονικά τους χρώματα. */
function resetMarkers() {
  const map = window.city4allMap;
  if (!map) return;
  map.resultsLayer.graphics.forEach(g => {
    const color = g.attributes?.__color || "#3b82f6";
    g.symbol = markerSymbol(color, 11, "#ffffff", 1.5);
  });
}

/** Τονίζει το επιλεγμένο σημείο και γκριζάρει όλα τα υπόλοιπα markers. */
function highlightFeature(feature) {
  const map = window.city4allMap;
  if (!map || !feature) return;
  map.resultsLayer.graphics.forEach(g => {
    const isSelected = String(g.attributes?.id) === String(feature.id);
    const color = g.attributes?.__color || "#3b82f6";
    g.symbol = isSelected
      ? markerSymbol(color, 16, "#ffffff", 2.5)
      : markerSymbol("#46536a", 9, "#2a3547", 1);
  });
}

/** Κλικ σε marker του χάρτη → τονίζεται και ανοίγουν οι λεπτομέρειες. */
function bindMarkerClick(map) {
  if (!map || map.__c4aClickBound) return;
  map.__c4aClickBound = true;
  try {
    if (map.view?.popup) map.view.popup.autoOpenEnabled = false;
    map.view.on("click", event => {
      map.view
        .hitTest(event)
        .then(res => {
          const hit = (res.results || []).find(
            r => r.graphic && map.resultsLayer.graphics.includes(r.graphic)
          );
          if (!hit) return;
          const id = hit.graphic.attributes?.id;
          const feat = state.results.find(f => String(f.id) === String(id));
          if (feat) openDetails(feat);
        })
        .catch(() => {});
    });
  } catch {
    /* ignore */
  }
}

async function focusMapPoint(feature, zoom = 17) {
  const ready = await waitForMapReady();
  const map = window.city4allMap;
  if (!ready || !map || feature.latitude == null) return;
  try {
    highlightFeature(feature);
    await map.view.goTo({ center: [feature.longitude, feature.latitude], zoom });
    const graphic = map.resultsLayer.graphics.find(
      g => String(g.attributes?.id) === String(feature.id)
    );
    if (graphic && map.view.openPopup) {
      map.view.openPopup({ location: graphic.geometry, features: [graphic] });
    }
  } catch (e) {
    console.warn("focus failed", e);
  }
}

/* ============================ FIELDS ============================ */

async function loadFields() {
  try {
    state.fields = await fetchJson(ENDPOINTS.fields, {}, 15000);
    renderCategoryChips();
    renderAccessChips();
  } catch (error) {
    console.warn("Fields load failed:", error.message);
    dom.statusText.textContent = "Offline";
  }
}

function renderCategoryChips() {
  const cats = state.fields?.categories || [];
  dom.categoryChips.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "chip" + (state.filters.category.length === 0 ? " active" : "");
  allBtn.textContent = t("allCategories");
  allBtn.addEventListener("click", () => {
    state.filters.category = [];
    renderCategoryChips();
  });
  dom.categoryChips.appendChild(allBtn);

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = cat.label;
    btn.dataset.id = cat.id;
    if (state.filters.category.includes(cat.id)) btn.classList.add("active");
    btn.addEventListener("click", () => {
      toggleArray(state.filters.category, cat.id);
      btn.classList.toggle("active");
    });
    dom.categoryChips.appendChild(btn);
  });
}

function renderAccessChips() {
  const list = state.fields?.accessibility || [];
  dom.accessChips.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "chip chip-access" + (state.filters.accessibility.length === 0 ? " active" : "");
  allBtn.textContent = t("allCategories");
  allBtn.addEventListener("click", () => {
    state.filters.accessibility = [];
    renderAccessChips();
  });
  dom.accessChips.appendChild(allBtn);

  list.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip chip-access";
    btn.textContent = item.label;
    if (state.filters.accessibility.includes(item.id)) btn.classList.add("active");
    btn.addEventListener("click", () => {
      toggleArray(state.filters.accessibility, item.id);
      btn.classList.toggle("active");
    });
    dom.accessChips.appendChild(btn);
  });
}

function toggleArray(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
}

/* ============================ LOCATION CASCADE ============================ */

function setSelectOptions(select, values, placeholderKey) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = t(placeholderKey);
  select.appendChild(first);
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

async function loadLocations(level, parent = {}) {
  const params = new URLSearchParams({ level });
  if (parent.perifereia) params.set("perifereia", parent.perifereia);
  if (parent.nomoi) params.set("nomoi", parent.nomoi);
  if (parent.dimos) params.set("dimos", parent.dimos);
  try {
    const data = await fetchJson(`${ENDPOINTS.locations}?${params.toString()}`, {}, 20000);
    return data.values || [];
  } catch (error) {
    console.warn(`Locations ${level} failed:`, error.message);
    return [];
  }
}

async function initLocationCascade() {
  const regions = await loadLocations("perifereia");
  setSelectOptions(dom.locPerifereia, regions, "anyRegion");
}

async function onPerifereiaChange() {
  state.filters.location.perifereia = dom.locPerifereia.value;
  state.filters.location.nomoi = "";
  state.filters.location.dimos = "";
  state.filters.location.area = "";
  dom.locNomoi.value = "";
  dom.locDimos.value = "";
  dom.locArea.value = "";
  const nomoi = state.filters.location.perifereia
    ? await loadLocations("nomoi", { perifereia: state.filters.location.perifereia })
    : [];
  setSelectOptions(dom.locNomoi, nomoi, "anyPrefecture");
  const dimos = state.filters.location.perifereia
    ? await loadLocations("dimos", { perifereia: state.filters.location.perifereia })
    : await loadLocations("dimos");
  setSelectOptions(dom.locDimos, dimos, "anyDimos");
  const areas = state.filters.location.perifereia
    ? await loadLocations("area", { perifereia: state.filters.location.perifereia })
    : await loadLocations("area");
  setSelectOptions(dom.locArea, areas, "anyArea");
}

async function onNomoiChange() {
  state.filters.location.nomoi = dom.locNomoi.value;
  state.filters.location.dimos = "";
  state.filters.location.area = "";
  dom.locDimos.value = "";
  dom.locArea.value = "";
  const parent = {
    perifereia: state.filters.location.perifereia,
    nomoi: state.filters.location.nomoi
  };
  const dimos = await loadLocations("dimos", parent);
  setSelectOptions(dom.locDimos, dimos, "anyDimos");
  const areas = await loadLocations("area", parent);
  setSelectOptions(dom.locArea, areas, "anyArea");
}

async function onDimosChange() {
  state.filters.location.dimos = dom.locDimos.value;
  state.filters.location.area = "";
  dom.locArea.value = "";
  const parent = {
    perifereia: state.filters.location.perifereia,
    nomoi: state.filters.location.nomoi,
    dimos: state.filters.location.dimos
  };
  const areas = state.filters.location.dimos
    ? await loadLocations("area", parent)
    : await loadLocations("area", { perifereia: parent.perifereia });
  setSelectOptions(dom.locArea, areas, "anyArea");
}

function onAreaChange() {
  state.filters.location.area = dom.locArea.value;
}

function clearLocation() {
  state.filters.location = { perifereia: "", nomoi: "", dimos: "", area: "", text: "" };
  dom.locPerifereia.value = "";
  dom.locNomoi.innerHTML = `<option value="">${escapeHtml(t("anyPrefecture"))}</option>`;
  dom.locDimos.innerHTML = `<option value="">${escapeHtml(t("anyDimos"))}</option>`;
  dom.locArea.innerHTML = `<option value="">${escapeHtml(t("anyArea"))}</option>`;
  dom.locText.value = "";
}

/* ============================ SEARCH ============================ */

function setLoadingButton(button, loading, label) {
  button.disabled = loading;
  if (loading) {
    button.dataset.original = button.textContent;
    button.innerHTML = `<span class="spinner"></span>`;
  } else {
    button.textContent = label || button.dataset.original || t("searchBtn");
  }
}

async function runSearch(page = 1) {
  state.filters.location.text = dom.locText.value.trim();
  state.filters.keyword = dom.keywordInput.value.trim();
  state.page = page;

  if (
    !state.filters.category.length &&
    !state.filters.accessibility.length &&
    !state.filters.location.text &&
    !state.filters.location.perifereia &&
    !state.filters.location.dimos &&
    !state.filters.location.area &&
    !state.filters.keyword
  ) {
    // Καμία επιλογή: ζητάμε από τον χρήστη να επιλέξει τουλάχιστον ένα κριτήριο.
    showResultsView();
    dom.resultsCount.textContent = "";
    dom.resultsList.innerHTML = `<div class="empty">${escapeHtml(
      t("noResultsHint")
    )}</div>`;
    dom.pager.hidden = true;
    return;
  }

  dom.filtersView.hidden = true;
  showResultsView();
  dom.resultsList.innerHTML = `<div class="loading-line"><span class="spinner" style="border-color:rgba(29,111,224,.3);border-top-color:#1d6fe0"></span>${escapeHtml(
    t("searching")
  )}</div>`;
  dom.resultsCount.textContent = "";
  dom.pager.hidden = true;

  const button = $("searchBtn");
  setLoadingButton(button, true);

  try {
    const data = await fetchJson(
      ENDPOINTS.search,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: state.filters.category,
          accessibility: state.filters.accessibility,
          perifereia: state.filters.location.perifereia,
          nomoi: state.filters.location.nomoi,
          dimos: state.filters.location.dimos,
          area: state.filters.location.area,
          locationText: state.filters.location.text,
          keyword: state.filters.keyword,
          page: state.page,
          pageSize: state.pageSize
        })
      },
      30000
    );

    state.lastSearch = data;
    state.results = data.features || [];
    state.previousFeatures = data.features || [];
    renderResults(data);
    drawFeatures(data.features || []);
    enableChat((data.total || 0) > 0);
    requestAiSummary(data);
  } catch (error) {
    console.error(error);
    dom.resultsList.innerHTML = `<div class="empty">${escapeHtml(t("errorGeneric"))}<br><small>${escapeHtml(
      error.message
    )}</small></div>`;
  } finally {
    setLoadingButton(button, false, t("searchBtn"));
  }
}

function showResultsView() {
  dom.filtersView.hidden = true;
  dom.resultsView.hidden = false;
}

/**
 * Μετά την καθοδηγούμενη αναζήτηση, ζητάμε από το AI μια φιλική σύνοψη των
 * αποτελεσμάτων και την εμφανίζουμε ΠΑΝΩ από τις κάρτες + στο log του βοηθού.
 */
async function requestAiSummary(data) {
  const payload = {
    filters: {
      category: state.filters.category,
      accessibility: state.filters.accessibility,
      location: { ...state.filters.location },
      keyword: state.filters.keyword
    },
    total: data.total,
    features: (data.features || []).slice(0, 10)
  };
  try {
    const res = await fetchJson(
      ENDPOINTS.summarize,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      90000
    );
    showAiSummary(res.answer || "", res.total);
  } catch (error) {
    // Αν το /summarize δεν είναι διαθέσιμο (παλιό worker), δεν σπάμε τίποτα.
    console.warn("AI summary unavailable:", error.message);
  }
}

function showAiSummary(answer, total) {
  if (!answer) return;
  const html = escapeHtml(answer).replace(/\n/g, "<br>");

  const box = document.createElement("div");
  box.className = "ai-summary";
  box.innerHTML =
    `<div class="ai-summary-head">City4All AI</div>` +
    `<div class="ai-summary-body">${html}</div>`;
  dom.resultsList.prepend(box);

  // Και στο log του βοηθού, ώστε να υπάρχει ιστορικό συνομιλίας.
  appendBubble(
    dom.searchAiLog,
    "ai",
    html
  );
  state.conversation.push({ role: "assistant", content: answer });
  state.conversation = state.conversation.slice(-12);

  renderSuggestions(searchSuggestions(total));
  speak(answer);
}

function showFiltersView() {
  dom.resultsView.hidden = true;
  dom.filtersView.hidden = false;
}

function renderResults(data) {
  const features = data.features || [];
  dom.resultsCount.textContent = `${t("found")} ${data.total} ${t("resultsWord")}`;

  if (!features.length) {
    dom.resultsList.innerHTML = `<div class="empty"><strong>${escapeHtml(
      t("noResults")
    )}</strong><br>${escapeHtml(t("noResultsHint"))}</div>`;
    dom.pager.hidden = true;
    return;
  }

  dom.resultsList.innerHTML = features.map(cardHtml).join("");

  dom.resultsList.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const feature = state.results.find(f => String(f.id) === String(id));
      if (!feature) return;
      const action = btn.dataset.action;
      if (action === "details") openDetails(feature);
      else if (action === "map") {
        focusMapPoint(feature);
        if (window.innerWidth <= 940) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  const pageCount = data.pageCount || 1;
  dom.pager.hidden = pageCount <= 1;
  dom.pageInfo.textContent = `${t("page")} ${data.page} ${t("of")} ${pageCount}`;
  dom.prevPage.disabled = data.page <= 1;
  dom.nextPage.disabled = data.page >= pageCount;
}

function cardHtml(feature) {
  const tags = feature.accessibility?.length
    ? feature.accessibility.map(a => `<span class="tag">${escapeHtml(a.label)}</span>`).join("")
    : `<span class="tag none">${escapeHtml(t("noAccessData").split(".")[0])}</span>`;
  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h4>${escapeHtml(feature.name)}</h4>
          <div class="cat">${escapeHtml(feature.category)}</div>
          <div class="loc"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg> ${escapeHtml(locationLabelOf(feature) || "—")}</div>
        </div>
      </div>
      <div class="tag-row">${tags}</div>
      <div class="card-actions">
        <button class="mini-btn primary" data-action="details" data-id="${escapeHtml(
          feature.id
        )}">${escapeHtml(t("details"))}</button>
        <button class="mini-btn" data-action="map" data-id="${escapeHtml(
          feature.id
        )}">${escapeHtml(t("viewOnMap"))}</button>
      </div>
    </article>`;
}

/* ============================ DETAILS ============================ */

function openDetails(feature) {
  state.selected = feature;
  state.nearbyRadius = 500;
  state.nearbyCategory = "";

  dom.detailName.textContent = feature.name;
  dom.detailCategory.textContent = feature.category;
  highlightFeature(feature);

  const accessTags = feature.accessibility?.length
    ? feature.accessibility.map(a => `<span class="tag">${escapeHtml(a.label)}</span>`).join("")
    : "";

  const accessSection = accessTags
    ? `<div class="access-list">${accessTags}</div>`
    : `<div class="notice">${escapeHtml(t("noAccessData"))}</div>`;

  const mapLinks = feature.hasCoordinates
    ? `<a class="mini-btn" href="${feature.googleMapsUrl}" target="_blank" rel="noopener">${escapeHtml(
        t("openMaps")
      )}</a>`
    : `<span class="notice">${escapeHtml("—")}</span>`;

  dom.detailBody.innerHTML = `
    <dl class="kv">
      <dt>${escapeHtml(t("category"))}</dt><dd>${escapeHtml(feature.category)}</dd>
      <dt>${escapeHtml(t("location"))}</dt><dd>${escapeHtml(locationLabelOf(feature) || "—")}</dd>
      ${feature.area ? `<dt>${escapeHtml(t("area"))}</dt><dd>${escapeHtml(feature.area)}</dd>` : ""}
      ${feature.dimos ? `<dt>${escapeHtml(t("dimos"))}</dt><dd>${escapeHtml(feature.dimos)}</dd>` : ""}
      ${feature.nomoi ? `<dt>${escapeHtml(t("nomoi"))}</dt><dd>${escapeHtml(feature.nomoi)}</dd>` : ""}
      ${
        feature.perifereia
          ? `<dt>${escapeHtml(t("perifereia"))}</dt><dd>${escapeHtml(feature.perifereia)}</dd>`
          : ""
      }
      ${
        feature.source
          ? `<dt>${escapeHtml(t("dataSource"))}</dt><dd>${escapeHtml(feature.source)}</dd>`
          : ""
      }
      <dt>${escapeHtml(t("recordId"))}</dt><dd>#${escapeHtml(feature.id)}</dd>
    </dl>

    <div class="section-title">${escapeHtml(t("recordedAccess"))}</div>
    ${accessSection}

    ${
      feature.entrance
        ? `<div class="section-title">${escapeHtml(t("entrance"))}</div><div>${escapeHtml(
            feature.entrance
          )}</div>`
        : ""
    }
    ${
      feature.comments
        ? `<div class="section-title">${escapeHtml(t("comments"))}</div><div>${escapeHtml(
            feature.comments
          )}</div>`
        : ""
    }

    <div class="section-title">${escapeHtml(t("viewOnMap"))}</div>
    <div class="card-actions">
      <button class="mini-btn primary" id="detailMapBtn" type="button">${escapeHtml(
        t("viewOnMap")
      )}</button>
      ${mapLinks}
    </div>

    <div class="section-title">${escapeHtml(t("nearby"))}</div>
    <div class="radius-row" id="radiusRow"></div>
    <div class="nearby-list" id="nearbyList"></div>

    <div class="section-title">${escapeHtml(t("moreInfo"))}</div>
    <div class="notice" style="margin-bottom:10px">${escapeHtml(t("moreInfoHint"))}</div>
    <div class="card-actions">
      <button class="mini-btn" id="askWebBtn" type="button">${escapeHtml(t("askWeb"))}</button>
    </div>
    <div id="webInfoBox"></div>
  `;

  renderRadiusButtons();
  loadNearby(feature);

  $("detailMapBtn").addEventListener("click", () => {
    focusMapPoint(feature);
    if (window.innerWidth <= 940) {
      closeDetails();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  $("askWebBtn").addEventListener("click", () => askWebForFeature(feature));

  dom.detailsModal.hidden = false;
}

function closeDetails() {
  dom.detailsModal.hidden = true;
  state.selected = null;
  resetMarkers();
}

function renderRadiusButtons() {
  const row = $("radiusRow");
  if (!row) return;
  row.innerHTML = "";
  [250, 500, 1000, 2000].forEach(radius => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-btn" + (state.nearbyRadius === radius ? " primary" : "");
    btn.textContent = radius < 1000 ? `${radius} ${t("meters")}` : `${radius / 1000} ${t("km")}`;
    btn.addEventListener("click", () => {
      state.nearbyRadius = radius;
      renderRadiusButtons();
      if (state.selected) loadNearby(state.selected);
    });
    row.appendChild(btn);
  });
}

async function loadNearby(feature) {
  const list = $("nearbyList");
  if (!list) return;
  if (!feature.hasCoordinates) {
    list.innerHTML = `<div class="notice">${escapeHtml(t("noAccessData"))}</div>`;
    return;
  }
  list.innerHTML = `<div class="loading-line">${escapeHtml(t("nearbyLoading"))}</div>`;
  try {
    const data = await fetchJson(
      ENDPOINTS.nearby,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: feature.latitude,
          longitude: feature.longitude,
          radius: state.nearbyRadius,
          excludeId: feature.id,
          category: state.nearbyCategory ? [state.nearbyCategory] : []
        })
      },
      25000
    );

    const items = data.features || [];
    if (!items.length) {
      list.innerHTML = `<div class="notice">${escapeHtml(t("nearbyEmpty"))}</div>`;
      return;
    }
    list.innerHTML =
      items
        .map(
          item => `
        <div class="nearby-item">
          <div>
            <strong style="font-size:13px">${escapeHtml(item.name)}</strong>
            <div style="color:var(--brand);font-size:11px;font-weight:700">${escapeHtml(
              item.category
            )}</div>
            <div style="color:var(--muted);font-size:11px">${escapeHtml(
              locationLabelOf(item) || "—"
            )}</div>
          </div>
          <div style="text-align:right">
            <div class="dist">${escapeHtml(formatDistance(item.distanceMeters))}</div>
            <button class="mini-btn" data-nearby-id="${escapeHtml(item.id)}" type="button" style="margin-top:6px">${escapeHtml(
              t("details")
            )}</button>
          </div>
        </div>`
        )
        .join("") +
      `<div class="notice" style="margin-top:8px">${escapeHtml(data.disclaimer || t("disclaimer"))}</div>`;

    list.querySelectorAll("[data-nearby-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = items.find(i => String(i.id) === String(btn.dataset.nearbyId));
        if (item) openDetails(item);
      });
    });
  } catch (error) {
    list.innerHTML = `<div class="notice">${escapeHtml(t("errorGeneric"))}</div>`;
  }
}

async function askWebForFeature(feature) {
  const box = $("webInfoBox");
  if (!box) return;
  box.innerHTML = `<div class="loading-line">${escapeHtml(t("webLoading"))}</div>`;
  const area = feature.area || feature.dimos || feature.perifereia || locationLabelOf(feature) || "";
  const question = `προσβασιμότητα ${feature.category} ${area}`.trim();
  let data = null;
  // 1) Δοκίμασε το /info. 2) Αν λείπει/αποτύχει, πέσε στο /chat (info mode).
  try {
    data = await fetchJson(
      ENDPOINTS.info,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      },
      90000
    );
  } catch (error) {
    try {
      data = await fetchJson(
        ENDPOINTS.chat,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, conversation: [], previousFeatures: [] })
        },
        90000
      );
    } catch (error2) {
      data = null;
    }
  }
  if (data && data.answer) {
    box.innerHTML = `<div class="bubble ai" style="max-width:100%;margin-top:10px">${renderAnswerWithSources(
      data
    )}</div>`;
  } else {
    box.innerHTML = `<div class="notice" style="margin-top:10px">${escapeHtml(t("errorGeneric"))}</div>`;
  }
}

/* ============================ AI ANSWER RENDERING ============================ */

function renderAnswerWithSources(data) {
  let html = escapeHtml(data.answer || "").replace(/\n/g, "<br>");
  if (Array.isArray(data.sources) && data.sources.length) {
    html += `<span class="src"><strong>${escapeHtml(t("sources"))}:</strong>`;
    data.sources.forEach(source => {
      html += `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">[${source.index}] ${escapeHtml(
        source.title || source.url
      )}</a>`;
    });
    html += `</span>`;
  }
  return html;
}

/* ============================ SEARCH AI CHAT ============================ */

function appendBubble(log, role, html) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.innerHTML = html;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

function appendTyping(log) {
  return appendBubble(log, "ai", `<span class="typing"><span>•</span><span>•</span><span>•</span></span>`);
}

async function sendSearchChat() {
  const message = dom.chatInput.value.trim();
  if (!message) return;
  dom.chatInput.value = "";
  appendBubble(dom.searchAiLog, "user", escapeHtml(message));
  const typing = appendTyping(dom.searchAiLog);

  try {
    const data = await fetchJson(
      ENDPOINTS.chat,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation: state.conversation,
          previousFeatures: state.previousFeatures
        })
      },
      90000
    );
    typing.remove();
    state.conversation.push({ role: "user", content: message });
    state.conversation.push({ role: "assistant", content: data.answer || "" });
    state.conversation = state.conversation.slice(-12);

    appendBubble(dom.searchAiLog, "ai", renderAnswerWithSources(data));
    renderSuggestions(chatSuggestionsFor(data));
    speak(data.answer || "");

    if (data.mode === "search" || data.mode === "followup") {
      const features = data.features || [];
      state.results = features;
      state.previousFeatures = features;
      renderResults({
        features,
        total: data.total ?? features.length,
        page: 1,
        pageCount: 1
      });
      showResultsView();
      drawFeatures(features);
    }
  } catch (error) {
    typing.remove();
    appendBubble(dom.searchAiLog, "ai", escapeHtml(t("errorGeneric")));
  }
}

/* ============================ CHAT GATING & SUGGESTIONS ============================ */

/**
 * Το chat χρησιμοποιείται ΜΟΝΟ αφού έχουν βρεθεί σημεία (απαίτηση χρήστη).
 * Εκτός αυτού, απενεργοποιείται και δείχνουμε το σχετικό μήνυμα.
 */
function enableChat(on) {
  state.chatEnabled = !!on;
  if (dom.chatInput) {
    dom.chatInput.disabled = !on;
    dom.chatInput.placeholder = on ? t("chatPh") : "Κάνε πρώτα αναζήτηση για να μιλήσουμε...";
  }
  const sendBtn = $("chatSendBtn");
  if (sendBtn) sendBtn.disabled = !on;
  if (dom.chatLock) dom.chatLock.hidden = !!on;
  if (!on && dom.chatSuggestions) dom.chatSuggestions.innerHTML = "";
}

function renderSuggestions(list) {
  if (!dom.chatSuggestions) return;
  const items = (list || []).filter(Boolean).slice(0, 5);
  dom.chatSuggestions.innerHTML = "";
  items.forEach(text => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion-chip";
    btn.textContent = text;
    btn.addEventListener("click", () => {
      dom.chatInput.value = text;
      sendSearchChat();
    });
    dom.chatSuggestions.appendChild(btn);
  });
}

function searchSuggestions(total) {
  if (state.lang === "en") {
    return total > 0
      ? ["Show me the nearby ones", "Which one has a ramp?", "Compare the first two", "More information"]
      : ["Change category", "Widen the area"];
  }
  return total > 0
    ? ["Δείξε μου τα κοντινά", "Ποιο έχει ράμπα;", "Σύγκρινε τα δύο πρώτα", "Περισσότερες πληροφορίες"]
    : ["Άλλαξε κατηγορία", "Διεύρυνε την περιοχή"];
}

function chatSuggestionsFor(data) {
  if (Array.isArray(data?.suggestions) && data.suggestions.length) return data.suggestions;
  if (data?.mode === "info") {
    return state.lang === "en"
      ? ["Give me an example", "Does this apply in Greece?", "Which law covers this?"]
      : ["Δώσε μου ένα παράδειγμα", "Ισχύει στην Ελλάδα;", "Ποιος νόμος το προβλέπει;"];
  }
  return searchSuggestions(state.results.length || data?.total || 0);
}

/* ============================ TEXT TO SPEECH (ο AI μιλάει) ============================ */

function stripForSpeech(text) {
  return String(text || "")
    .replace(/\[\d+\]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speak(text) {
  if (!state.ttsEnabled || !("speechSynthesis" in window)) return;
  const clean = stripForSpeech(text);
  if (!clean) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = state.lang === "el" ? "el-GR" : "en-US";
    utterance.rate = 1.03;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* αγνοούμε σφάλματα ομιλίας */
  }
}

function initTts() {
  const btn = dom.ttsBtn;
  if (!btn) return;
  btn.classList.toggle("on", state.ttsEnabled);
  btn.title = state.ttsEnabled ? "Αφήγηση AI: ενεργή" : "Αφήγηση AI: ανενεργή";
  btn.addEventListener("click", () => {
    state.ttsEnabled = !state.ttsEnabled;
    btn.classList.toggle("on", state.ttsEnabled);
    btn.title = state.ttsEnabled ? "Αφήγηση AI: ενεργή" : "Αφήγηση AI: ανενεργή";
    if (!state.ttsEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });
}

/* ============================ VOICE ============================ */

/** Δείχνει ορατό μήνυμα για τη φωνητική εισαγωγή (όχι σιωπηλή αποτυχία). */
function showVoiceNotice(message, kind = "warn") {
  const log = dom.searchAiLog;
  if (!log) {
    alert(message);
    return null;
  }
  const el = document.createElement("div");
  el.className = "bubble ai voice-notice" + (kind === "info" ? " voice-info" : "");
  el.textContent = message;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

/** Εξηγεί το σφάλμα του getUserMedia (έλεγχος μικροφώνου). */
function describeMicError(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Δεν δόθηκε άδεια μικροφώνου. Πάτα το εικονίδιο 🔒 στη γραμμή διευθύνσεων και επίτρεψε το μικρόφωνο.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Δεν βρέθηκε μικρόφωνο στη συσκευή σου.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Το μικρόφωνο χρησιμοποιείται από άλλη εφαρμογή. Κλείσε την άλλη εφαρμογή και δοκίμασε ξανά.";
  }
  return "Δεν ήταν δυνατή η πρόσβαση στο μικρόφωνο (" + (name || "άγνωστο σφάλμα") + ").";
}

const VOICE_ERROR_MESSAGES = {
  "not-allowed": "Δεν δόθηκε άδεια μικροφώνου. Πάτα το εικονίδιο 🔒 στη γραμμή διευθύνσεων και επίτρεψε το μικρόφωνο.",
  "service-not-allowed": "Ο browser μπλόκαρε τη φωνητική υπηρεσία. Δοκίμασε Google Chrome σε https.",
  "audio-capture": "Δεν βρέθηκε ή δεν είναι προσβάσιμο μικρόφωνο. Έλεγξε ότι είναι συνδεδεμένο και ενεργό.",
  "network": "Η φωνητική αναγνώριση απαιτεί σύνδεση στο διαδίκτυο.",
  "no-speech": "Δεν ακούστηκε ομιλία. Μίλα πιο κοντά στο μικρόφωνο και δοκίμασε ξανά.",
  "aborted": "Η φωνητική εισαγωγή διακόπηκε. Δοκίμασε ξανά.",
  "language-not-supported": "Η ελληνική φωνητική αναγνώριση δεν υποστηρίζεται σε αυτόν τον browser."
};

function setupVoice(buttonId, textarea, onFinal) {
  const button = $(buttonId);
  if (!button) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // ΔΕΝ κρύβουμε το κουμπί — ενημερώνουμε τον χρήστη τι συμβαίνει.
    button.title = "Ο browser δεν υποστηρίζει φωνητική εισαγωγή";
    button.addEventListener("click", () => {
      showVoiceNotice(
        "Η φωνητική εισαγωγή δεν υποστηρίζεται σε αυτόν τον browser. Δοκίμασε Google Chrome (ή Edge/Safari) σε ασφαλή σύνδεση https."
      );
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = state.lang === "el" ? "el-GR" : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listeningNotice = null;
  const clearListeningNotice = () => {
    if (listeningNotice && listeningNotice.parentNode) listeningNotice.parentNode.removeChild(listeningNotice);
    listeningNotice = null;
  };

  recognition.onresult = event => {
    clearListeningNotice();
    const transcript = event.results[0][0].transcript;
    textarea.value = transcript;
    textarea.dispatchEvent(new Event("input"));
    // Αυτόματη αποστολή μετά την αναγνώριση.
    if (onFinal) onFinal(transcript);
  };
  recognition.onend = () => {
    state.listening = false;
    button.classList.remove("active");
    clearListeningNotice();
  };
  recognition.onerror = event => {
    state.listening = false;
    button.classList.remove("active");
    clearListeningNotice();
    const code = event?.error || "unknown";
    showVoiceNotice(VOICE_ERROR_MESSAGES[code] || `Σφάλμα φωνητικής εισαγωγής (${code}).`);
  };

  button.addEventListener("click", async () => {
    if (state.listening) {
      try { recognition.stop(); } catch { /* αγνόησε */ }
      return;
    }

    // Έλεγχος μικροφώνου ΠΡΙΝ την αναγνώριση: δίνει σαφές, στοχευμένο σφάλμα.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      showVoiceNotice(describeMicError(error));
      return;
    }

    recognition.lang = state.lang === "el" ? "el-GR" : "en-US";
    state.listening = true;
    button.classList.add("active");
    try {
      listeningNotice = showVoiceNotice("Ακούω… μίλα τώρα.", "info");
      recognition.start();
    } catch (error) {
      state.listening = false;
      button.classList.remove("active");
      clearListeningNotice();
      showVoiceNotice("Δεν ξεκίνησε η φωνητική εισαγωγή (" + (error?.name || "σφάλμα") + "). Δοκίμασε ξανά.");
    }
  });
}

/* ============================ i18n APPLY ============================ */

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.dataset.i18nPh;
    el.placeholder = t(key);
  });
  const homeLead = document.querySelector('[data-i18n="homeLead"]');
  if (homeLead) homeLead.innerHTML = t("homeLead");
  $("langBtn").textContent = state.lang === "el" ? "EN" : "EL";
}

function toggleLanguage() {
  state.lang = state.lang === "el" ? "en" : "el";
  localStorage.setItem("city4all_lang", state.lang);
  applyLanguage();
  if (state.fields) {
    renderCategoryChips();
    renderAccessChips();
  }
  if (state.results.length) renderResults(state.lastSearch || { features: state.results, total: state.results.length, page: 1, pageCount: 1 });
}

/* ============================ EVENT BINDING ============================ */

function bindEvents() {
  $("langBtn").addEventListener("click", toggleLanguage);

  $("searchBtn").addEventListener("click", () => runSearch(1));
  $("resetBtn").addEventListener("click", () => {
    state.filters = {
      category: [],
      accessibility: [],
      location: { perifereia: "", nomoi: "", dimos: "", area: "", text: "" },
      keyword: ""
    };
    document.querySelectorAll(".chip.active").forEach(c => c.classList.remove("active"));
    dom.keywordInput.value = "";
    clearLocation();
    dimBackgroundLayers(false);
    showFiltersView();
  });
  $("backToFilters").addEventListener("click", showFiltersView);
  $("clearLocation").addEventListener("click", clearLocation);

  dom.locPerifereia.addEventListener("change", onPerifereiaChange);
  dom.locNomoi.addEventListener("change", onNomoiChange);
  dom.locDimos.addEventListener("change", onDimosChange);
  dom.locArea.addEventListener("change", onAreaChange);

  $("prevPage").addEventListener("click", () => runSearch(state.page - 1));
  $("nextPage").addEventListener("click", () => runSearch(state.page + 1));

  $("chatSendBtn").addEventListener("click", sendSearchChat);
  dom.chatInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendSearchChat();
    }
  });

  $("closeDetails").addEventListener("click", closeDetails);
  dom.detailsModal.addEventListener("click", event => {
    if (event.target === dom.detailsModal) closeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !dom.detailsModal.hidden) closeDetails();
  });

  initTts();
  setupVoice("searchVoiceBtn", dom.chatInput, () => sendSearchChat());
}

/* ============================ INIT ============================ */

async function init() {
  applyLanguage();
  bindEvents();
  showScreen("search");
  tryResolveExistingMap();

  await loadFields();
  await initLocationCascade();
}

document.addEventListener("DOMContentLoaded", init);

/* ============================ EXPORTS FOR TESTING ============================ */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { escapeHtml, formatDistance, locationLabelOf };
}

(async function () {
  "use strict";
  const config = window.MAP_CONFIG;
  const mapElement = document.getElementById("map");
  const errorElement = document.getElementById("map-error");
  let labels = window.MAP_LABELS || [];
  let labelsSignature = "";
  let map;
  let infoWindow;
  const overlays = new Map();

  function normalizeLabel(item) {
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) return item;
    const x = Number.isFinite(item.x) ? item.x : 50;
    const y = Number.isFinite(item.y) ? item.y : 50;
    return Object.assign({}, item, {
      lat: config.center.lat + (50 - y) * 0.00012,
      lng: config.center.lng + (x - 50) * 0.0002
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  async function loadLabels() {
    try {
      const response = await fetch(config.apiUrl + "/api/labels?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("API " + response.status);
      const result = await response.json();
      if (Array.isArray(result.labels)) labels = result.labels.map(normalizeLabel);
    } catch (error) {
      labels = labels.map(normalizeLabel);
      console.warn("ไม่สามารถโหลด Label จาก API จึงใช้ข้อมูลสำรอง", error);
    }
    labelsSignature = JSON.stringify(labels);
  }

  function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const callbackName = "mwaGoogleMapsReady";
      window[callbackName] = function () { delete window[callbackName]; resolve(); };
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(config.googleMapsApiKey) + "&callback=" + callbackName + "&loading=async&v=weekly&language=th&region=TH";
      script.async = true;
      script.onerror = () => reject(new Error("Google Maps load failed"));
      document.head.appendChild(script);
    });
  }

  function popupContent(item) {
    const category = config.categories[item.category] || config.categories.support;
    const files = item.downloads && item.downloads.length
      ? item.downloads.map(file => {
          const sample = file.sample ? '<span class="sample-tag">ไฟล์ตัวอย่าง</span>' : "";
          return '<a class="download-link" href="' + escapeHtml(file.url) + '" target="_blank" rel="noopener"><span aria-hidden="true">↓</span><span>' + escapeHtml(file.label) + sample + "</span></a>";
        }).join("")
      : '<p class="no-download">ยังไม่มีเอกสารที่เกี่ยวข้อง</p>';
    const hasSample = (item.downloads || []).some(file => file.sample);
    return '<article class="popup-card">' +
      '<div class="popup-category" style="--category-color:' + category.color + '">' + escapeHtml(category.label) + "</div>" +
      "<h3>" + escapeHtml(item.name) + "</h3>" +
      '<p class="popup-code">' + escapeHtml(item.label) + "</p>" +
      '<p class="popup-description">' + escapeHtml(item.description) + "</p>" +
      '<div class="popup-downloads"><strong>เอกสารที่เกี่ยวข้อง</strong>' + files + "</div>" +
      (hasSample ? '<small class="sample-note">หมายเหตุ: ลิงก์ที่ระบุว่าไฟล์ตัวอย่างยังไม่มีเอกสารจริงในระบบ</small>' : "") +
      "</article>";
  }

  function createMapLabelClass() {
    return class MapLabel extends google.maps.OverlayView {
    constructor(item) {
      super();
      this.item = item;
      this.position = new google.maps.LatLng(item.lat, item.lng);
      this.element = null;
      this.visible = true;
    }
    onAdd() {
      const category = config.categories[this.item.category] || config.categories.support;
      const element = document.createElement("button");
      element.type = "button";
      element.className = "map-label google-map-label";
      element.style.setProperty("--label-color", category.color);
      element.innerHTML = '<span class="label-dot"></span><span>' + escapeHtml(this.item.label) + "</span>";
      element.title = this.item.name;
      element.addEventListener("click", event => {
        event.stopPropagation();
        infoWindow.setContent(popupContent(this.item));
        infoWindow.setPosition(this.position);
        infoWindow.open({ map, shouldFocus: false });
      });
      this.element = element;
      this.getPanes().overlayMouseTarget.appendChild(element);
    }
    draw() {
      if (!this.element) return;
      const point = this.getProjection().fromLatLngToDivPixel(this.position);
      this.element.style.left = point.x + "px";
      this.element.style.top = point.y + "px";
      this.element.hidden = !this.visible;
    }
    onRemove() {
      if (this.element) this.element.remove();
      this.element = null;
    }
    setVisible(visible) { this.visible = visible; if (this.element) this.element.hidden = !visible; }
    };
  }

  function resetView() {
    infoWindow.close();
    map.setCenter(config.center);
    map.setZoom(config.initialZoom);
  }

  function buildCategoryFilters() {
    const container = document.getElementById("category-filters");
    Object.keys(config.categories).forEach(key => {
      const category = config.categories[key];
      const row = document.createElement("label");
      row.className = "category-row";
      row.innerHTML = '<span class="legend-dot" style="--legend-color:' + category.color + '"></span><span class="category-name">' + escapeHtml(category.label) + '</span><span class="category-count">' + labels.filter(item => item.category === key).length + ' จุด</span><input type="checkbox" data-category="' + key + '" checked><span class="mini-switch"></span>';
      container.appendChild(row);
    });
    container.addEventListener("change", event => {
      const input = event.target.closest("input[data-category]");
      if (!input) return;
      overlays.forEach(({ overlay, data }) => { if (data.category === input.dataset.category) overlay.setVisible(input.checked); });
      updateToggleAllText();
      runSearch(document.getElementById("label-search").value);
    });
  }

  function updateToggleAllText() {
    const inputs = Array.from(document.querySelectorAll("#category-filters input"));
    document.getElementById("toggle-all").textContent = inputs.every(input => input.checked) ? "ซ่อนทั้งหมด" : "แสดงทั้งหมด";
  }

  function categoryVisible(category) {
    const input = document.querySelector('[data-category="' + category + '"]');
    return input && input.checked;
  }

  function runSearch(query) {
    const results = document.getElementById("search-results");
    const term = query.trim().toLocaleLowerCase("th");
    results.innerHTML = "";
    if (!term) return;
    const found = labels.filter(item => categoryVisible(item.category) && (item.name.toLocaleLowerCase("th").includes(term) || item.label.toLocaleLowerCase("th").includes(term)));
    if (!found.length) { results.innerHTML = '<p class="empty-result">ไม่พบ Label ที่ค้นหา</p>'; return; }
    found.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = '<span class="result-dot" style="--result-color:' + config.categories[item.category].color + '"></span><span><strong>' + escapeHtml(item.label) + "</strong><small>" + escapeHtml(item.name) + "</small></span>";
      button.addEventListener("click", () => {
        map.panTo({ lat: item.lat, lng: item.lng });
        map.setZoom(Math.max(map.getZoom(), 18));
        infoWindow.setContent(popupContent(item));
        infoWindow.setPosition({ lat: item.lat, lng: item.lng });
        infoWindow.open({ map, shouldFocus: false });
        if (window.innerWidth < 760) document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth" });
      });
      results.appendChild(button);
    });
  }

  try {
    if (!config || !config.googleMapsApiKey) throw new Error("Missing Google Maps configuration");
    await Promise.all([loadLabels(), loadGoogleMaps()]);
    map = new google.maps.Map(mapElement, {
      center: config.center,
      zoom: config.initialZoom,
      mapTypeId: "satellite",
      tilt: 0,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      rotateControl: false,
      gestureHandling: "greedy",
      clickableIcons: false
    });
    infoWindow = new google.maps.InfoWindow({ maxWidth: 350 });
    const MapLabel = createMapLabelClass();
    labels.forEach(item => {
      const overlay = new MapLabel(item);
      overlay.setMap(map);
      overlays.set(item.id, { overlay, data: item });
    });
    buildCategoryFilters();
  } catch (error) {
    console.error(error);
    mapElement.setAttribute("aria-hidden", "true");
    errorElement.hidden = false;
    return;
  }

  document.getElementById("reset-view").addEventListener("click", resetView);
  document.getElementById("toggle-all").addEventListener("click", function () {
    const inputs = Array.from(document.querySelectorAll("#category-filters input"));
    const show = !inputs.every(input => input.checked);
    inputs.forEach(input => { input.checked = show; });
    overlays.forEach(({ overlay }) => overlay.setVisible(show));
    updateToggleAllText();
    runSearch(document.getElementById("label-search").value);
  });
  const searchInput = document.getElementById("label-search");
  searchInput.addEventListener("input", () => runSearch(searchInput.value));
  document.getElementById("clear-search").addEventListener("click", function () { searchInput.value = ""; document.getElementById("search-results").innerHTML = ""; searchInput.focus(); });

  if (new URLSearchParams(window.location.search).get("admin") === "1") {
    map.addListener("click", event => {
      window.parent.postMessage({ type: "mwa-map-coordinate", lat: Number(event.latLng.lat().toFixed(8)), lng: Number(event.latLng.lng().toFixed(8)) }, window.location.origin);
    });
  }

  async function checkForLabelUpdates() {
    try {
      const response = await fetch(config.apiUrl + "/api/labels?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      const normalized = Array.isArray(result.labels) ? result.labels.map(normalizeLabel) : [];
      if (JSON.stringify(normalized) !== labelsSignature) window.location.reload();
    } catch (error) { /* คงแผนที่ปัจจุบันไว้เมื่อเครือข่ายขัดข้อง */ }
  }
  window.setInterval(checkForLabelUpdates, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForLabelUpdates(); });
  if (window.parent !== window) window.parent.postMessage({ type: "mwa-map-ready" }, window.location.origin);
})();

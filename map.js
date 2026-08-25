(async function () {
  "use strict";

  const config = window.MAP_CONFIG;
  let labels = window.MAP_LABELS;
  try {
    if (config.apiUrl) {
      const response = await fetch(config.apiUrl + "/api/labels", { cache: "no-store" });
      if (!response.ok) throw new Error("API " + response.status);
      const result = await response.json();
      if (Array.isArray(result.labels) && result.labels.length) labels = result.labels;
    }
  } catch (error) { console.warn("ไม่สามารถโหลด Label จาก API จึงใช้ข้อมูลสำรอง", error); }
  const mapElement = document.getElementById("map");
  const errorElement = document.getElementById("map-error");

  if (!window.L || !config || !Array.isArray(labels)) {
    mapElement.setAttribute("aria-hidden", "true");
    errorElement.hidden = false;
    return;
  }

  const width = config.imageWidth;
  const height = config.imageHeight;
  const bounds = L.latLngBounds([0, 0], [height, width]);
  const markers = new Map();
  const categoryLayers = {};

  const map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 3,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    attributionControl: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1
  });

  L.imageOverlay(config.imageUrl, bounds, { alt: "ผังโรงงานผลิตน้ำ การประปานครหลวง" }).addTo(map);
  map.fitBounds(bounds, { padding: [16, 16] });
  const initialZoom = map.getZoom();
  map.setMinZoom(initialZoom);

  Object.keys(config.categories).forEach(function (key) {
    categoryLayers[key] = L.layerGroup().addTo(map);
  });

  function percentToLatLng(x, y) {
    return L.latLng(height * (1 - y / 100), width * (x / 100));
  }

  function latLngToPercent(latlng) {
    return {
      x: Math.max(0, Math.min(100, (latlng.lng / width) * 100)),
      y: Math.max(0, Math.min(100, (1 - latlng.lat / height) * 100))
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function popupContent(item) {
    const category = config.categories[item.category];
    const files = item.downloads && item.downloads.length
      ? item.downloads.map(function (file) {
          const sample = file.sample ? '<span class="sample-tag">ไฟล์ตัวอย่าง</span>' : "";
          return '<a class="download-link" href="' + escapeHtml(file.url) + '" download>' +
            '<span aria-hidden="true">↓</span><span>' + escapeHtml(file.label) + sample + "</span></a>";
        }).join("")
      : '<p class="no-download">ยังไม่มีเอกสารที่เกี่ยวข้อง</p>';

    return '<article class="popup-card">' +
      '<div class="popup-category" style="--category-color:' + category.color + '">' + escapeHtml(category.label) + "</div>" +
      "<h3>" + escapeHtml(item.name) + "</h3>" +
      '<p class="popup-code">' + escapeHtml(item.label) + "</p>" +
      '<p class="popup-description">' + escapeHtml(item.description) + "</p>" +
      '<div class="popup-downloads"><strong>เอกสารที่เกี่ยวข้อง</strong>' + files + "</div>" +
      ((item.downloads || []).some(function (file) { return file.sample; }) ? '<small class="sample-note">หมายเหตุ: ลิงก์ที่ระบุว่าไฟล์ตัวอย่างยังไม่มีเอกสารจริงในระบบ</small>' : "") +
      "</article>";
  }

  labels.forEach(function (item) {
    if (!config.categories[item.category]) return;
    const category = config.categories[item.category];
    const icon = L.divIcon({
      className: "map-label-wrapper",
      html: '<span class="map-label" style="--label-color:' + category.color + '"><span class="label-dot"></span><span>' + escapeHtml(item.label) + "</span></span>",
      iconSize: null,
      iconAnchor: [0, 17]
    });
    const marker = L.marker(percentToLatLng(item.x, item.y), {
      icon: icon,
      title: item.name,
      riseOnHover: true,
      keyboard: true
    }).bindPopup(popupContent(item), { maxWidth: 330, minWidth: 260, className: "plant-popup" });
    marker.addTo(categoryLayers[item.category]);
    markers.set(item.id, { marker: marker, data: item });
  });

  function resetView() {
    map.closePopup();
    map.fitBounds(bounds, { padding: [16, 16], animate: true });
  }

  document.getElementById("reset-view").addEventListener("click", resetView);

  const filtersElement = document.getElementById("category-filters");
  Object.keys(config.categories).forEach(function (key) {
    const category = config.categories[key];
    const row = document.createElement("label");
    row.className = "category-row";
    row.innerHTML = '<span class="legend-dot" style="--legend-color:' + category.color + '"></span>' +
      '<span class="category-name">' + escapeHtml(category.label) + "</span>" +
      '<span class="category-count">' + labels.filter(function (item) { return item.category === key; }).length + " จุด</span>" +
      '<input type="checkbox" data-category="' + key + '" checked><span class="mini-switch"></span>';
    filtersElement.appendChild(row);
  });

  function updateToggleAllText() {
    const inputs = Array.from(filtersElement.querySelectorAll("input"));
    document.getElementById("toggle-all").textContent = inputs.every(function (input) { return input.checked; }) ? "ซ่อนทั้งหมด" : "แสดงทั้งหมด";
  }

  filtersElement.addEventListener("change", function (event) {
    const input = event.target.closest("input[data-category]");
    if (!input) return;
    const layer = categoryLayers[input.dataset.category];
    if (input.checked) layer.addTo(map); else map.removeLayer(layer);
    updateToggleAllText();
    runSearch(document.getElementById("label-search").value);
  });

  document.getElementById("toggle-all").addEventListener("click", function () {
    const inputs = Array.from(filtersElement.querySelectorAll("input"));
    const shouldShow = !inputs.every(function (input) { return input.checked; });
    inputs.forEach(function (input) {
      input.checked = shouldShow;
      const layer = categoryLayers[input.dataset.category];
      if (shouldShow) layer.addTo(map); else map.removeLayer(layer);
    });
    updateToggleAllText();
    runSearch(document.getElementById("label-search").value);
  });

  const searchInput = document.getElementById("label-search");
  const searchResults = document.getElementById("search-results");

  function isCategoryVisible(category) {
    const input = filtersElement.querySelector('[data-category="' + category + '"]');
    return input && input.checked;
  }

  function runSearch(query) {
    const term = query.trim().toLocaleLowerCase("th");
    searchResults.innerHTML = "";
    if (!term) return;
    const found = labels.filter(function (item) {
      return isCategoryVisible(item.category) && (item.name.toLocaleLowerCase("th").includes(term) || item.label.toLocaleLowerCase("th").includes(term));
    });
    if (!found.length) {
      searchResults.innerHTML = '<p class="empty-result">ไม่พบ Label ที่ค้นหา</p>';
      return;
    }
    found.forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = '<span class="result-dot" style="--result-color:' + config.categories[item.category].color + '"></span><span><strong>' + escapeHtml(item.label) + "</strong><small>" + escapeHtml(item.name) + "</small></span>";
      button.addEventListener("click", function () {
        const target = markers.get(item.id).marker;
        map.setView(target.getLatLng(), Math.max(map.getZoom(), initialZoom + 1), { animate: true });
        target.openPopup();
        if (window.innerWidth < 760) document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth" });
      });
      searchResults.appendChild(button);
    });
  }

  searchInput.addEventListener("input", function () { runSearch(searchInput.value); });
  document.getElementById("clear-search").addEventListener("click", function () {
    searchInput.value = "";
    searchResults.innerHTML = "";
    searchInput.focus();
  });

  map.on("click", function (event) {
    if (new URLSearchParams(window.location.search).get("admin") === "1" && bounds.contains(event.latlng)) {
      const adminPoint = latLngToPercent(event.latlng);
      window.parent.postMessage({ type: "mwa-map-coordinate", x: Number(adminPoint.x.toFixed(2)), y: Number(adminPoint.y.toFixed(2)) }, window.location.origin);
    }
  });

  window.addEventListener("resize", function () {
    map.invalidateSize();
    const fitZoom = map.getBoundsZoom(bounds, false, [16, 16]);
    map.setMinZoom(fitZoom);
    if (map.getZoom() < fitZoom) map.setZoom(fitZoom);
    map.panInsideBounds(bounds, { animate: false });
  });
  if (window.parent !== window) window.parent.postMessage({ type: "mwa-map-ready" }, window.location.origin);
})();

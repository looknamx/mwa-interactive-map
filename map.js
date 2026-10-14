(async function () {
  "use strict";
  const config = window.MAP_CONFIG;
  const mapElement = document.getElementById("map");
  const errorElement = document.getElementById("map-error");
  let labels = window.MAP_LABELS || [];
  let labelsSignature = "";
  let map;
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

  function resetView() {
    map.closePopup();
    map.setView([config.center.lat, config.center.lng], config.initialZoom, { animate: true });
  }

  function buildCategoryFilters() {
    const container = document.getElementById("category-filters");
    container.innerHTML = "";
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
      overlays.forEach(({ marker, data }) => {
        if (data.category === input.dataset.category) {
          if (input.checked) {
            if (!map.hasLayer(marker)) marker.addTo(map);
          } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
          }
        }
      });
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
        const entry = overlays.get(item.id);
        if (entry) {
          if (!map.hasLayer(entry.marker)) entry.marker.addTo(map);
          map.setView([item.lat, item.lng], Math.max(map.getZoom(), 18), { animate: true });
          entry.marker.openPopup();
        }
        if (window.innerWidth < 760) document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth" });
      });
      results.appendChild(button);
    });
  }

  try {
    if (!window.L) throw new Error("Leaflet library not loaded");
    await loadLabels();

    map = L.map(mapElement, {
      center: [config.center.lat, config.center.lng],
      zoom: config.initialZoom,
      zoomControl: true,
      attributionControl: true
    });

    const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxNativeZoom: 18,
      maxZoom: 19,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
    });

    const esriLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxNativeZoom: 18,
      maxZoom: 19,
      attribution: "Tiles &copy; Esri"
    });

    // แสดงแผนที่ดาวเทียม Esri เป็นหลัก
    esriSatellite.addTo(map);

    const overlayMaps = {
      "ชื่อถนนและสถานที่": esriLabels
    };

    L.control.layers(null, overlayMaps, { position: "topright" }).addTo(map);

    labels.forEach(item => {
      const category = config.categories[item.category] || config.categories.support;
      const icon = L.divIcon({
        className: "map-label-wrapper",
        html: '<span class="map-label" style="--label-color:' + category.color + '"><span class="label-dot"></span><span>' + escapeHtml(item.label) + "</span></span>",
        iconSize: null,
        iconAnchor: [-5, 0],
        popupAnchor: [15, -15]
      });

      const marker = L.marker([item.lat, item.lng], {
        icon: icon,
        title: item.name,
        riseOnHover: true,
        keyboard: true
      }).bindPopup(popupContent(item), { maxWidth: 350, minWidth: 260, className: "plant-popup" });

      marker.addTo(map);
      overlays.set(item.id, { marker, data: item });
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
    overlays.forEach(({ marker }) => {
      if (show) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      }
    });
    updateToggleAllText();
    runSearch(document.getElementById("label-search").value);
  });

  const searchInput = document.getElementById("label-search");
  searchInput.addEventListener("input", () => runSearch(searchInput.value));
  document.getElementById("clear-search").addEventListener("click", function () {
    searchInput.value = "";
    document.getElementById("search-results").innerHTML = "";
    searchInput.focus();
  });

  map.on("click", event => {
    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      window.parent.postMessage({
        type: "mwa-map-coordinate",
        lat: Number(event.latlng.lat.toFixed(8)),
        lng: Number(event.latlng.lng.toFixed(8))
      }, window.location.origin);
    }
  });

  window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
  });

  async function checkForLabelUpdates() {
    if (!config.apiUrl) return;
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

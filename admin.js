(function () {
  "use strict";
  const defaults = JSON.parse(JSON.stringify(window.MAP_LABELS));
  const apiUrl = window.MAP_CONFIG.apiUrl;
  const colors = { production: "#1769e0", transmission: "#00aeca", civil: "#f28a2e", support: "#27a66a" };
  let items = defaults;
  const byId = id => document.getElementById(id);
  const form = byId("label-form");
  const preview = byId("map-preview");
  const status = byId("admin-status");
  const fields = {
    index: byId("edit-index"), id: byId("field-id"), label: byId("field-label"), name: byId("field-name"),
    x: byId("field-x"), y: byId("field-y"), category: byId("field-category"), description: byId("field-description")
  };

  function addDocumentRow(file = {}) {
    const row = document.createElement("div");
    row.className = "document-item";
    row.innerHTML = '<span class="document-index"></span>' +
      '<button class="remove-document" type="button" aria-label="ลบเอกสาร" title="ลบเอกสาร">×</button>' +
      '<label>ชื่อเอกสาร <input class="document-label" placeholder="ข้อมูลสถานที่ (PDF)" value="' + escapeHtml(file.label || "") + '"></label>' +
      '<label>URL เอกสาร <input class="document-url" placeholder="documents/example.pdf" value="' + escapeHtml(file.url || "") + '"></label>' +
      '<label class="document-sample"><input class="document-is-sample" type="checkbox"' + (file.sample !== false ? " checked" : "") + '> ระบุว่าเป็นไฟล์ตัวอย่าง</label>';
    row.querySelector(".remove-document").addEventListener("click", function () {
      row.remove();
      if (!byId("document-list").children.length) addDocumentRow();
      updateDocumentNumbers();
    });
    byId("document-list").appendChild(row);
    updateDocumentNumbers();
  }

  function updateDocumentNumbers() {
    Array.from(byId("document-list").children).forEach((row, index) => {
      row.querySelector(".document-index").textContent = "เอกสาร " + (index + 1);
    });
  }

  function setDocuments(files) {
    byId("document-list").innerHTML = "";
    const list = Array.isArray(files) && files.length ? files : [{}];
    list.forEach(addDocumentRow);
  }

  function getDocuments() {
    return Array.from(byId("document-list").querySelectorAll(".document-item")).map(row => ({
      label: row.querySelector(".document-label").value.trim() || "เอกสารที่เกี่ยวข้อง",
      url: row.querySelector(".document-url").value.trim(),
      sample: row.querySelector(".document-is-sample").checked
    })).filter(file => file.url);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  async function load() {
    status.textContent = "กำลังโหลดข้อมูล...";
    try {
      const response = await fetch(apiUrl + "/api/labels", { cache: "no-store" });
      if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const result = await response.json();
      items = Array.isArray(result.labels) && result.labels.length ? result.labels : defaults;
      status.textContent = "เชื่อมต่อฐานข้อมูลแล้ว";
      render();
    } catch (error) {
      items = defaults;
      status.textContent = "ไม่สามารถโหลดฐานข้อมูล กำลังแสดงข้อมูลสำรอง";
      render();
    }
  }

  async function persist(message) {
    status.textContent = "กำลังบันทึก...";
    const response = await fetch(apiUrl + "/api/labels", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + window.MWA_AUTH.getToken() },
      body: JSON.stringify({ labels: items })
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.MWA_AUTH.logout();
      throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
    }
    if (!response.ok) throw new Error(result.error || "บันทึกไม่สำเร็จ");
    status.textContent = message;
    render();
    preview.contentWindow.location.reload();
  }

  function render() {
    const list = byId("label-list");
    list.innerHTML = "";
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "label-card";
      button.style.setProperty("--card-color", colors[item.category] || "#999");
      button.innerHTML = '<i></i><span><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.name) + " • x " + item.x + ", y " + item.y + "</small></span>";
      button.addEventListener("click", () => edit(index));
      list.appendChild(button);
    });
    byId("label-count").textContent = items.length + " รายการ";
  }

  function edit(index) {
    const item = items[index];
    fields.index.value = index;
    ["id", "label", "name", "x", "y", "category", "description"].forEach(key => { fields[key].value = item[key]; });
    setDocuments(item.downloads);
    byId("form-title").textContent = "แก้ไข Label";
    byId("delete-label").hidden = false;
    if (innerWidth < 701) document.querySelector(".admin-panel").scrollIntoView({ behavior: "smooth" });
  }

  function clearForm() {
    form.reset();
    fields.index.value = "";
    setDocuments([]);
    byId("form-title").textContent = "เพิ่ม Label ใหม่";
    byId("delete-label").hidden = true;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const index = fields.index.value;
    const item = { id: fields.id.value.trim(), label: fields.label.value.trim(), name: fields.name.value.trim(), x: Number(fields.x.value), y: Number(fields.y.value), category: fields.category.value, description: fields.description.value.trim(), downloads: getDocuments() };
    if (items.some((entry, itemIndex) => entry.id === item.id && itemIndex !== Number(index))) { status.textContent = "ID นี้ถูกใช้งานแล้ว"; return; }
    const previous = JSON.parse(JSON.stringify(items));
    if (index === "") items.push(item); else items[Number(index)] = item;
    try { await persist(index === "" ? "เพิ่ม Label และเผยแพร่แล้ว" : "บันทึกและเผยแพร่แล้ว"); clearForm(); }
    catch (error) { items = previous; render(); status.textContent = error.message; }
  });

  byId("new-label").addEventListener("click", clearForm);
  byId("add-document").addEventListener("click", function () { addDocumentRow(); });
  byId("delete-label").addEventListener("click", async () => {
    const index = Number(fields.index.value);
    if (!Number.isInteger(index) || !confirm("ต้องการลบ Label นี้หรือไม่?")) return;
    const previous = JSON.parse(JSON.stringify(items));
    items.splice(index, 1);
    try { await persist("ลบ Label และเผยแพร่แล้ว"); clearForm(); }
    catch (error) { items = previous; render(); status.textContent = error.message; }
  });

  byId("reset-data").addEventListener("click", async () => {
    if (!confirm("คืนค่า Label ทั้งหมดเป็นข้อมูลเริ่มต้นหรือไม่?")) return;
    const previous = items;
    items = JSON.parse(JSON.stringify(defaults));
    try { await persist("คืนค่าและเผยแพร่แล้ว"); clearForm(); }
    catch (error) { items = previous; render(); status.textContent = error.message; }
  });

  byId("export-data").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "mwa-map-labels.json"; link.click(); URL.revokeObjectURL(link.href);
  });

  byId("import-data").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const previous = items;
      try {
        const data = JSON.parse(reader.result); if (!Array.isArray(data)) throw new Error("ไฟล์ JSON ไม่ถูกต้อง");
        items = data; await persist("นำเข้าและเผยแพร่แล้ว"); clearForm();
      } catch (error) { items = previous; render(); status.textContent = error.message; }
    };
    reader.readAsText(file); event.target.value = "";
  });

  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.source !== preview.contentWindow) return;
    if (event.data && event.data.type === "mwa-map-coordinate") {
      fields.x.value = event.data.x; fields.y.value = event.data.y; status.textContent = "รับพิกัดจากแผนที่แล้ว";
    }
  });

  setDocuments([]);
  load();
})();

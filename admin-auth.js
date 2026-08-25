(function () {
  "use strict";
  // PIN สำหรับต้นแบบเท่านั้น: เปลี่ยนค่าได้ที่นี่ ก่อนใช้งานจริงควรตรวจ PIN ที่ฝั่งเซิร์ฟเวอร์
  const ADMIN_PIN = "2468";
  const SESSION_KEY = "mwa-map-admin-unlocked";
  const gate = document.getElementById("pin-gate");
  const form = document.getElementById("pin-form");
  const input = document.getElementById("pin-input");
  const error = document.getElementById("pin-error");

  if (sessionStorage.getItem(SESSION_KEY) === "yes") gate.classList.add("is-unlocked");

  input.addEventListener("input", function () {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    error.textContent = "";
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (input.value !== ADMIN_PIN) {
      error.textContent = "รหัส PIN ไม่ถูกต้อง";
      input.value = "";
      input.focus();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "yes");
    gate.classList.add("is-unlocked");
  });

  document.getElementById("admin-logout").addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_KEY);
    input.value = "";
    gate.classList.remove("is-unlocked");
    input.focus();
  });
})();

(function () {
  "use strict";
  const TOKEN_KEY = "mwa-map-admin-token";
  const gate = document.getElementById("pin-gate");
  const form = document.getElementById("pin-form");
  const input = document.getElementById("pin-input");
  const error = document.getElementById("pin-error");
  const apiUrl = window.MAP_CONFIG.apiUrl;

  window.MWA_AUTH = {
    getToken: function () { return sessionStorage.getItem(TOKEN_KEY) || ""; },
    logout: function () {
      sessionStorage.removeItem(TOKEN_KEY);
      gate.classList.remove("is-unlocked");
      input.value = "";
      input.focus();
    }
  };

  if (window.MWA_AUTH.getToken()) gate.classList.add("is-unlocked");

  input.addEventListener("input", function () {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    error.textContent = "";
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    error.textContent = "กำลังตรวจสอบ...";
    try {
      const response = await fetch(apiUrl + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: input.value })
      });
      const result = await response.json();
      if (!response.ok || !result.token) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      sessionStorage.setItem(TOKEN_KEY, result.token);
      gate.classList.add("is-unlocked");
      error.textContent = "";
      window.dispatchEvent(new CustomEvent("mwa-admin-authenticated"));
    } catch (requestError) {
      error.textContent = requestError.message || "ไม่สามารถเชื่อมต่อระบบได้";
      input.value = "";
      input.focus();
    } finally { button.disabled = false; }
  });

  document.getElementById("admin-logout").addEventListener("click", window.MWA_AUTH.logout);
})();

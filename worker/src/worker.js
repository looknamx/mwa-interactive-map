const ALLOWED_ORIGINS = new Set([
  "https://looknamx.github.io",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8765",
  "http://localhost:5500",
  "http://localhost:8765"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const url = new URL(request.url);
  const isPublicRead = request.method === "GET" && (url.pathname === "/api/labels" || url.pathname === "/api/health");
  return {
    "Access-Control-Allow-Origin": isPublicRead ? "*" : (ALLOWED_ORIGINS.has(origin) ? origin : "https://looknamx.github.io"),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request) }
  });
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function createToken(secret) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })));
  return payload + "." + await sign(payload, secret);
}

async function isAuthorized(request, secret) {
  const value = request.headers.get("Authorization") || "";
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== await sign(payload, secret)) return false;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0))));
    return Number(decoded.exp) > Date.now();
  } catch (error) { return false; }
}

function validLabels(labels) {
  return Array.isArray(labels) && labels.length <= 500 && labels.every(item =>
    item && typeof item.id === "string" && item.id.length <= 100 &&
    typeof item.label === "string" && typeof item.name === "string" &&
    Number.isFinite(item.x) && item.x >= 0 && item.x <= 100 &&
    Number.isFinite(item.y) && item.y >= 0 && item.y <= 100 &&
    ["production", "transmission", "civil", "support"].includes(item.category) &&
    typeof item.description === "string" && Array.isArray(item.downloads)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (url.pathname === "/api/health" && request.method === "GET") return json(request, { ok: true });

    if (url.pathname === "/api/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (String(body.pin || "") !== env.ADMIN_PIN) return json(request, { error: "PIN ไม่ถูกต้อง" }, 401);
      return json(request, { token: await createToken(env.SESSION_SECRET), expiresIn: 28800 });
    }

    if (url.pathname === "/api/labels" && request.method === "GET") {
      const row = await env.DB.prepare("SELECT labels_json, updated_at FROM map_state WHERE id = 1").first();
      if (!row) return json(request, { labels: [], updatedAt: null });
      return json(request, { labels: JSON.parse(row.labels_json), updatedAt: row.updated_at });
    }

    if (url.pathname === "/api/labels" && request.method === "PUT") {
      if (!await isAuthorized(request, env.SESSION_SECRET)) return json(request, { error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
      const body = await request.json().catch(() => ({}));
      if (!validLabels(body.labels)) return json(request, { error: "ข้อมูล Label ไม่ถูกต้อง" }, 400);
      await env.DB.prepare("INSERT INTO map_state (id, labels_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET labels_json = excluded.labels_json, updated_at = CURRENT_TIMESTAMP")
        .bind(JSON.stringify(body.labels)).run();
      return json(request, { ok: true, count: body.labels.length });
    }

    return json(request, { error: "Not found" }, 404);
  }
};

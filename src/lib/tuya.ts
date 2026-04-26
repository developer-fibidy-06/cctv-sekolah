import crypto from "crypto";

const BASE_URL = process.env.TUYA_BASE_URL ?? "";
const CLIENT_ID = process.env.TUYA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET ?? "";
const IS_MOCK = process.env.DEV_MOCK_STREAM === "true";

/**
 * In-memory token cache. Tuya access_token expire 2 jam, kita refresh tiap 110 menit.
 *
 * Kenapa cache? Token bukan "data", token adalah credential aplikasi ke Tuya.
 * No-cache hanya berlaku untuk stream URL (yang memang expire 10 menit).
 *
 * Cache disimpan di memory proses Node.js — bukan disk, bukan DB.
 * Function dingin → token hilang otomatis → ambil baru.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;

// =============================================
// Tuya v2 Signature Helpers
// HMAC-SHA256 + SHA256 body hash
// =============================================

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function hmacSha256Upper(str: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(str)
    .digest("hex")
    .toUpperCase();
}

function buildStringToSign(method: string, body: string, urlPath: string): string {
  const contentHash = sha256(body || "");
  const signedHeaders = ""; // tidak pakai signed headers custom
  return `${method}\n${contentHash}\n${signedHeaders}\n${urlPath}`;
}

function signTokenRequest(t: string, urlPath: string): string {
  // Token request: stringToSign = clientId + t + (method\nbodyHash\nheaders\nurl)
  const stringToSign = buildStringToSign("GET", "", urlPath);
  return hmacSha256Upper(CLIENT_ID + t + stringToSign, CLIENT_SECRET);
}

function signBusinessRequest(
  token: string,
  t: string,
  method: string,
  body: string,
  urlPath: string
): string {
  // Business request: stringToSign = clientId + accessToken + t + (method\nbodyHash\nheaders\nurl)
  const stringToSign = buildStringToSign(method, body, urlPath);
  return hmacSha256Upper(CLIENT_ID + token + t + stringToSign, CLIENT_SECRET);
}

// =============================================
// Token Management
// =============================================

async function fetchNewToken(): Promise<string> {
  if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Tuya credentials missing. Set TUYA_BASE_URL, TUYA_CLIENT_ID, TUYA_CLIENT_SECRET in env."
    );
  }

  const t = Date.now().toString();
  const urlPath = "/v1.0/token?grant_type=1";
  const sign = signTokenRequest(t, urlPath);

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: "GET",
    headers: {
      client_id: CLIENT_ID,
      sign,
      t,
      sign_method: "HMAC-SHA256",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(
      `Tuya token error: ${data.msg ?? "unknown"} (code: ${data.code ?? "n/a"})`
    );
  }

  cachedToken = {
    value: data.result.access_token,
    expiresAt: Date.now() + 110 * 60 * 1000, // 110 menit
  };
  return cachedToken.value;
}

async function getTuyaToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  return fetchNewToken();
}

// =============================================
// Stream URL — fresh tiap request (no-cache)
// =============================================

interface StreamApiResponse {
  success: boolean;
  result?: { url: string };
  msg?: string;
  code?: number;
}

async function callStreamApi(
  deviceId: string,
  token: string
): Promise<StreamApiResponse> {
  const t = Date.now().toString();
  const body = JSON.stringify({ type: "hls" });
  const urlPath = `/v1.0/devices/${deviceId}/stream/actions/allocate`;
  const sign = signBusinessRequest(token, t, "POST", body, urlPath);

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: "POST",
    headers: {
      client_id: CLIENT_ID,
      access_token: token,
      sign,
      t,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store", // CRITICAL: stream URL expire ~10 menit, harus fresh
  });

  return res.json();
}

export async function getStreamUrl(deviceId: string): Promise<string> {
  // ===== MOCK MODE — dev tanpa kamera fisik =====
  if (IS_MOCK) {
    const mocks: Record<string, string> = {
      "mockdevice001": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      "mockdevice002":
        "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
    };
    return (
      mocks[deviceId] ??
      mocks["mockdevice001"] ??
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    );
  }

  // ===== PRODUCTION =====
  let token = await getTuyaToken();
  let response = await callStreamApi(deviceId, token);

  // Tuya error code 1010 = token invalid, 1011 = token expired
  // Auto-refresh token & retry sekali — defensive untuk edge case rolling key
  if (!response.success && (response.code === 1010 || response.code === 1011)) {
    token = await getTuyaToken(true);
    response = await callStreamApi(deviceId, token);
  }

  if (!response.success || !response.result?.url) {
    throw new Error(
      `Tuya stream error: ${response.msg ?? "unknown"} (code: ${response.code ?? "n/a"})`
    );
  }

  return response.result.url;
}
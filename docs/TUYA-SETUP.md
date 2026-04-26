# Tuya Developer Setup — From Zero

> Guide lengkap setup Tuya Cloud untuk Daycare CCTV. Dari daftar developer account, pair Bardi, sampai dapat stream URL `.m3u8` yang valid.

**Hasil akhir setelah selesai:**
- Punya `TUYA_CLIENT_ID`, `TUYA_CLIENT_SECRET`, `TUYA_BASE_URL` untuk diisi ke `.env.local`
- Punya `device_id` Bardi untuk di-seed ke tabel `cameras` di Supabase
- Sudah test API token + stream → dapat URL `.m3u8` yang bisa di-play di VLC

---

## Daftar Isi

1. [Prerequisite & Konteks](#prerequisite--konteks)
2. [Step 1 — Daftar Akun Tuya Developer](#step-1--daftar-akun-tuya-developer)
3. [Step 2 — Buat Cloud Project](#step-2--buat-cloud-project)
4. [Step 3 — Authorize API Services](#step-3--authorize-api-services)
5. [Step 4 — Ambil API Credentials](#step-4--ambil-api-credentials)
6. [Step 5 — Pasang Bardi via Smart Life App](#step-5--pasang-bardi-via-smart-life-app)
7. [Step 6 — Link Smart Life ke Cloud Project](#step-6--link-smart-life-ke-cloud-project)
8. [Step 7 — Catat Device ID](#step-7--catat-device-id)
9. [Step 8 — Test Hit API (curl)](#step-8--test-hit-api-curl)
10. [Step 9 — Hubungkan ke App](#step-9--hubungkan-ke-app)
11. [Common Issues](#common-issues)

---

## Prerequisite & Konteks

**Yang dibutuhkan:**
- Akun email (untuk daftar Tuya Developer — beda dari akun Bardi/Smart Life)
- Smart Life app di HP (Android/iOS)
- Bardi CCTV fisik + WiFi

**Konteks penting:**

Bardi adalah brand yang menjalankan device-nya di atas ekosistem Tuya. Tuya menyediakan **OpenAPI** untuk akses programmatic ke device — termasuk ambil stream URL HLS dari kamera. App kita (Daycare CCTV) jadi orchestrator yang:

1. Auth ke Tuya pakai `client_id` + `client_secret` → dapat `access_token` (cache 110 menit)
2. Hit `/v1.0/devices/{deviceId}/stream/actions/allocate` dengan `type: hls` → dapat URL `.m3u8`
3. Kirim URL ke browser → HLS.js render video

Semua signing & token management server-side only. Browser tidak pernah lihat secret.

---

## Step 1 — Daftar Akun Tuya Developer

URL: <https://iot.tuya.com>

1. Klik **Sign Up**, isi email + password
2. Verifikasi email
3. Saat ditanya country/region, **pilih sesuai region akun Bardi/Smart Life kamu**

> ⚠️ **Akun Tuya Developer ≠ akun Bardi/Smart Life.** Ini akun developer terpisah. Jangan login pakai kredensial yang dipakai di Bardi app.

---

## Step 2 — Buat Cloud Project

1. Login ke <https://iot.tuya.com>
2. Sidebar kiri → **Cloud → Development**
3. Klik **Create Cloud Project**

Isi:

| Field | Value |
|---|---|
| Project Name | `daycare-cctv` (bebas) |
| Description | bebas |
| Industry | **Smart Home** |
| Development Method | **Smart Home** |
| Data Center | sesuai region akun Smart Life — Indonesia umumnya **Central Europe** |

4. Klik **Create**

### Mapping Data Center

Cara cek region akun Smart Life:

1. Buka Smart Life app
2. **Me** (tab paling kanan) → ⚙️ **Setting** → **Account and Security** → **Region**

Sesuaikan dengan tabel ini:

| Region Smart Life | Data Center Tuya | Base URL |
|---|---|---|
| Europe (mostly Indonesia ada di sini) | Central Europe | `https://openapi.tuyaeu.com` |
| India | India | `https://openapi.tuyain.com` |
| America | Western America | `https://openapi.tuyaus.com` |
| China | China | `https://openapi.tuyacn.com` |

> ⚠️ **Kalau salah pilih data center, device tidak akan muncul di Tuya Cloud.** Ini gotcha #1 yang bikin orang stuck berjam-jam.

---

## Step 3 — Authorize API Services

Setelah project dibuat, otomatis muncul dialog **Authorize API Services**.

**Wajib centang minimal:**

- ✅ **Industry Basic Service**
- ✅ **Smart Home Basic Service**
- ✅ **Device Status Notification**
- ✅ **IoT Video Live Stream** ← INI PALING PENTING. Tanpa ini, API stream akan return error.
- ✅ **Authorization Token Management**

Klik **Authorize**.

> Kalau dialog ini ke-skip atau lupa, bisa diakses ulang lewat tab **Service API** di project. Semua API yang authorized harus terlihat di list "Subscribed".

---

## Step 4 — Ambil API Credentials

1. Buka project yang baru dibuat
2. Tab **Overview**
3. Catat:

```
Access ID / Client ID         → TUYA_CLIENT_ID
Access Secret / Client Secret → TUYA_CLIENT_SECRET
Data Center URL               → TUYA_BASE_URL
```

Paste ke `.env.local`:

```env
TUYA_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
TUYA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TUYA_BASE_URL=https://openapi.tuyaeu.com
```

> Client Secret tidak akan ditampilkan ulang — kalau hilang, generate ulang via tombol "Reset". Generate ulang akan invalidate yang lama, jadi update di semua environment.

---

## Step 5 — Pasang Bardi via Smart Life App

Tuya Developer hanya bisa di-link ke **Smart Life** atau **Tuya Smart** app — bukan app Bardi langsung. Jadi kalau Bardi sudah dipair di app Bardi, perlu re-pair ke Smart Life.

1. Install **Smart Life** dari Play Store / App Store
2. Daftar akun (atau login kalau sudah punya). **Pastikan region sama dengan data center project Tuya** (Step 2)
3. Tap **+** di pojok kanan atas → **Add Device**
4. Pilih kategori: **Security & Video Surveillance** → **Smart Camera (Wi-Fi)**
5. Reset kamera Bardi (biasanya tahan tombol reset 5 detik sampai ada suara/LED indicator)
6. Ikuti wizard pairing — biasanya scan QR yang ditampilkan app pakai kamera Bardi
7. Tunggu sampai status "Online" muncul di Smart Life

✅ Kamera muncul di Smart Life app dengan status **Online**.

> Test di Smart Life dulu — kalau di app sendiri bisa lihat live view, baru lanjut. Kalau di Smart Life saja tidak bisa, masalah bukan di Tuya API tapi di pairing fisik.

---

## Step 6 — Link Smart Life ke Cloud Project

Sekarang bridging antara akun Smart Life kamu dengan Cloud Project Tuya.

1. Tuya Developer → buka project → tab **Devices**
2. Tab **Link Tuya App Account** → klik **Add App Account**
3. Muncul **QR code** di browser
4. Smart Life app → tab **Me** (kanan bawah) → **icon scan/QR** di pojok kanan atas → scan QR di browser
5. Smart Life akan tanya konfirmasi → tap **Confirm**
6. Kembali ke browser → klik **OK** / refresh

Sekarang tab **All Devices** di project menampilkan semua kamera yang ada di Smart Life kamu.

> ⚠️ Satu akun Smart Life **maksimal bisa link ke 2 Cloud Project** Tuya. Kalau sudah penuh, unlink yang lama dulu.

---

## Step 7 — Catat Device ID

1. Tab **Devices → All Devices**
2. Cari kamera Bardi
3. Catat **Device ID** — biasanya format alphanumeric panjang seperti `6cf2b6d2b09a2f8597xxxx`

Ini nilai yang nanti masuk ke kolom `cameras.device_id` di Supabase.

> ⚠️ **Format Device ID:** harus alphanumeric only. Validator di app (`src/lib/validators.ts`) reject string dengan dash, spasi, atau simbol. Ini cocok karena Device ID asli dari Tuya memang clean.

---

## Step 8 — Test Hit API (curl)

Sebelum integrate ke app, **wajib** test manual dulu untuk memastikan credentials + permissions benar.

### 8a. Generate Signature & Get Token

Tuya pakai signature **HMAC-SHA256**. Bikin file `test-tuya.js`:

```javascript
// test-tuya.js
const crypto = require('crypto');

const CLIENT_ID = 'isi_client_id_di_sini';
const CLIENT_SECRET = 'isi_client_secret_di_sini';
const BASE_URL = 'https://openapi.tuyaeu.com'; // sesuaikan
const DEVICE_ID = 'isi_device_id_bardi_di_sini';

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function hmacSha256Upper(str, secret) {
  return crypto.createHmac('sha256', secret).update(str).digest('hex').toUpperCase();
}

async function getToken() {
  const t = Date.now().toString();
  const urlPath = '/v1.0/token?grant_type=1';
  const stringToSign = `GET\n${sha256('')}\n\n${urlPath}`;
  const sign = hmacSha256Upper(CLIENT_ID + t + stringToSign, CLIENT_SECRET);

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    headers: {
      client_id: CLIENT_ID,
      sign,
      t,
      sign_method: 'HMAC-SHA256',
    },
  });
  const data = await res.json();
  console.log('TOKEN RESPONSE:', JSON.stringify(data, null, 2));
  return data.result?.access_token;
}

async function getStream(token) {
  const t = Date.now().toString();
  const body = JSON.stringify({ type: 'hls' });
  const urlPath = `/v1.0/devices/${DEVICE_ID}/stream/actions/allocate`;
  const stringToSign = `POST\n${sha256(body)}\n\n${urlPath}`;
  const sign = hmacSha256Upper(CLIENT_ID + token + t + stringToSign, CLIENT_SECRET);

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: 'POST',
    headers: {
      client_id: CLIENT_ID,
      access_token: token,
      sign,
      t,
      sign_method: 'HMAC-SHA256',
      'Content-Type': 'application/json',
    },
    body,
  });
  const data = await res.json();
  console.log('STREAM RESPONSE:', JSON.stringify(data, null, 2));
}

(async () => {
  const token = await getToken();
  if (token) await getStream(token);
})();
```

Run:

```bash
node test-tuya.js
```

### 8b. Expected Response

**Token:**

```json
{
  "result": {
    "access_token": "abcdef1234567890...",
    "expire_time": 7200,
    "uid": "ay1234567890..."
  },
  "success": true,
  "t": 1714123456789
}
```

**Stream:**

```json
{
  "result": {
    "url": "https://wework1.wgine.com:554/hls/xxxx/xxxx.m3u8?signInfo=..."
  },
  "success": true,
  "t": 1714123456999
}
```

### 8c. Verify URL di VLC

Copy URL `.m3u8` → buka VLC → **Media → Open Network Stream** → paste → Play.

✅ Kalau video Bardi muncul dan smooth: **integration siap**. Kamu bisa lanjut deploy production.
❌ Kalau error: lihat [Common Issues](#common-issues).

> URL ini expire **~10 menit**. Kalau test besok, generate ulang.

---

## Step 9 — Hubungkan ke App

Setelah credentials valid:

### 9a. Update `.env.local`

```env
TUYA_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
TUYA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TUYA_BASE_URL=https://openapi.tuyaeu.com

# AKTIFKAN MODE PRODUCTION
DEV_MOCK_STREAM=false
```

### 9b. Seed Device ID ke Supabase

Di Supabase SQL Editor:

```sql
INSERT INTO public.cameras (device_id, label) VALUES
  ('6cf2b6d2b09a2f8597xxxx', 'Ruang Bayi'),
  ('6cf2b6d2b09a2f8597yyyy', 'Toddler');
```

Atau lewat UI: login super admin → `/admin/cameras/new` → input device_id + label.

### 9c. Restart App

```bash
npm run dev
# atau di Railway: deploy ulang
```

### 9d. Test End-to-End

1. Login super admin → `/admin/access` → assign kamera ke akun ortu test
2. Logout → login akun ortu → `/watch`
3. Stream Bardi muncul ✅

---

## Common Issues

### `sign invalid` saat hit API

Penyebab paling sering:
- **Salah formula signature.** Token request: `clientId + t + stringToSign` (tanpa accessToken). Business request: `clientId + accessToken + t + stringToSign` (DENGAN accessToken). Beda urutan.
- **Body hash beda.** `stringToSign` pakai `sha256(body)`, bukan `md5(body)`. Body kosong → hash dari empty string, bukan empty string itu sendiri.
- **Timestamp `t` tidak sinkron.** `t` di header harus sama persis dengan `t` di stringToSign. Generate sekali, pakai dua kali.
- **Method case.** Pakai `GET` / `POST` uppercase, bukan `get` / `post`.

Cek implementasi yang work di `src/lib/tuya.ts` (`signTokenRequest` dan `signBusinessRequest`).

### `permission denied` / `no permission` di stream API

API **IoT Video Live Stream** belum di-authorize di project. Step 3 — buka tab **Service API** di project, pastikan ada di list "Subscribed".

### `device offline` walau Bardi nyala

- Cek WiFi kamera. Buka Smart Life app → status harus "Online" di sana dulu.
- Kalau di Smart Life "Online" tapi Tuya API bilang offline → tunggu 5 menit. Kadang sync delay.
- Restart kamera (cabut listrik 10 detik).

### Device tidak muncul di Tuya Cloud → All Devices

- **Region mismatch.** Akun Smart Life region beda dengan data center project. Solusi: bikin project baru dengan data center yang benar (gak bisa diubah setelah dibuat), atau ganti region Smart Life (akan reset semua device).
- Smart Life account belum link ke project. Step 6.
- Link sudah dilakukan tapi terlalu lama lalu — re-link.

### Stream URL valid tapi VLC tidak bisa play

- **HLS URL expire 10 menit.** Generate baru.
- Network/firewall block port 554. Test di network lain.
- Format URL aneh (bukan `.m3u8`) — pastikan body request `{"type": "hls"}`, bukan `"rtsp"`.

### Tuya error code 1010 / 1011

- 1010 = token invalid, 1011 = token expired.
- Code app sudah handle: kalau dapat error ini, auto-refresh token dan retry sekali.
- Kalau setelah retry masih gagal → credentials salah atau project unauthorized. Cek Step 3 dan Step 4.

### Tuya error code 28841105 / IPC offline / no device

Akun Smart Life yang link ke project tidak punya akses ke device tersebut. Pastikan QR scan dilakukan dari akun yang sama dengan akun yang pair Bardi.

---

## Quick Reference — URLs

| Page | URL |
|---|---|
| Tuya Developer | <https://iot.tuya.com> |
| Cloud Project list | <https://iot.tuya.com/cloud/> |
| API Explorer | <https://iot.tuya.com/cloud/explorer> |
| Postman collection (Tuya) | <https://github.com/tuya/tuya-restful-api> |
| OpenAPI docs | <https://developer.tuya.com/en/docs/cloud/> |

---

## Switch Mode Recap

Setelah Tuya setup selesai, switch dev ↔ prod cukup ganti satu env:

```env
# Saat dev tanpa kamera fisik (atau kamera offline)
DEV_MOCK_STREAM=true

# Saat production / test dengan Bardi beneran
DEV_MOCK_STREAM=false
```

Tidak ada perubahan kode. Logic ada di `src/lib/tuya.ts`:

```ts
const IS_MOCK = process.env.DEV_MOCK_STREAM === "true";

export async function getStreamUrl(deviceId: string): Promise<string> {
  if (IS_MOCK) {
    // return URL HLS publik
  }
  // hit Tuya API
}
```

---

## Checklist Sebelum Go-Live

- [ ] Tuya Cloud project dibuat dengan data center yang benar
- [ ] API services authorized (terutama IoT Video Live Stream)
- [ ] `TUYA_CLIENT_ID` & `TUYA_CLIENT_SECRET` dicatat
- [ ] Bardi pair ke Smart Life dan online
- [ ] Smart Life account link ke project via QR
- [ ] Device ID semua kamera dicatat
- [ ] Test API token + stream → URL `.m3u8` valid di VLC
- [ ] Device ID di-seed ke tabel `cameras` di Supabase production
- [ ] Env Railway: `DEV_MOCK_STREAM=false`
- [ ] Smoke test login parent → stream Bardi muncul di mobile browser
- [ ] **Test on-site di lokasi daycare dengan WiFi production**

---

**Lihat juga:**
- [README.md](./README.md) — overview project
- [.env.example](./.env.example) — template environment variables
- `src/lib/tuya.ts` — implementation reference
---
title: CCTV Sekolah — Master Implementation Guide
description: Platform monitoring CCTV sekolah untuk wali murid. Stack Next.js + Supabase + Tuya API, deploy Railway, hardware Bardi CCTV.
---

# CCTV Sekolah — Master Implementation Guide

> Dokumentasi lengkap end-to-end: dari setup Tuya Developer, dev tanpa kamera fisik, sampai deploy ke production.

**Stack:** Next.js (App Router) · Supabase (Auth + DB + RLS) · Tuya OpenAPI · HLS.js
**Hardware:** Bardi CCTV (Tuya ecosystem)
**Deploy:** Railway

---

## Daftar Isi

1. [Overview & Konsep](#1-overview--konsep)
2. [Architecture](#2-architecture)
3. [Roles & Business Logic](#3-roles--business-logic)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Folder Structure](#5-folder-structure)
6. [Tuya Developer Setup — From Zero](#6-tuya-developer-setup--from-zero)
7. [Sandbox / Dev Setup (Tanpa Kamera Fisik)](#7-sandbox--dev-setup-tanpa-kamera-fisik)
8. [Core Implementation](#8-core-implementation)
9. [Route Map](#9-route-map)
10. [Production Switch & Deployment](#10-production-switch--deployment)
11. [Testing & Verification](#11-testing--verification)
12. [Gotchas & Troubleshooting](#12-gotchas--troubleshooting)
13. [Master Checklist](#13-master-checklist)

---

## 1. Overview & Konsep

Platform untuk wali murid memantau kelas anaknya via CCTV sekolah secara live.

**Konsep singkat:**

- Wali murid login → langsung lihat stream kamera kelas anaknya. Titik.
- Bardi CCTV jalan di atas Tuya Cloud → kita ambil stream URL via Tuya OpenAPI.
- Akses ditentukan per user via tabel mapping di Supabase (RLS aktif).
- Semua API call ke Tuya **server-side only** — secret tidak bocor ke browser.
- Switch dev ↔ prod cukup ganti environment variable, **tidak ada perubahan kode**.

### Golden Rules

| # | Rule |
|---|---|
| 1 | Tuya API dipanggil **server-side only** — jangan expose client secret ke browser |
| 2 | RLS Supabase **wajib** aktif — yang jaga user A tidak bisa lihat kamera user B |
| 3 | Stream URL Tuya **expire ~10 menit** — jangan di-cache, fetch fresh tiap load |
| 4 | Token Tuya expire **2 jam** — cache di memory dengan TTL 110 menit |
| 5 | `deviceId` selalu dari Supabase, **jangan hardcode** di frontend |
| 6 | Admin pakai **service role key**, user pakai **anon key** + RLS |
| 7 | Wali murid onboard via **email invite** — Admin input email, Supabase kirim magic link |

---

## 2. Architecture

```
┌──────────────┐      ┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Bardi CCTV  │ ───▶ │ Tuya Cloud  │ ◀──▶ │ Next.js API      │ ───▶ │  Frontend    │
│  (fisik)     │      │ (OpenAPI)   │      │ Route /api/stream│      │  HLS Player  │
└──────────────┘      └─────────────┘      └────────┬─────────┘      └──────────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │   Supabase       │
                                           │  Auth + DB + RLS │
                                           └──────────────────┘
```

### Flow Saat Wali Murid Buka `/watch`

```
User buka /watch
      ↓
Next.js fetch /api/stream?deviceId=xxx
      ↓
API Route:
  1. Cek Supabase auth → user valid?
  2. Cek camera_access → user punya akses ke device ini?
  3. IS_MOCK = false → hit Tuya API beneran
      ↓
getTuyaToken()   (cache 110 menit)
  → kalau expired → fetch token baru
      ↓
POST /v1.0/devices/{deviceId}/stream/actions/allocate
      ↓
Return URL .m3u8 → stream Bardi fisik
      ↓
Frontend HLS.js render video
```

---

## 3. Roles & Business Logic

### 3.1 Roles

| Role | Siapa | Akses |
|---|---|---|
| **Super Admin** | Operator platform | Semua sekolah, semua data |
| **Admin** | Pihak sekolah (operator/TU) | Sekolah sendiri saja |
| **User** | Wali murid | Kamera kelas anaknya saja |

### 3.2 Entity Map

```
Super Admin
    └── School (banyak)
            ├── Camera (banyak) ← device_id dari Tuya
            ├── Admin (banyak)
            └── User (banyak)
                    └── camera_access → Camera (many-to-many)
```

### 3.3 Flow per Role

#### Super Admin

```
Login → Dashboard semua sekolah
      → Tambah sekolah baru (nama, kota, kontak)
      → Generate akun Admin untuk sekolah tersebut
      → (opsional) Lihat semua kamera & user per sekolah
```

**Aksi:** CRUD sekolah · Buat akun Admin per sekolah · Lihat semua kamera terdaftar · Lihat semua user terdaftar.

#### Admin (Sekolah)

```
Login → Dashboard sekolahnya sendiri
      ├── Manage Kamera   (input device_id Tuya + label "Kelas 3A")
      ├── Manage User     (invite wali murid via email)
      └── Assign Kamera   (pilih user → pilih kamera → simpan)
```

**Manage Kamera:**

```
Input device_id Tuya + label  →  Simpan ke tabel cameras  →  Siap di-assign
```

**Manage User:**

```
Input nama + email  →  Supabase kirim magic link  →  Wali set password  →  Aktif
```

**Assign Kamera:**

```
Pilih user → Pilih kamera (list kamera sekolah) → Simpan ke camera_access
                                                  → User langsung bisa lihat
```

#### User (Wali Murid)

```
Login → Langsung ke /watch → List kamera yang punya akses → Klik → Stream muncul
```

> **Sesimpel itu.** No settings. No profile. No dashboard tambahan.

### 3.4 Golden Rules Bisnis

- 1 sekolah = 1 atau lebih Admin — Super Admin yang buat
- Admin **tidak bisa** lihat sekolah lain — RLS yang jaga
- User hanya bisa lihat kamera **yang di-assign**, bukan semua kamera sekolah
- Stream URL di-fetch **server-side** — Tuya secret tidak bocor
- Device ID Tuya disimpan di DB — Admin input sekali, sistem yang urus sisanya

---

## 4. Database Schema (Supabase)

File: `supabase/migrations/001_init.sql`

```sql
-- ============================================
-- Schema: CCTV Sekolah
-- ============================================

-- Sekolah
create table schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  created_at  timestamptz default now()
);

-- Profil user (extend auth.users)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  school_id   uuid references schools(id),
  role        text check (role in ('super_admin', 'admin', 'user')),
  name        text,
  created_at  timestamptz default now()
);

-- Kamera per sekolah
create table cameras (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references schools(id) on delete cascade,
  device_id   text not null unique,    -- Tuya device ID
  label       text not null,           -- "Kelas 3A", "Koridor Lt 2"
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Mapping wali murid ↔ kamera
create table camera_access (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  camera_id   uuid references cameras(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(user_id, camera_id)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles      enable row level security;
alter table schools       enable row level security;
alter table cameras       enable row level security;
alter table camera_access enable row level security;

-- Profiles: user lihat diri sendiri
create policy "user see own profile"
  on profiles for select
  using (auth.uid() = id);

-- Cameras: admin lihat kamera sekolahnya
create policy "admin see school cameras"
  on cameras for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and school_id = cameras.school_id
        and role in ('admin', 'super_admin')
    )
  );

-- Camera access: user lihat haknya sendiri
create policy "user see own access"
  on camera_access for select
  using (auth.uid() = user_id);
```

> **Catatan:** Admin yang melakukan write (insert kamera, assign user) pakai **service role key** dari server-side route handler — bukan anon key.

---

## 5. Folder Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx              # Login semua role
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── watch/page.tsx              # Halaman utama wali murid
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── dashboard/page.tsx
│   │   ├── cameras/
│   │   │   ├── page.tsx                # List kamera
│   │   │   └── new/page.tsx            # Tambah kamera
│   │   ├── users/
│   │   │   ├── page.tsx                # List wali murid
│   │   │   ├── new/page.tsx            # Invite
│   │   │   └── [id]/assign/page.tsx    # Assign kamera ke user
│   │   └── layout.tsx
│   ├── super/
│   │   ├── dashboard/page.tsx
│   │   └── schools/
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   ├── api/
│   │   ├── stream/route.ts             # Auth guard + Tuya hit
│   │   └── auth/callback/route.ts      # Supabase auth callback
│   ├── layout.tsx
│   └── page.tsx                        # Redirect by role
├── lib/
│   ├── tuya.ts                         # Tuya API client (token + stream)
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   └── server.ts                   # Server client
│   └── constants.ts
├── components/
│   ├── stream-player.tsx               # HLS.js player
│   └── camera-card.tsx
├── middleware.ts                        # Auth + role-based redirect
├── supabase/
│   ├── migrations/001_init.sql
│   └── seed.sql
├── .env.local
└── package.json
```

### Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr hls.js
```

---

## 6. Tuya Developer Setup — From Zero

Bardi CCTV jalan di atas ekosistem Tuya. Untuk ambil stream URL via API:

### Step 1 — Daftar Akun Tuya Developer

URL: <https://iot.tuya.com>

1. Klik **Sign Up**, isi email + password, verifikasi email
2. Pilih country **sesuai region akun Bardi/Smart Life app**

> ⚠️ Akun Tuya Developer **berbeda** dari akun Bardi/Smart Life. Jangan login pakai kredensial Bardi.

### Step 2 — Buat Cloud Project

1. Login → sidebar **Cloud > Development**
2. Klik **Create Cloud Project**, isi:

| Field | Value |
|---|---|
| Project Name | bebas, contoh: `cctv-sekolah` |
| Industry | **Smart Home** |
| Development Method | **Smart Home** |
| Data Center | sesuai region — Indonesia umumnya **Central Europe** atau **India** |

3. Klik **Create**

#### Mapping Data Center (Indonesia)

Buka Smart Life app → **Me → Setting → Account and Security → Region**.
Sesuaikan data center project Tuya dengan region yang muncul. Kalau salah, device tidak akan muncul.

| Data Center | Base URL |
|---|---|
| Central Europe | `https://openapi.tuyaeu.com` |
| India | `https://openapi.tuyain.com` |
| US | `https://openapi.tuyaus.com` |
| China | `https://openapi.tuyacn.com` |

### Step 3 — Authorize API Services

Setelah project dibuat, muncul dialog **Authorize API Services**. Wajib centang minimal:

- ✅ **Industry Basic Service**
- ✅ **Smart Home Basic Service**
- ✅ **Device Status Notification**
- ✅ **IoT Video Live Stream** ← paling penting untuk stream kamera

Klik **Authorize**.

### Step 4 — Ambil API Credentials

Project → tab **Overview**. Catat:

```env
TUYA_CLIENT_ID=xxxxxxxxxxxxxxxx          # Access ID / Client ID
TUYA_CLIENT_SECRET=xxxxxxxxxxxxxxxx      # Access Secret / Client Secret
TUYA_BASE_URL=https://openapi.tuyaeu.com
```

### Step 5 — Pasang Bardi via Smart Life App

Tuya Developer hanya bisa di-link ke **Smart Life** atau **Tuya Smart** app — bukan app Bardi langsung.

1. Install **Smart Life** (Android/iOS)
2. Daftar akun / login
3. **Add Device → Security & Video Surveillance → Smart Camera**
4. Ikuti instruksi pairing (reset kamera dulu kalau perlu)
5. Kamera muncul di Smart Life app ✅

> Kalau Bardi sudah terpasang di app Bardi → perlu re-pair ke Smart Life.

### Step 6 — Link Smart Life App ke Cloud Project

1. Tuya Developer → project → tab **Devices**
2. **Link Tuya App Account → Add App Account** → muncul QR code
3. Smart Life app → **Me** → pojok kanan atas → **Scan QR**
4. Tap **Confirm** → kembali ke browser → **OK**

Tab **All Devices** di project sekarang menampilkan semua device dari Smart Life app.

### Step 7 — Catat Device ID

Tab **Devices → All Devices** → cari kamera Bardi → catat **Device ID**.
Format umumnya: `6cf2b6d2b09a2f8597xxxx`.

Device ID ini disimpan di tabel `cameras.device_id` di Supabase.

### Step 8 — Test Hit API (curl / Postman)

**8a. Ambil Token**

```http
GET https://openapi.tuyaeu.com/v1.0/token?grant_type=1

Headers:
  client_id:    {TUYA_CLIENT_ID}
  sign:         {HMAC-SHA256 signature}
  t:            {timestamp ms}
  sign_method:  HMAC-SHA256
```

Response:

```json
{
  "result": {
    "access_token": "xxxxxxxx",
    "expire_time": 7200,
    "uid": "ay1234567890"
  },
  "success": true
}
```

**8b. Ambil Stream URL (HLS)**

```http
POST https://openapi.tuyaeu.com/v1.0/devices/{device_id}/stream/actions/allocate

Headers:
  client_id:     {TUYA_CLIENT_ID}
  access_token:  {token dari 8a}
  sign:          {signature}
  t:             {timestamp}

Body:
{ "type": "hls" }
```

Response:

```json
{
  "result": {
    "url": "https://wework1.wgine.com:554/hls/xxxx/xxxx.m3u8?signInfo=..."
  },
  "success": true
}
```

URL `.m3u8` ini langsung bisa diplay dengan **HLS.js** di browser.

### Step 9 — Signature Formula (HMAC-SHA256)

```
stringToSign = clientId + accessToken + t + HTTPMethod + "\n" + MD5(body) + "\n" + headers + "\n" + url
sign         = HMAC-SHA256(stringToSign, clientSecret).toUpperCase()
```

> Untuk request token (belum punya access_token), gunakan `clientId + t + ...` tanpa accessToken.

Implementasi lengkap ada di [Section 8](#8-core-implementation).

---

## 7. Sandbox / Dev Setup (Tanpa Kamera Fisik)

### 7.1 Limitasi Virtual Device Tuya — Jujur Dulu

Virtual device Tuya bisa dipakai untuk simulasi cloud development, **tapi:**

> ⚠️ **Virtual IPC tidak bisa return stream URL yang valid.**
> Stream URL butuh kamera fisik yang nyala dan konek ke Tuya Cloud.
> Virtual device hanya bisa simulasi **kontrol device** (on/off, settings) — bukan stream video.

Maka strategi dev dibagi dua layer:

| Layer | Strategy |
|---|---|
| **API integration** (token, device list, metadata) | ✅ Virtual device — bisa |
| **Stream URL** | ❌ Virtual device tidak bisa. Pakai mock HLS publik / ffmpeg lokal |

```
[Tuya API sandbox]          [Stream sandbox]
Virtual device          +   Public HLS stream / ffmpeg lokal
  ↓                           ↓
Test auth, device ID,       Test player, UI, error handling
metadata flow               tanpa kamera beneran
```

### 7.2 Bikin Virtual Device

1. Login <https://iot.tuya.com> → project → tab **Devices**
2. **Add Device → Add Virtual Device**
3. Panel kanan → **Products on TuyaGo**
4. Cari: **Security & Video Surveillance → Smart Camera**
5. Klik **Add Virtual Device**

> Kalau virtual IPC tidak tersedia di TuyaGo, pilih device apapun dulu — tujuannya cuma dapetin Device ID format valid untuk test auth flow.

**Yang bisa ditest pakai virtual device:**

- ✅ Hit API token → dapat `access_token`
- ✅ Hit API device list → dapat Device ID
- ✅ Hit API device info → dapat metadata
- ❌ Hit API stream → error / URL tidak valid (device offline)

### 7.3 Mock Stream URL — Dua Opsi

#### Opsi A — Public HLS Stream (paling simpel)

Pakai stream publik yang gratis untuk testing:

```typescript
const mockStreams: Record<string, string> = {
  'mock-device-001': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'mock-device-002': 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
}
```

#### Opsi B — ffmpeg Lokal (lebih realistis)

Stream file video lokal sebagai HLS via ffmpeg:

```bash
# Install ffmpeg
brew install ffmpeg          # macOS
sudo apt install ffmpeg      # Ubuntu

# Stream sample.mp4 sebagai HLS
ffmpeg -re -i sample.mp4 \
  -c:v libx264 -c:a aac \
  -f hls \
  -hls_time 2 \
  -hls_list_size 3 \
  -hls_flags delete_segments \
  /tmp/stream/index.m3u8

# Serve folder HLS
npx serve /tmp/stream -p 8080
# → stream URL: http://localhost:8080/index.m3u8
```

```env
MOCK_STREAM_URL=http://localhost:8080/index.m3u8
```

### 7.4 Supabase Local Dev

```bash
# Install Supabase CLI
npm install -g supabase

# Init & start (Docker harus jalan)
supabase init
supabase start

# Apply migration
supabase db push
```

Studio lokal: <http://localhost:54323>

### 7.5 Seed Data Dev

File: `supabase/seed.sql`

```sql
-- Sekolah dummy
insert into schools (id, name, city) values
  ('11111111-1111-1111-1111-111111111111', 'SDN Madiun 01', 'Madiun'),
  ('22222222-2222-2222-2222-222222222222', 'SDN Madiun 02', 'Madiun');

-- Kamera dummy (device_id = mock atau virtual Tuya)
insert into cameras (school_id, device_id, label) values
  ('11111111-1111-1111-1111-111111111111', 'mock-device-001', 'Kelas 3A'),
  ('11111111-1111-1111-1111-111111111111', 'mock-device-002', 'Kelas 3B'),
  ('22222222-2222-2222-2222-222222222222', 'mock-device-001', 'Kelas 4A');
```

### 7.6 Environment — `.env.local` (Development)

```env
# Supabase Local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# Tuya
TUYA_CLIENT_ID=your-client-id
TUYA_CLIENT_SECRET=your-client-secret
TUYA_BASE_URL=https://openapi.tuyaeu.com

# Dev mode flag — aktifkan mock stream
DEV_MOCK_STREAM=true
MOCK_STREAM_URL=https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 8. Core Implementation

### 8.1 `lib/tuya.ts` — Final dengan Dev/Prod Switch

```typescript
import crypto from 'crypto'

const BASE_URL      = process.env.TUYA_BASE_URL!
const CLIENT_ID     = process.env.TUYA_CLIENT_ID!
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET!
const IS_MOCK       = process.env.DEV_MOCK_STREAM === 'true'

// Cache token di memory — Tuya token expire 2 jam, kita cache 110 menit
let cachedToken: { value: string; expiresAt: number } | null = null

function sign(str: string): string {
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(str)
    .digest('hex')
    .toUpperCase()
}

async function getTuyaToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  const t = Date.now().toString()
  const stringToSign = `${CLIENT_ID}${t}GET\n\n\n/v1.0/token?grant_type=1`
  const signature = sign(stringToSign)

  const res = await fetch(`${BASE_URL}/v1.0/token?grant_type=1`, {
    headers: {
      client_id:   CLIENT_ID,
      sign:        signature,
      t,
      sign_method: 'HMAC-SHA256',
    },
  })

  const data = await res.json()
  if (!data.success) throw new Error(`Tuya token error: ${data.msg}`)

  cachedToken = {
    value:     data.result.access_token,
    expiresAt: Date.now() + 110 * 60 * 1000,   // 110 menit
  }

  return cachedToken.value
}

export async function getStreamUrl(deviceId: string): Promise<string> {
  // ===== DEV MODE — return mock stream =====
  if (IS_MOCK) {
    const mocks: Record<string, string> = {
      'mock-device-001': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      'mock-device-002': 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    }
    return mocks[deviceId] ?? mocks['mock-device-001']
  }

  // ===== PRODUCTION — hit Tuya API =====
  const token       = await getTuyaToken()
  const t           = Date.now().toString()
  const body        = JSON.stringify({ type: 'hls' })
  const bodyHash    = crypto.createHash('md5').update(body).digest('hex')
  const path        = `/v1.0/devices/${deviceId}/stream/actions/allocate`
  const stringToSign = `${CLIENT_ID}${token}${t}POST\n${bodyHash}\n\n${path}`
  const signature   = sign(stringToSign)

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      client_id:      CLIENT_ID,
      access_token:   token,
      sign:           signature,
      t,
      sign_method:    'HMAC-SHA256',
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',   // URL expire ~10 menit, jangan cache
  })

  const data = await res.json()
  if (!data.success) throw new Error(`Tuya stream error: ${data.msg}`)

  return data.result.url
}
```

### 8.2 `app/api/stream/route.ts` — Auth Guard + Tuya Hit

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { getStreamUrl } from '@/lib/tuya'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('deviceId')

  if (!deviceId) {
    return Response.json({ error: 'deviceId required' }, { status: 400 })
  }

  // 1. Auth check
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Access check — user punya akses ke device ini?
  const { data: access } = await supabase
    .from('camera_access')
    .select('camera_id, cameras!inner(device_id)')
    .eq('user_id', user.id)
    .eq('cameras.device_id', deviceId)
    .single()

  if (!access) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // 3. Ambil stream URL — auto switch dev/prod via env flag
  try {
    const url = await getStreamUrl(deviceId)
    return Response.json({ url })
  } catch (err) {
    return Response.json(
      { error: 'Kamera offline atau tidak tersedia' },
      { status: 503 },
    )
  }
}
```

### 8.3 `components/stream-player.tsx` — HLS Player

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface StreamPlayerProps {
  deviceId: string
  label:    string
}

export function StreamPlayer({ deviceId, label }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let hls: Hls

    async function initStream() {
      try {
        const res = await fetch(`/api/stream?deviceId=${deviceId}`)
        const { url, error } = await res.json()

        if (error || !url) {
          setError('Stream tidak tersedia')
          return
        }

        const video = videoRef.current!

        if (Hls.isSupported()) {
          hls = new Hls()
          hls.loadSource(url)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false)
            video.play()
          })
          hls.on(Hls.Events.ERROR, () => setError('Stream error'))
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = url
          video.addEventListener('loadedmetadata', () => {
            setLoading(false)
            video.play()
          })
        }
      } catch {
        setError('Gagal load stream')
      }
    }

    initStream()
    return () => hls?.destroy()
  }, [deviceId])

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <p className="absolute top-2 left-2 text-white text-sm z-10">{label}</p>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          Loading...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      />
    </div>
  )
}
```

### 8.4 `middleware.ts` — Role-Based Redirect

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function middleware(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Belum login → ke /login
  if (!user) {
    if (!req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // Sudah login → cek role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const path = req.nextUrl.pathname

  if (path === '/' || path === '/login') {
    if (role === 'super_admin') return NextResponse.redirect(new URL('/super/dashboard', req.url))
    if (role === 'admin')       return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    if (role === 'user')        return NextResponse.redirect(new URL('/watch', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
```

---

## 9. Route Map

### Super Admin

| Route | Tujuan |
|---|---|
| `/super/dashboard` | List semua sekolah |
| `/super/schools/new` | Tambah sekolah |
| `/super/schools/[id]` | Detail sekolah + admin + kamera |

### Admin

| Route | Tujuan |
|---|---|
| `/admin/dashboard` | Overview sekolah |
| `/admin/cameras` | List kamera |
| `/admin/cameras/new` | Tambah kamera (input device_id + label) |
| `/admin/users` | List wali murid |
| `/admin/users/new` | Invite wali murid |
| `/admin/users/[id]/assign` | Assign kamera ke user |

### User (Wali Murid)

| Route | Tujuan |
|---|---|
| `/watch` | List kamera yang punya akses + stream langsung |

### Auth

| Route | Tujuan |
|---|---|
| `/login` | Semua role masuk sini |
| `/auth/callback` | Supabase auth callback |

---

## 10. Production Switch & Deployment

### 10.1 Konsep Inti

> **Tidak ada perubahan kode** saat switch ke production. Semua dikontrol via environment variables.

```
DEV_MOCK_STREAM=false  →  otomatis hit Tuya API beneran
```

| | Development | Production |
|---|---|---|
| Stream source | Public HLS mock | Tuya API → Bardi fisik |
| Supabase | Local (port 54321) | Supabase Cloud |
| `DEV_MOCK_STREAM` | `true` | `false` |
| Deploy | `localhost:3000` | Railway |

### 10.2 Pre-Switch Checklist

#### Tuya Developer

- [ ] Cloud project sudah dibuat
- [ ] API services di-authorize (Smart Home Basic + IoT Video Live Stream)
- [ ] Smart Life app sudah di-link via QR code
- [ ] Bardi CCTV sudah dipair ke Smart Life
- [ ] Device ID kamera sudah dicatat
- [ ] Test hit API token → berhasil
- [ ] Test hit API stream → dapat URL `.m3u8` valid

#### Supabase Cloud

- [ ] Project dibuat di <https://supabase.com>
- [ ] Migration sudah dijalankan
- [ ] Data sekolah, kamera (device_id Tuya), user sudah diisi
- [ ] RLS aktif dan sudah ditest

#### Railway

- [ ] Project Next.js sudah terdeploy
- [ ] Semua env vars sudah diset

### 10.3 Environment — Railway Production

Set di Railway dashboard → Project → Variables:

```env
# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Tuya Production
TUYA_CLIENT_ID=xxxxxxxxxxxxxxxx
TUYA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TUYA_BASE_URL=https://openapi.tuyaeu.com

# KUNCI UTAMA — matikan mock, aktifkan real stream
DEV_MOCK_STREAM=false

# App
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NODE_ENV=production
```

> `MOCK_STREAM_URL` tidak perlu diset di production — otomatis tidak dipakai saat `DEV_MOCK_STREAM=false`.

### 10.4 Seeding Data Production

Setelah dapat Device ID dari Tuya Developer, insert ke Supabase Cloud via SQL Editor:

```sql
-- Tambah sekolah
insert into schools (id, name, city)
values (gen_random_uuid(), 'SDN Madiun 01', 'Madiun');

-- Tambah kamera (device_id = Device ID dari Tuya)
insert into cameras (school_id, device_id, label)
values (
  (select id from schools where name = 'SDN Madiun 01'),
  '6cf2b6d2b09a2f8597xxxx',           -- Device ID Bardi dari Tuya
  'Kelas 3A'
);

-- Assign kamera ke wali murid
insert into camera_access (user_id, camera_id)
values (
  (select id from auth.users where email = 'ortu@email.com'),
  (select id from cameras where label = 'Kelas 3A')
);
```

---

## 11. Testing & Verification

### 11.1 Test Setelah Deploy ke Railway

```bash
# Cek env vars sudah masuk
railway variables

# Hit endpoint stream langsung via curl
curl -X GET "https://your-app.railway.app/api/stream?deviceId=6cf2b6xxxx" \
  -H "Cookie: your-session-cookie"

# Response yang diharapkan:
# { "url": "https://wework1.wgine.com:554/hls/xxxx/xxxx.m3u8?signInfo=..." }
```

### 11.2 Verify Stream Nyala via VLC

```
VLC → Media → Open Network Stream → paste URL .m3u8
```

Kalau video muncul dan smooth, berarti:

- ✅ Tuya API integration jalan
- ✅ Kamera Bardi online
- ✅ Stream URL valid

### 11.3 Skenario Test End-to-End

| # | Skenario | Expected |
|---|---|---|
| 1 | Login wali murid → buka `/watch` | List kamera yang di-assign muncul |
| 2 | Klik kamera → tunggu 2-3 detik | Video stream play otomatis |
| 3 | Login wali murid lain → coba akses deviceId orang lain | Forbidden 403 |
| 4 | Stream URL dibiarkan idle 15 menit | Re-fetch tetap dapat URL fresh |
| 5 | Cabut listrik kamera Bardi → reload | Error "Kamera offline" tampil |
| 6 | Admin tambah kamera baru di `/admin/cameras/new` | Muncul di list, bisa di-assign |
| 7 | Admin invite user baru via email | Magic link masuk ke email |

---

## 12. Gotchas & Troubleshooting

### 12.1 Production Gotchas

| # | Masalah | Solusi |
|---|---|---|
| 1 | Stream URL expire ~10 menit | Jangan cache URL — fetch fresh tiap user load halaman |
| 2 | Token Tuya expire 2 jam | Cache token di memory dengan TTL 110 menit |
| 3 | Kamera offline → API error | Handle di API route, return `{ error: 'Kamera offline' }` 503 |
| 4 | Data center salah | Pastikan `TUYA_BASE_URL` sesuai region Smart Life account |
| 5 | Device ID salah di DB | Double check di Tuya Developer → tab All Devices |
| 6 | Railway restart → token cache hilang | Aman — `getTuyaToken()` fetch ulang otomatis |
| 7 | Smart Life account hanya bisa link max 2 project Tuya | Unlink project lama dulu kalau perlu |

### 12.2 Sandbox Catatan

| # | Catatan |
|---|---|
| 1 | Virtual IPC Tuya **tidak bisa produce stream URL** — by design, bukan bug |
| 2 | Mock HLS stream publik di atas valid dan gratis untuk testing |
| 3 | Stream URL Tuya expire ~10 menit — jangan cache, fetch ulang |
| 4 | Switch ke production cukup set `DEV_MOCK_STREAM=false` di Railway |
| 5 | **Test dengan Bardi fisik wajib** sebelum demo ke sekolah |
| 6 | Kalau device tidak muncul di All Devices → unlink → relink Smart Life account |

### 12.3 Common Errors

**`sign invalid` saat hit Tuya API**
→ Cek urutan `stringToSign`: untuk request ber-token, urutan adalah `clientId + accessToken + t + method + ...`. Untuk request token (belum punya access token), urutan: `clientId + t + method + ...`.

**`device offline` walau kamera nyala**
→ Cek koneksi WiFi kamera. Buka Smart Life app, pastikan kamera muncul "Online" di sana dulu.

**`Forbidden 403` di `/api/stream`**
→ Cek tabel `camera_access` — pastikan ada row yang link `user_id` ke `camera_id` yang benar.

**Stream load tapi video hitam**
→ Kamera mungkin baru on, butuh 5-10 detik warm-up. Atau cek HLS.js error di console browser.

---

## 13. Master Checklist

### Setup Awal

- [ ] Daftar Tuya Developer di <https://iot.tuya.com>
- [ ] Buat Cloud Project (Smart Home, data center sesuai region)
- [ ] Authorize API Services (Smart Home Basic + **IoT Video Live Stream**)
- [ ] Catat `TUYA_CLIENT_ID` & `TUYA_CLIENT_SECRET`
- [ ] Install Smart Life app, pair Bardi CCTV
- [ ] Link Smart Life ke Cloud Project via QR
- [ ] Catat Device ID kamera

### Development

- [ ] Setup Next.js project + dependencies
- [ ] Supabase CLI installed, `supabase start` jalan
- [ ] Migration `001_init.sql` + `seed.sql` sudah apply
- [ ] Buat virtual device di Tuya Developer (untuk test API)
- [ ] `.env.local` lengkap dengan `DEV_MOCK_STREAM=true`
- [ ] `lib/tuya.ts` dengan dev/prod switch
- [ ] `app/api/stream/route.ts` dengan auth guard
- [ ] `components/stream-player.tsx` render mock HLS
- [ ] `middleware.ts` role-based redirect
- [ ] Auth flow (login → redirect by role) jalan
- [ ] Access control test (user A ≠ kamera user B) lulus

### Production

- [ ] Test hit API token Tuya → berhasil
- [ ] Test hit API stream → dapat URL `.m3u8` valid (verify via VLC)
- [ ] Supabase Cloud project dibuat & migration di-apply
- [ ] Data sekolah/kamera/user sudah di-seed di Supabase Cloud
- [ ] Railway project terdeploy
- [ ] Semua env vars di Railway sudah diset (terutama `DEV_MOCK_STREAM=false`)
- [ ] curl test ke `/api/stream` di Railway → return URL valid
- [ ] Test login wali murid di production → stream nyala
- [ ] **Test dengan Bardi fisik di lokasi sekolah** sebelum go-live

---

## Summary

```
DEV  →  DEV_MOCK_STREAM=true   + Supabase local + mock HLS
PROD →  DEV_MOCK_STREAM=false  + Supabase cloud + Tuya real + Bardi fisik
```

**Tidak ada perubahan kode. Ganti env. Deploy. Done.**

---

> **Maintainer note:** Update dokumen ini kalau ada perubahan signifikan di Tuya OpenAPI spec, struktur DB, atau flow auth. Section 12 (Gotchas) adalah hidup — tambahkan setiap kasus baru yang ditemukan di lapangan.

# Daycare CCTV

> Platform monitoring CCTV daycare untuk wali murid. Login → langsung lihat stream kamera kelas anaknya. Sesimpel itu.

**Stack:** Next.js 15 (App Router) · Supabase (Auth + DB + RLS) · Tuya OpenAPI · HLS.js · Tailwind v4
**Hardware:** Bardi CCTV (Tuya ecosystem)
**Deploy:** Railway

---

## Daftar Isi

1. [Konsep Singkat](#konsep-singkat)
2. [Quick Start (Development)](#quick-start-development)
3. [Switch Mode: Dev ↔ Production](#switch-mode-dev--production)
4. [Database Setup](#database-setup)
5. [Seed Super Admin Pertama](#seed-super-admin-pertama)
6. [Project Structure](#project-structure)
7. [Roles & Akses](#roles--akses)
8. [Deploy ke Production](#deploy-ke-production)
9. [Troubleshooting](#troubleshooting)
10. [Scope V1 / MVP](#scope-v1--mvp)

---

## Konsep Singkat

Daycare punya beberapa kamera Bardi (ruang bayi, toddler, playroom, dst). Wali murid login → cuma lihat kamera yang di-assign admin ke akunnya. Streaming live, tidak ada recording playback (V1).

**Roles** ada dua:
- **Super Admin** — kelola kamera, kelola akun wali murid, atur akses
- **Wali Murid (Parent)** — hanya bisa lihat kamera yang diberikan akses

**Jam operasional** dibatasi 07:00–17:00 WIB. Di luar jam itu, endpoint `/api/stream` return 423 Locked dan UI tampilkan notice "Daycare sedang tutup".

**Golden rules:**
- Tuya API dipanggil server-side only — secret tidak bocor ke browser
- RLS Supabase aktif untuk semua tabel — parent gak bisa intip kamera orang lain
- Stream URL Tuya expire ~10 menit → no-cache, fetch fresh tiap user load
- Token Tuya expire 2 jam → cache di memory dengan TTL 110 menit
- Switch dev ↔ prod cukup ganti env, tidak ada perubahan kode

---

## Quick Start (Development)

### Prasyarat

- Node.js 20+
- npm / pnpm / yarn
- Akun Supabase ([gratis](https://supabase.com))
- (Opsional untuk dev) akun Tuya Developer — lihat [TUYA_SETUP.md](./TUYA_SETUP.md)

### Langkah-langkah

```bash
# 1. Clone & install
git clone <repo-url>
cd daycare-cctv
npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Buat project Supabase di https://supabase.com/dashboard
#    → Settings → API → copy URL + anon key + service_role key
#    → Paste ke .env.local

# 4. Pastikan DEV_MOCK_STREAM=true di .env.local
#    (mode mock, gak butuh kamera fisik)

# 5. Run database setup di Supabase SQL Editor
#    Copy-paste isi `daycare-cctv-nuclear-setup.sql` → Run

# 6. Seed super admin pertama (lihat section di bawah)

# 7. Jalankan
npm run dev
```

App jalan di `http://localhost:3000`.

Login pakai akun super admin yang baru di-seed → tambah kamera dengan `device_id` = `mockdevice001` atau `mockdevice002` → tambah wali murid → assign kamera → login pakai akun parent → stream mock akan main.

---

## Switch Mode: Dev ↔ Production

Ini **fitur paling penting** dari arsitektur. Aplikasi punya satu env flag yang menentukan apakah hit Tuya beneran atau pakai mock HLS publik.

### Mode Mock (Development)

```env
DEV_MOCK_STREAM=true
```

**Behavior:**
- `lib/tuya.ts` skip semua API call ke Tuya
- Stream URL di-return dari mapping hardcoded ke HLS publik test
- Device ID yang dikenali: `mockdevice001`, `mockdevice002` (fallback ke 001)
- Tuya credentials boleh kosong/dummy — tidak dipakai

**Kapan dipakai:**
- Dev lokal tanpa kamera fisik
- Demo UI ke stakeholder
- Testing access control, RLS, role flow
- CI/CD smoke test

### Mode Production

```env
DEV_MOCK_STREAM=false
```

**Behavior:**
- `lib/tuya.ts` hit Tuya OpenAPI dengan signature HMAC-SHA256
- Token di-cache 110 menit (Tuya expire 2 jam)
- Auto-refresh token jika dapat error code 1010/1011 (token invalid/expired)
- Stream URL fresh tiap request (`cache: 'no-store'`)

**Syarat wajib:**
- Semua `TUYA_*` env terisi benar
- `TUYA_BASE_URL` match data center project Tuya
- Bardi CCTV sudah pair ke Smart Life dan online
- Device ID asli sudah di-seed ke tabel `cameras`

**Tidak ada perubahan kode saat switch.** Set env, restart, done. Detail di `src/lib/tuya.ts`:

```ts
const IS_MOCK = process.env.DEV_MOCK_STREAM === "true";

export async function getStreamUrl(deviceId: string): Promise<string> {
  if (IS_MOCK) {
    // return mock HLS URL
  }
  // hit Tuya API
}
```

---

## Database Setup

Schema sederhana, 3 tabel:

```
user_profiles  (extend auth.users)
  ├── role: 'super_admin' | 'parent'
  ├── full_name, email, phone, is_active
  └── trigger handle_new_user auto-create profile saat signup

cameras
  ├── device_id (UNIQUE — Tuya Device ID)
  ├── label ("Ruang Bayi", "Toddler", dst)
  └── is_active

camera_access  (M2M)
  ├── parent_id  → auth.users
  └── camera_id  → cameras
```

RLS aktif di semua tabel. Parent hanya bisa baca:
- Profilnya sendiri
- Kamera yang aktif DAN ada di `camera_access`-nya
- Mapping akses miliknya

Super admin operations dijalankan dari **server actions** pakai `createAdminClient()` (service role key) yang bypass RLS.

**Setup:** Buka Supabase SQL Editor → paste seluruh isi `daycare-cctv-nuclear-setup.sql` → Run. Script ini drop-and-recreate semua, jadi aman dijalankan ulang.

---

## Seed Super Admin Pertama

Karena app tidak punya halaman signup publik (semua akun dibuat oleh super admin), super admin pertama harus di-seed manual:

```sql
-- 1. Daftar email kamu via Supabase Dashboard
--    Authentication → Users → Add user → Create new user
--    (centang "Auto Confirm User" biar tidak perlu verifikasi email)

-- 2. Setelah user dibuat, jalankan SQL di SQL Editor:
UPDATE public.user_profiles
SET role = 'super_admin',
    full_name = 'Nama Kamu'
WHERE email = 'email-kamu@example.com';

-- 3. Login di /login pakai email + password tadi
--    Akan auto-redirect ke /dashboard
```

Setelah super admin pertama ada, semua wali murid berikutnya dibuat dari UI di `/admin/parents/new`.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/             # Login page
│   ├── (dashboard)/
│   │   ├── watch/                # Halaman utama wali murid
│   │   ├── dashboard/            # Dashboard super admin
│   │   ├── profile/
│   │   └── admin/
│   │       ├── cameras/          # CRUD kamera
│   │       ├── parents/          # CRUD wali murid
│   │       └── access/           # Assign kamera ↔ ortu
│   ├── api/
│   │   ├── stream/route.ts       # Auth guard + Tuya hit (server only)
│   │   └── auth/callback/        # Supabase auth callback
│   ├── layout.tsx
│   ├── page.tsx                  # Root redirect by role
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── shared/                   # ConfirmDialog, FullPageLoader, OfflineDetector
│   ├── layout/                   # Header, Sidebar, MobileNav
│   ├── features/
│   │   ├── auth/                 # LoginForm, LogoutButton
│   │   └── cctv/                 # StreamPlayer, CameraGrid, CameraCard
│   └── providers/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (anon key)
│   │   ├── server.ts             # Server component client (anon + RLS)
│   │   ├── admin.ts              # Service role client (bypass RLS)
│   │   └── middleware.ts         # Session refresh
│   ├── tuya.ts                   # Tuya client + dev/prod switch
│   ├── time.ts                   # Operational hours WIB
│   ├── utils.ts
│   └── validators.ts             # Zod schemas
├── stores/auth-store.ts          # Zustand auth state
├── types/database.ts             # Supabase generated types
└── constants/routes.ts
```

### Dependencies utama

```json
{
  "@supabase/ssr": "^0.5.x",
  "@supabase/supabase-js": "^2.x",
  "next": "^15.x",
  "react": "^19.x",
  "zustand": "^5.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "hls.js": "^1.5.x",
  "tailwindcss": "^4.x",
  "lucide-react": "latest",
  "sonner": "latest"
}
```

---

## Roles & Akses

| Aksi | Super Admin | Parent |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat dashboard `/dashboard` | ✅ | ❌ (auto-redirect ke `/watch`) |
| Lihat `/watch` | ✅ | ✅ (cuma kamera yg di-assign) |
| CRUD kamera | ✅ | ❌ |
| CRUD wali murid | ✅ | ❌ |
| Atur akses kamera ↔ ortu | ✅ | ❌ |
| Stream `/api/stream` | ✅ untuk semua kamera | ✅ hanya kamera yg di-assign (RLS + explicit check) |

**Catatan:** UI route protection dilakukan di middleware + page-level guard. **Real protection** tetap di API route (`/api/stream` cek `camera_access` table) dan RLS Supabase. UI guard cuma untuk UX, bukan security boundary.

---

## Deploy ke Production

### 1. Tuya Setup (sekali)

Ikuti [TUYA_SETUP.md](./TUYA_SETUP.md) dari awal sampai selesai. Pastikan:
- Cloud project Tuya dibuat dengan **IoT Video Live Stream** API authorized
- Smart Life app sudah link ke project via QR
- Bardi sudah pair ke Smart Life
- Device ID sudah dicatat
- Test hit API token + stream → dapat URL `.m3u8` valid (verify di VLC)

### 2. Supabase Cloud

- Buat project di [supabase.com](https://supabase.com)
- SQL Editor → paste `daycare-cctv-nuclear-setup.sql` → Run
- Authentication → Users → buat super admin pertama
- SQL Editor → UPDATE role super_admin (lihat section [Seed Super Admin](#seed-super-admin-pertama))

### 3. Railway

```bash
# Login & link
railway login
railway link

# Set env vars (atau pakai Railway dashboard → Variables)
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJ...
railway variables set TUYA_CLIENT_ID=xxx
railway variables set TUYA_CLIENT_SECRET=xxx
railway variables set TUYA_BASE_URL=https://openapi.tuyaeu.com

# KUNCI UTAMA:
railway variables set DEV_MOCK_STREAM=false

railway variables set NODE_ENV=production

# Deploy
railway up
```

### 4. Seed Data Production

Di Supabase SQL Editor:

```sql
-- Tambah kamera (device_id = Device ID asli dari Tuya)
INSERT INTO public.cameras (device_id, label) VALUES
  ('6cf2b6d2b09a2f8597xxxx', 'Ruang Bayi'),
  ('6cf2b6d2b09a2f8597yyyy', 'Toddler'),
  ('6cf2b6d2b09a2f8597zzzz', 'Playroom');
```

Sisanya (akun ortu, assign akses) bisa dilakukan dari UI di `/admin`.

### 5. Smoke Test

- [ ] Buka `https://your-app.railway.app/login`
- [ ] Login super admin → dashboard muncul
- [ ] Buka `/admin/cameras` → kamera yg di-seed muncul
- [ ] Buat 1 akun wali murid test
- [ ] Assign 1 kamera ke akun itu
- [ ] Logout → login pakai akun ortu → `/watch` → stream Bardi muncul
- [ ] Test outside operational hours (atau bypass sementara di `lib/time.ts` untuk test) → notice "tutup" muncul

---

## Troubleshooting

| Gejala | Cek |
|---|---|
| Login berhasil tapi langsung di-logout | Akun belum punya row di `user_profiles`, atau `is_active=false`. Cek SQL Editor |
| `/api/stream` 401 | Session Supabase invalid / expired. Login ulang |
| `/api/stream` 403 | User tidak punya entry di `camera_access` untuk device ini |
| `/api/stream` 423 | Di luar jam operasional (07:00–17:00 WIB). By design |
| `/api/stream` 503 | Tuya API error. Cek log server. Biasanya: kamera offline, signature salah, atau base URL salah data center |
| Tuya error `sign invalid` | Cek `TUYA_BASE_URL` match region Smart Life. Cek urutan signature di `lib/tuya.ts` (token vs business request beda formula) |
| Tuya error code 1010/1011 | Token invalid/expired. Code sudah handle auto-refresh + retry sekali. Kalau masih gagal → credentials salah |
| Device tidak muncul di Tuya Cloud → All Devices | Smart Life region ≠ data center project. Re-link account |
| Stream URL valid tapi video hitam di browser | Kamera baru on, tunggu 5-10 detik. Atau Hls.js error di console |
| Autoplay diblok di mobile | Code sudah handle dengan tap-to-play overlay |

Catatan tambahan:
- Stream URL Tuya expire ~10 menit. Jangan di-cache di mana pun. `lib/tuya.ts` sudah pakai `cache: 'no-store'`.
- Token Tuya cache di memory proses Node.js. Railway restart → cache hilang otomatis → ambil baru. Aman.

---

## Scope V1 / MVP

Sengaja **tidak** dimasukkan ke V1:

- **Multi-tenant** (multiple daycare/sekolah) — schema saat ini single-tenant
- **Role admin level menengah** — cuma super_admin & parent
- **Magic link / email invite** — semua akun dibuat manual oleh super admin dengan password
- **Recording playback** — Tuya support, tapi V1 cukup live
- **Audit log** (siapa lihat kamera mana, kapan)
- **Push notification** untuk event kamera (motion, dll)
- **Reset password self-service** untuk parent — sekarang harus minta admin

Yang **ada bonus** di luar master spec:

- Operational hours gate (07:00–17:00 WIB)
- Token auto-refresh on Tuya error 1010/1011
- Offline detector
- PWA setup lengkap (manifest, icons, viewport-fit)
- Idempotent access assignment (diff-based, bukan delete-all-then-insert)
- Tap-to-play untuk autoplay block
- Live indicator di stream player
- Rollback otomatis di `createParent` jika profile insert gagal

---

## Lisensi & Maintainer

Internal use. Update dokumen ini kalau ada perubahan signifikan di Tuya OpenAPI spec, struktur DB, atau flow auth.

**Lihat juga:**
- [TUYA_SETUP.md](./TUYA_SETUP.md) — guide setup Tuya Developer dari nol
- [.env.example](./.env.example) — template environment variables
- `daycare-cctv-nuclear-setup.sql` — database setup script
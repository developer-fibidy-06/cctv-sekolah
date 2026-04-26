# 🗄️ Supabase Setup Guide — E-Raport PKBM

> Panduan lengkap inisialisasi database Supabase untuk aplikasi E-Raport PKBM.  
> Ikuti langkah-langkah berikut secara berurutan.

---

## Prasyarat

Sebelum mulai, pastikan kamu sudah punya:

- ✅ Akun [Supabase](https://supabase.com) aktif
- ✅ Project Supabase sudah dibuat
- ✅ Akses ke **SQL Editor** dan **Authentication** di Supabase Dashboard

---

## Langkah 1 — Jalankan SQL Setup

1. Buka **Supabase Dashboard** → pilih project kamu
2. Pergi ke menu **SQL Editor**
3. Klik **New Query**
4. Paste seluruh isi file `supabase/setup.sql` ke editor
5. Klik tombol **Run** (atau tekan `Ctrl + Enter`)

Jika berhasil, kamu akan melihat output `Success. No rows returned`.

### Yang akan dibuat otomatis:

| Item | Keterangan |
|------|------------|
| `uuid-ossp` extension | Untuk generate UUID |
| Tabel `user_profiles` | Data profil pengguna + index |
| RLS Policies | User hanya lihat profil sendiri; admin lihat semua |
| Trigger `updated_at` | Auto-update kolom `updated_at` setiap ada perubahan |
| Trigger `handle_new_user` | Auto-buat profil saat user baru register |
| Grant permissions | Akses `anon` dan `authenticated` ke tabel |

---

## Langkah 2 — Buat Akun Super Admin

1. Di Supabase Dashboard, buka menu **Authentication → Users**
2. Klik tombol **Add User → Create new user**
3. Isi form berikut:

   | Field | Value |
   |-------|-------|
   | **Email** | `admin@example.com` *(ganti sesuai kebutuhan)* |
   | **Password** | `********` *(gunakan password kuat)* |

4. Klik **Create User**
5. Setelah user terbuat, **salin UUID**-nya dari kolom `User UID`

---

## Langkah 3 — Set Role Super Admin

1. Kembali ke **SQL Editor**
2. Jalankan query berikut, ganti `<paste-uuid-disini>` dengan UUID yang sudah disalin:

```sql
UPDATE public.user_profiles
  SET role = 'super_admin', full_name = 'Administrator'
  WHERE id = '<paste-uuid-disini>';
```

3. Klik **Run** — pastikan output menunjukkan `1 row affected`

---

## Langkah 4 — Verifikasi Setup

Jalankan query berikut di SQL Editor untuk memastikan semuanya berjalan dengan benar:

```sql
-- Cek tabel user_profiles
SELECT * FROM public.user_profiles;

-- Cek user yang sudah jadi super_admin
SELECT id, full_name, role, is_active, created_at
  FROM public.user_profiles
  WHERE role = 'super_admin';
```

Jika muncul baris data dengan `role = 'super_admin'`, setup sudah berhasil ✅

---

## Langkah 5 — Jalankan Aplikasi

```bash
npm run dev
```

Buka browser dan coba login menggunakan email + password admin yang sudah dibuat.

---

## Struktur Tabel `user_profiles`

```
user_profiles
├── id          UUID        PRIMARY KEY (referensi auth.users)
├── full_name   TEXT        NOT NULL
├── role        TEXT        DEFAULT 'user'  -- 'super_admin' | 'user'
├── avatar_url  TEXT
├── phone       TEXT
├── is_active   BOOLEAN     DEFAULT TRUE
├── created_at  TIMESTAMPTZ
└── updated_at  TIMESTAMPTZ
```

---

## Role & Permission

| Role | Lihat Profil | Edit Profil | Kelola User |
|------|-------------|------------|------------|
| `user` | Profil sendiri | Profil sendiri (kecuali `role` & `is_active`) | ❌ |
| `super_admin` | Semua profil | Semua profil | ✅ |

---

## Troubleshooting

### ❌ Error: `relation "user_profiles" already exists`
Tabel sudah pernah dibuat sebelumnya. Query sudah menggunakan `IF NOT EXISTS`, jadi ini aman diabaikan. Cek apakah tabel sudah ada di **Table Editor**.

### ❌ Error: `new row violates row-level security policy`
Pastikan kamu sudah menjalankan **Langkah 3** untuk set role `super_admin` sebelum mencoba aksi admin.

### ❌ User bisa login tapi profil tidak muncul
Trigger `handle_new_user` mungkin gagal. Jalankan manual:

```sql
INSERT INTO public.user_profiles (id, full_name, role)
VALUES ('<uuid-user>', 'Nama User', 'user')
ON CONFLICT (id) DO NOTHING;
```

### ❌ `updated_at` tidak berubah saat update data
Pastikan trigger `trg_user_profiles_updated_at` sudah terbuat. Cek dengan:

```sql
SELECT trigger_name FROM information_schema.triggers
  WHERE event_object_table = 'user_profiles';
```

---

## Catatan Keamanan

> ⚠️ **Jangan pernah** menyimpan credentials (email/password/UUID) di dalam kode sumber atau repository publik.

- Gunakan `.env` untuk menyimpan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`
- Pastikan file `.env` sudah masuk ke `.gitignore`
- Ganti password admin secara berkala

---

*Setup guide ini dibuat untuk project E-Raport PKBM. Hubungi tim developer untuk pertanyaan lebih lanjut.*
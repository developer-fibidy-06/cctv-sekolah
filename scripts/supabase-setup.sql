-- ============================================================
-- DAYCARE CCTV - NUCLEAR SETUP
-- Run SEKALI di SQL Editor Supabase.
-- Drop semua → recreate clean dengan schema final.
-- ============================================================
--
-- Schema:
--   user_profiles (extend auth.users)
--     - role: 'super_admin' | 'parent'
--     - email column (sync dari auth.users di trigger)
--   cameras (Tuya device mapping)
--   camera_access (parent ↔ camera many-to-many)
--
-- RLS:
--   - parent: read profil sendiri, kamera & access yang di-assign aja
--   - super_admin: bypass via service_role di server actions
-- ============================================================


-- ============================================================
-- 0. NUCLEAR DROP
-- ============================================================

DROP TRIGGER IF EXISTS trg_on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_cameras_updated_at       ON public.cameras;

DROP FUNCTION IF EXISTS public.handle_new_user()    CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at()  CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role()        CASCADE;

DROP TABLE IF EXISTS public.camera_access CASCADE;
DROP TABLE IF EXISTS public.cameras       CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TABLE: user_profiles
-- ============================================================

CREATE TABLE public.user_profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'parent'
                          CHECK (role IN ('super_admin', 'parent')),
  email       TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_role      ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX idx_user_profiles_email     ON public.user_profiles(email);


-- ============================================================
-- 3. TABLE: cameras
-- ============================================================

CREATE TABLE public.cameras (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cameras_is_active ON public.cameras(is_active);


-- ============================================================
-- 4. TABLE: camera_access (many-to-many: parent ↔ camera)
-- ============================================================

CREATE TABLE public.camera_access (
  parent_id   UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  camera_id   UUID        NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, camera_id)
);

CREATE INDEX idx_camera_access_parent ON public.camera_access(parent_id);
CREATE INDEX idx_camera_access_camera ON public.camera_access(camera_id);


-- ============================================================
-- 5. HELPER FUNCTION (bypass RLS untuk role check)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_access ENABLE ROW LEVEL SECURITY;


-- ----- user_profiles policies -----

-- SELECT: lihat profil sendiri ATAU super_admin lihat semua
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'super_admin'
  );

-- INSERT: trigger system (id = diri sendiri) atau super_admin
CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR public.get_my_role() = 'super_admin'
  );

-- UPDATE: user update profil sendiri (TIDAK bisa ganti role & is_active)
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role      = public.get_my_role()
    AND is_active = (SELECT is_active FROM public.user_profiles WHERE id = auth.uid())
  );

-- UPDATE: super_admin update siapa saja
CREATE POLICY "user_profiles_update_admin"
  ON public.user_profiles FOR UPDATE
  USING (public.get_my_role() = 'super_admin');

-- DELETE: hanya super_admin
CREATE POLICY "user_profiles_delete_admin"
  ON public.user_profiles FOR DELETE
  USING (public.get_my_role() = 'super_admin');


-- ----- cameras policies -----

-- SELECT: parent baca kamera AKTIF yang punya akses, super_admin lihat semua
CREATE POLICY "cameras_select_parent"
  ON public.cameras FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.camera_access
      WHERE camera_id = cameras.id
        AND parent_id = auth.uid()
    )
  );

CREATE POLICY "cameras_select_admin"
  ON public.cameras FOR SELECT
  USING (public.get_my_role() = 'super_admin');

-- INSERT/UPDATE/DELETE: hanya super_admin
CREATE POLICY "cameras_insert_admin"
  ON public.cameras FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "cameras_update_admin"
  ON public.cameras FOR UPDATE
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "cameras_delete_admin"
  ON public.cameras FOR DELETE
  USING (public.get_my_role() = 'super_admin');


-- ----- camera_access policies -----

-- SELECT: parent lihat akses sendiri, super_admin lihat semua
CREATE POLICY "camera_access_select_own"
  ON public.camera_access FOR SELECT
  USING (
    auth.uid() = parent_id
    OR public.get_my_role() = 'super_admin'
  );

-- INSERT/UPDATE/DELETE: hanya super_admin
CREATE POLICY "camera_access_insert_admin"
  ON public.camera_access FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "camera_access_update_admin"
  ON public.camera_access FOR UPDATE
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "camera_access_delete_admin"
  ON public.camera_access FOR DELETE
  USING (public.get_my_role() = 'super_admin');


-- ============================================================
-- 7. FUNCTION & TRIGGER: auto updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_cameras_updated_at
  BEFORE UPDATE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 8. FUNCTION & TRIGGER: auto-create profile saat user signup
-- ============================================================
--
-- Saat super admin invite ortu via auth.admin.createUser, trigger ini
-- yang auto-bikin profile-nya. Server action createParent juga upsert
-- buat overwrite role default biar jadi 'parent' + isi email & phone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Pengguna'),
    'parent',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 9. GRANTS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT                          ON public.user_profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cameras       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_access TO authenticated;


-- ============================================================
-- 10. SEED SUPER ADMIN (OPTIONAL — uncomment & ganti email)
-- ============================================================
--
-- Cara seed super admin pertama kali:
-- 1. Daftar dulu pakai email-mu via Supabase dashboard (Authentication → Add user)
--    ATAU dari halaman /login app (signUp di Supabase auth)
-- 2. Habis itu uncomment & jalankan ini, ganti email sesuai akunmu:
--
-- UPDATE public.user_profiles
--   SET role = 'super_admin', full_name = 'Super Admin'
--   WHERE email = 'your-email@example.com';
--
-- ============================================================


-- ============================================================
-- SELESAI ✅
-- ============================================================
-- Tabel: user_profiles, cameras, camera_access
-- RLS:   aktif semua (parent secured, admin via service_role)
-- Trigger: handle_new_user (auto profile), handle_updated_at
-- ============================================================
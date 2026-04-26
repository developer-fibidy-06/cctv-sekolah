import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase admin client menggunakan SERVICE_ROLE_KEY.
 *
 * ⚠️ KEY INI BYPASS SEMUA RLS by design.
 *
 * Hanya boleh dipakai di:
 * - Route handler / server action yang sudah verifikasi user adalah super_admin
 * - Operasi yang memang perlu privilege tinggi (create user, CRUD master data)
 *
 * JANGAN PERNAH:
 * - Expose ke client component
 * - Pass ke browser
 * - Log isi key di console produksi
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars"
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parentSchema, type ParentFormData } from "@/lib/validators";
import { ROUTES } from "@/constants";

async function assertSuperAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin" || !profile.is_active) {
    throw new Error("Forbidden");
  }
}

export async function createParent(formData: ParentFormData) {
  await assertSuperAdmin();
  const parsed = parentSchema.parse(formData);

  const admin = createAdminClient();

  // 1. Create auth user. email_confirm: true → user bisa login langsung tanpa verifikasi email
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.full_name,
    },
  });

  if (authError) {
    if (
      authError.message.toLowerCase().includes("already") ||
      authError.code === "email_exists"
    ) {
      throw new Error("Email sudah terdaftar");
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Gagal membuat akun");
  }

  // 2. Upsert profile row dengan role 'parent' + email + phone
  // Trigger handle_new_user akan auto-create profile dengan role default,
  // tapi kita upsert untuk pastikan role = 'parent' & data lengkap.
  const { error: profileError } = await admin.from("user_profiles").upsert(
    {
      id: authData.user.id,
      full_name: parsed.full_name,
      role: "parent",
      email: parsed.email,
      phone: parsed.phone,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    // Rollback: kalau profile gagal, hapus auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Gagal simpan profil: ${profileError.message}`);
  }

  revalidatePath(ROUTES.ADMIN_PARENTS);
  return { ok: true, id: authData.user.id };
}

export async function updateParentActive(id: string, isActive: boolean) {
  await assertSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(ROUTES.ADMIN_PARENTS);
  return { ok: true };
}

export async function deleteParent(id: string) {
  await assertSuperAdmin();
  const admin = createAdminClient();

  // Hapus auth user → ON DELETE CASCADE akan auto-cleanup user_profiles & camera_access
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath(ROUTES.ADMIN_PARENTS);
  revalidatePath(ROUTES.ADMIN_ACCESS);
  return { ok: true };
}
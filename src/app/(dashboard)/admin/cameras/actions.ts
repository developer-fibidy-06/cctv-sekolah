"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cameraSchema, type CameraFormData } from "@/lib/validators";
import { ROUTES } from "@/constants";

/**
 * Guard yang harus dipanggil di setiap admin action.
 * Throw error kalau bukan super_admin aktif.
 */
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

export async function createCamera(formData: CameraFormData) {
  await assertSuperAdmin();
  const parsed = cameraSchema.parse(formData);

  const admin = createAdminClient();
  const { error } = await admin.from("cameras").insert({
    device_id: parsed.device_id,
    label: parsed.label,
    is_active: parsed.is_active ?? true,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Device ID sudah terdaftar untuk kamera lain");
    }
    throw new Error(error.message);
  }

  revalidatePath(ROUTES.ADMIN_CAMERAS);
  return { ok: true };
}

export async function updateCameraActive(id: string, isActive: boolean) {
  await assertSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("cameras")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(ROUTES.ADMIN_CAMERAS);
  return { ok: true };
}

export async function deleteCamera(id: string) {
  await assertSuperAdmin();
  const admin = createAdminClient();
  // ON DELETE CASCADE di camera_access akan auto-cleanup mapping
  const { error } = await admin.from("cameras").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(ROUTES.ADMIN_CAMERAS);
  revalidatePath(ROUTES.ADMIN_ACCESS);
  return { ok: true };
}
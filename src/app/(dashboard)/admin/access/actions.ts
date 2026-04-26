"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessAssignmentSchema } from "@/lib/validators";
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

/**
 * Set akses kamera untuk satu parent.
 * Input: cameraIds yang DIINGINKAN final.
 * Logic: hitung diff dari yang sekarang ada di DB → insert yang baru, delete yang dihapus.
 *
 * Idempotent — bisa dipanggil berkali-kali aman.
 */
export async function setParentAccess(
  parentId: string,
  cameraIds: string[]
): Promise<{ ok: true; added: number; removed: number }> {
  await assertSuperAdmin();

  const parsed = accessAssignmentSchema.parse({
    parent_id: parentId,
    camera_ids: cameraIds,
  });

  const admin = createAdminClient();

  // Validasi parent ada & rolenya parent
  const { data: parent, error: parentError } = await admin
    .from("user_profiles")
    .select("id, role")
    .eq("id", parsed.parent_id)
    .single();

  if (parentError || !parent) {
    throw new Error("Wali murid tidak ditemukan");
  }
  if (parent.role !== "parent") {
    throw new Error("Hanya wali murid yang bisa diberi akses kamera");
  }

  // Validasi camera_ids semua exist (kalau ada yang invalid, abort biar gak partial commit)
  if (parsed.camera_ids.length > 0) {
    const { data: validCameras } = await admin
      .from("cameras")
      .select("id")
      .in("id", parsed.camera_ids);
    const validIds = new Set((validCameras ?? []).map((c) => c.id));
    const invalid = parsed.camera_ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new Error(`Kamera tidak valid: ${invalid.join(", ")}`);
    }
  }

  // Ambil mapping yang sekarang ada
  const { data: existing } = await admin
    .from("camera_access")
    .select("camera_id")
    .eq("parent_id", parsed.parent_id);

  const currentIds = new Set((existing ?? []).map((r) => r.camera_id));
  const desiredIds = new Set(parsed.camera_ids);

  const toAdd = parsed.camera_ids.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

  // Insert yang baru
  if (toAdd.length > 0) {
    const { error: insertError } = await admin.from("camera_access").insert(
      toAdd.map((cameraId) => ({
        parent_id: parsed.parent_id,
        camera_id: cameraId,
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  // Delete yang dihapus
  if (toRemove.length > 0) {
    const { error: deleteError } = await admin
      .from("camera_access")
      .delete()
      .eq("parent_id", parsed.parent_id)
      .in("camera_id", toRemove);
    if (deleteError) throw new Error(deleteError.message);
  }

  revalidatePath(ROUTES.ADMIN_ACCESS);
  return { ok: true, added: toAdd.length, removed: toRemove.length };
}
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStreamUrl } from "@/lib/tuya";
import { isOperationalHour, operationalHoursLabel } from "@/lib/time";

// Pastikan route ini selalu dynamic dan tidak di-cache di edge
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId");

  if (!deviceId) {
    return Response.json({ error: "deviceId required" }, { status: 400 });
  }

  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Role check — admin bypass jam operasional & akses check
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    return Response.json({ error: "Akun tidak aktif" }, { status: 403 });
  }

  const isAdmin = profile.role === "super_admin";

  // 3. Jam operasional — parent kena restriction, admin bebas
  if (!isAdmin && !isOperationalHour()) {
    return Response.json(
      {
        error: `Streaming hanya tersedia setiap hari pukul ${operationalHoursLabel()} WIB`,
        code: "OUTSIDE_HOURS",
      },
      { status: 423 } // 423 Locked
    );
  }

  // 4. Akses check — admin bypass, parent harus punya entry di camera_access
  if (!isAdmin) {
    const { data: access } = await supabase
      .from("camera_access")
      .select("camera_id, cameras!inner(device_id, is_active)")
      .eq("parent_id", user.id)
      .eq("cameras.device_id", deviceId)
      .eq("cameras.is_active", true)
      .maybeSingle();

    if (!access) {
      return Response.json(
        { error: "Anda tidak memiliki akses ke kamera ini" },
        { status: 403 }
      );
    }
  } else {
    // Admin: cukup pastikan kamera ada & aktif (defensive check)
    const admin = createAdminClient();
    const { data: cam } = await admin
      .from("cameras")
      .select("id")
      .eq("device_id", deviceId)
      .eq("is_active", true)
      .maybeSingle();

    if (!cam) {
      return Response.json(
        { error: "Kamera tidak ditemukan atau dinonaktifkan" },
        { status: 404 }
      );
    }
  }

  // 5. Tuya hit — fresh, no-cache. URL expire ~10 menit.
  try {
    const url = await getStreamUrl(deviceId);
    return Response.json(
      { url },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[/api/stream] Tuya error:", err);
    return Response.json(
      {
        error:
          "Kamera offline atau tidak tersedia. Coba lagi dalam beberapa saat.",
      },
      { status: 503 }
    );
  }
}
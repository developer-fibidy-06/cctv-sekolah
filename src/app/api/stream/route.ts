import { createClient } from "@/lib/supabase/server";
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

  // 2. Jam operasional (taruh setelah auth biar pesan jelas ke user yang valid)
  if (!isOperationalHour()) {
    return Response.json(
      {
        error: `Streaming hanya tersedia setiap hari pukul ${operationalHoursLabel()} WIB`,
        code: "OUTSIDE_HOURS",
      },
      { status: 423 } // 423 Locked
    );
  }

  // 3. Akses check — pastikan user punya akses ke device ini
  // RLS sudah filter, tapi explicit check biar response code akurat (403 vs 404)
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

  // 4. Tuya hit — fresh, no-cache. URL expire ~10 menit.
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
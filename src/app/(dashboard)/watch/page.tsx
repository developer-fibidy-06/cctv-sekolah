import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CameraGrid, OutsideHoursNotice } from "@/components/features/cctv";
import { Video, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants";
import type { Camera } from "@/types";

export const dynamic = "force-dynamic";

export default async function WatchPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN);

  // Cek role dulu — admin ambil semua kamera, parent ambil yang di-assign
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "super_admin";

  let cameras: Camera[] = [];

  if (isAdmin) {
    // Super admin: lihat SEMUA kamera aktif (bypass camera_access mapping)
    // Pakai admin client biar konsisten — RLS sebenarnya juga sudah allow
    // via policy 'cameras_select_admin', tapi explicit lebih aman.
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("cameras")
      .select("*")
      .eq("is_active", true)
      .order("label", { ascending: true });
    cameras = rows ?? [];
  } else {
    // Parent: cuma kamera yang sudah di-assign via camera_access
    const { data: rows } = await supabase
      .from("camera_access")
      .select("cameras!inner(*)")
      .eq("parent_id", user.id);

    cameras = (rows ?? [])
      .map((r) => r.cameras as unknown as Camera)
      .filter((c): c is Camera => Boolean(c) && c.is_active);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <Video className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Live CCTV</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Semua kamera aktif (mode admin)"
                : "Pantau kondisi anak Anda secara langsung"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Mode Admin
          </Badge>
        )}
      </div>

      <OutsideHoursNotice isAdmin={isAdmin} />

      <CameraGrid cameras={cameras} />
    </div>
  );
}
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CameraGrid, OutsideHoursNotice } from "@/components/features/cctv";
import { Video } from "lucide-react";
import { ROUTES } from "@/constants";
import type { Camera } from "@/types";

export const dynamic = "force-dynamic";

export default async function WatchPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN);

  // Fetch kamera yang punya akses (RLS auto-filter berdasarkan parent_id = auth.uid())
  const { data: rows } = await supabase
    .from("camera_access")
    .select("cameras!inner(*)")
    .eq("parent_id", user.id);

  const cameras: Camera[] = (rows ?? [])
    .map((r) => r.cameras as unknown as Camera)
    .filter((c): c is Camera => Boolean(c) && c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <Video className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Live CCTV</h1>
          <p className="text-sm text-muted-foreground">
            Pantau kondisi anak Anda secara langsung
          </p>
        </div>
      </div>

      <OutsideHoursNotice />

      <CameraGrid cameras={cameras} />
    </div>
  );
}
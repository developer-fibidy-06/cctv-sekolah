import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Video, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants";
import { CameraRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function CamerasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect(ROUTES.WATCH);

  const admin = createAdminClient();
  const { data: cameras } = await admin
    .from("cameras")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <Video className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kelola Kamera</h1>
            <p className="text-sm text-muted-foreground">
              Daftar kamera CCTV terdaftar
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={ROUTES.ADMIN_CAMERAS_NEW}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Kamera
          </Link>
        </Button>
      </div>

      {cameras && cameras.length > 0 ? (
        <div className="grid gap-3">
          {cameras.map((cam) => (
            <Card key={cam.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{cam.label}</p>
                    <Badge variant={cam.is_active ? "default" : "secondary"}>
                      {cam.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {cam.device_id}
                  </p>
                </div>
                <CameraRowActions camera={cam} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Video className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada kamera. Tambahkan kamera pertama.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.ADMIN_CAMERAS_NEW}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Kamera
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
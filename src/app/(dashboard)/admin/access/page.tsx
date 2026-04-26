import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link2, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants";
import { getInitials } from "@/lib/utils";
import { AccessForm } from "./access-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ parent?: string }>;
}

export default async function AccessPage({ searchParams }: PageProps) {
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

  const { parent: parentIdParam } = await searchParams;
  const admin = createAdminClient();

  // Fetch list ortu (selalu dipake, untuk picker maupun detail header)
  const { data: parents } = await admin
    .from("user_profiles")
    .select("id, full_name, email, is_active")
    .eq("role", "parent")
    .order("full_name", { ascending: true });

  // Hitung berapa kamera yang sudah di-assign per ortu (untuk indikator di list)
  const accessCounts = new Map<string, number>();
  if (parents && parents.length > 0) {
    const { data: accesses } = await admin
      .from("camera_access")
      .select("parent_id")
      .in(
        "parent_id",
        parents.map((p) => p.id)
      );
    (accesses ?? []).forEach((a) => {
      accessCounts.set(a.parent_id, (accessCounts.get(a.parent_id) ?? 0) + 1);
    });
  }

  // ===== MODE 1: PICKER (no parent selected) =====
  if (!parentIdParam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Link2 className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Akses Kamera</h1>
            <p className="text-sm text-muted-foreground">
              Pilih wali murid untuk mengatur akses kamera mereka
            </p>
          </div>
        </div>

        {parents && parents.length > 0 ? (
          <div className="grid gap-3">
            {parents.map((p) => {
              const count = accessCounts.get(p.id) ?? 0;
              return (
                <Link key={p.id} href={`${ROUTES.ADMIN_ACCESS}?parent=${p.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-4">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-blue-50 text-blue-700">
                          {getInitials(p.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{p.full_name}</p>
                          {!p.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Nonaktif
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {p.email ?? "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          <span className="font-semibold text-foreground">
                            {count}
                          </span>{" "}
                          kamera
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Belum ada wali murid</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tambahkan wali murid dulu di menu Wali Murid.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ===== MODE 2: DETAIL — assign cameras to specific parent =====
  const parent = (parents ?? []).find((p) => p.id === parentIdParam);
  if (!parent) {
    redirect(ROUTES.ADMIN_ACCESS);
  }

  // Fetch all cameras
  const { data: cameras } = await admin
    .from("cameras")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch existing access for this parent
  const { data: existingAccess } = await admin
    .from("camera_access")
    .select("camera_id")
    .eq("parent_id", parent.id);

  const initialCameraIds = (existingAccess ?? []).map((a) => a.camera_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Link2 className="h-5 w-5 text-purple-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Akses Kamera</p>
          <h1 className="text-xl md:text-2xl font-bold truncate">
            {parent.full_name}
          </h1>
          {parent.email && (
            <p className="text-xs text-muted-foreground truncate">
              {parent.email}
            </p>
          )}
        </div>
      </div>

      <Card className="bg-muted/40 border-dashed">
        <CardContent className="py-3">
          <Link
            href={ROUTES.ADMIN_ACCESS}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            ← Pilih wali murid lain
          </Link>
        </CardContent>
      </Card>

      <AccessForm
        parentId={parent.id}
        parentName={parent.full_name}
        cameras={cameras ?? []}
        initialCameraIds={initialCameraIds}
      />
    </div>
  );
}
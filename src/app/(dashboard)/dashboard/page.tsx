import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Video, Users, Link2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Parent? lempar ke /watch — dashboard ini khusus admin
  if (profile?.role !== "super_admin") redirect(ROUTES.WATCH);

  // Stats — pakai admin client (bypass RLS)
  const admin = createAdminClient();
  const [
    { count: cameraCount },
    { count: activeCameraCount },
    { count: parentCount },
    { count: accessCount },
  ] = await Promise.all([
    admin.from("cameras").select("*", { count: "exact", head: true }),
    admin
      .from("cameras")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "parent")
      .eq("is_active", true),
    admin.from("camera_access").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      title: "Kamera Aktif",
      value: `${activeCameraCount ?? 0}`,
      sub: `dari ${cameraCount ?? 0} total terdaftar`,
      icon: Video,
      color: "text-green-700",
      bg: "bg-green-50",
      href: ROUTES.ADMIN_CAMERAS,
    },
    {
      title: "Wali Murid",
      value: `${parentCount ?? 0}`,
      sub: "akun aktif",
      icon: Users,
      color: "text-blue-700",
      bg: "bg-blue-50",
      href: ROUTES.ADMIN_PARENTS,
    },
    {
      title: "Akses Diberikan",
      value: `${accessCount ?? 0}`,
      sub: "total mapping ortu ↔ kamera",
      icon: Link2,
      color: "text-purple-700",
      bg: "bg-purple-50",
      href: ROUTES.ADMIN_ACCESS,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-6 md:p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-green-100 text-sm font-medium">Halo,</p>
            <h1 className="text-2xl md:text-3xl font-bold">
              {profile?.full_name ?? "Admin"}
            </h1>
            <p className="text-green-100 text-sm mt-2">
              Panel administrasi Daycare CCTV
            </p>
          </div>
          <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="mt-4">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
            Super Admin
          </span>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Ringkasan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.title} href={s.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div
                      className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-2`}
                    >
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      {s.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
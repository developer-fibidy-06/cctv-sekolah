"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/stores";
import { ShieldCheck, Construction, Users, Database, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageLoader } from "@/components/shared";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const hasFetched = useAuthStore((state) => state.hasFetched);

  useEffect(() => {
    if (hasFetched && !isAdmin) {
      router.push("/dashboard");
    }
  }, [hasFetched, isAdmin, router]);

  if (!hasFetched) return <FullPageLoader text="Memuat..." />;
  if (!isAdmin) return <FullPageLoader text="Mengalihkan..." />;

  const adminMenus = [
    {
      title: "Manajemen Pengguna",
      description: "Kelola akun dan hak akses pengguna sistem",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Data Master",
      description: "Kelola data referensi dan konfigurasi sistem",
      icon: Database,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Hak Akses",
      description: "Atur peran dan izin pengguna",
      icon: Lock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Panel Admin</h1>
          <p className="text-muted-foreground text-sm">
            Akses khusus administrator sistem
          </p>
        </div>
      </div>

      {/* Admin info */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>
              Anda login sebagai <strong>{user?.full_name}</strong> dengan peran Super Admin
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Menu Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Menu Administrasi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminMenus.map((menu) => {
            const Icon = menu.icon;
            return (
              <Card key={menu.title} className="border hover:shadow-md transition-shadow cursor-pointer opacity-60">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-xl ${menu.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${menu.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold">{menu.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{menu.description}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Construction className="h-3 w-3" />
                    Segera hadir
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Placeholder notice */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Construction className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Fitur administrasi sedang dalam pengembangan dan akan segera tersedia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useAuthStore } from "@/stores";
import { User, Mail, Shield, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

function roleLabel(role: string): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "parent") return "Wali Murid";
  return "Pengguna";
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Informasi akun Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center py-8 gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-lg">{user.full_name}</p>
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium mt-1">
                {roleLabel(user.role)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="Nama Lengkap" value={user.full_name} />
            <InfoRow icon={Shield} label="Peran" value={roleLabel(user.role)} />
            {user.email && (
              <InfoRow icon={Mail} label="Email" value={user.email} />
            )}
            {user.phone && (
              <InfoRow icon={Phone} label="Nomor HP" value={user.phone} />
            )}
            <InfoRow
              icon={Mail}
              label="Status Akun"
              value={
                user.is_active ? (
                  <span className="text-green-600 font-medium">Aktif</span>
                ) : (
                  <span className="text-red-600 font-medium">Nonaktif</span>
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground text-center">
            Untuk mengubah password atau data akun, silakan hubungi administrator daycare.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
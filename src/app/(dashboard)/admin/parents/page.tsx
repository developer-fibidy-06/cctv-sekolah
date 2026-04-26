import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROUTES } from "@/constants";
import { getInitials } from "@/lib/utils";
import { ParentRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
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
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Wali Murid</h1>
            <p className="text-sm text-muted-foreground">
              Daftar akun wali murid terdaftar
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={ROUTES.ADMIN_PARENTS_NEW}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Wali Murid
          </Link>
        </Button>
      </div>

      {profiles && profiles.length > 0 ? (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-blue-50 text-blue-700">
                    {getInitials(p.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{p.full_name}</p>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{p.email ?? "-"}</span>
                    </span>
                    {p.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {p.phone}
                      </span>
                    )}
                  </div>
                </div>
                <ParentRowActions
                  parent={{
                    id: p.id,
                    full_name: p.full_name,
                    is_active: p.is_active,
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada wali murid. Tambahkan akun pertama.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.ADMIN_PARENTS_NEW}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Wali Murid
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
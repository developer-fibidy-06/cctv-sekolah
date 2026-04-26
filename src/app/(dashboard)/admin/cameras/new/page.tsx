"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cameraSchema, type CameraFormData } from "@/lib/validators";
import { ROUTES } from "@/constants";
import { createCamera } from "../actions";

export default function NewCameraPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CameraFormData>({
    resolver: zodResolver(cameraSchema),
    defaultValues: {
      device_id: "",
      label: "",
      is_active: true,
    },
  });

  const onSubmit = async (data: CameraFormData) => {
    setIsLoading(true);
    try {
      await createCamera(data);
      toast.success("Kamera berhasil ditambahkan");
      router.push(ROUTES.ADMIN_CAMERAS);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambahkan kamera");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={ROUTES.ADMIN_CAMERAS}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Video className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tambah Kamera</h1>
            <p className="text-sm text-muted-foreground">
              Daftarkan kamera CCTV baru
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Kamera</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label / Nama Ruangan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Ruang Bayi, Toddler, Playroom"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Nama yang akan dilihat wali murid di halaman live CCTV
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="device_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tuya Device ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="6cf2b6d2b09a2f8597xxxx"
                        disabled={isLoading}
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Dapatkan dari Tuya Developer Platform → Devices → All Devices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Kamera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={isLoading}
                >
                  <Link href={ROUTES.ADMIN_CAMERAS}>Batal</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
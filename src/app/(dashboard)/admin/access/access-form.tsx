"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { setParentAccess } from "./actions";
import type { Camera } from "@/types";

interface AccessFormProps {
  parentId: string;
  parentName: string;
  cameras: Camera[];
  initialCameraIds: string[];
}

export function AccessForm({
  parentId,
  parentName,
  cameras,
  initialCameraIds,
}: AccessFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialCameraIds)
  );

  const toggleCamera = (cameraId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cameraId)) next.delete(cameraId);
      else next.add(cameraId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(cameras.filter((c) => c.is_active).map((c) => c.id)));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await setParentAccess(parentId, [...selected]);
        const { added, removed } = result;
        if (added === 0 && removed === 0) {
          toast.info("Tidak ada perubahan");
        } else {
          const parts: string[] = [];
          if (added > 0) parts.push(`+${added} ditambah`);
          if (removed > 0) parts.push(`-${removed} dihapus`);
          toast.success(`Akses ${parentName} disimpan (${parts.join(", ")})`);
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan akses");
      }
    });
  };

  // Check if there are any unsaved changes
  const initialSet = new Set(initialCameraIds);
  const hasChanges =
    selected.size !== initialSet.size ||
    [...selected].some((id) => !initialSet.has(id));

  if (cameras.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Video className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Belum ada kamera terdaftar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tambahkan kamera dulu sebelum memberi akses ke wali murid.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Pilih kamera yang bisa diakses</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={isPending}
            >
              Pilih semua
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={isPending}
            >
              Hapus pilihan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {cameras.map((camera) => {
            const isChecked = selected.has(camera.id);
            const isDisabled = !camera.is_active;
            return (
              <label
                key={camera.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isDisabled
                  ? "bg-muted/30 cursor-not-allowed opacity-60"
                  : isChecked
                    ? "bg-green-50 border-green-200"
                    : "hover:bg-muted/50"
                  }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => !isDisabled && toggleCamera(camera.id)}
                  disabled={isDisabled || isPending}
                />
                <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center border flex-shrink-0">
                  <Video className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{camera.label}</p>
                    {!camera.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {camera.device_id}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selected.size}</span> kamera dipilih
          </p>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
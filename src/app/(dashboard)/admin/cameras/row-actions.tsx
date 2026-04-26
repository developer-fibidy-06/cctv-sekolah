"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared";
import { updateCameraActive, deleteCamera } from "./actions";
import type { Camera } from "@/types";

export function CameraRowActions({ camera }: { camera: Camera }) {
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await updateCameraActive(camera.id, !camera.is_active);
        toast.success(
          camera.is_active ? "Kamera dinonaktifkan" : "Kamera diaktifkan"
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal update kamera");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteCamera(camera.id);
        toast.success("Kamera dihapus");
        setShowDelete(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal hapus kamera");
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleToggle}>
            {camera.is_active ? (
              <>
                <PowerOff className="h-4 w-4 mr-2" /> Nonaktifkan
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" /> Aktifkan
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Hapus Kamera"
        description={`Yakin hapus "${camera.label}"? Semua mapping akses ortu ke kamera ini juga akan terhapus.`}
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
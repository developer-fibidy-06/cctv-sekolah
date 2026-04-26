"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Power, PowerOff, Trash2, Link2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared";
import { updateParentActive, deleteParent } from "./actions";
import { ROUTES } from "@/constants";

interface ParentRow {
  id: string;
  full_name: string;
  is_active: boolean;
}

export function ParentRowActions({ parent }: { parent: ParentRow }) {
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await updateParentActive(parent.id, !parent.is_active);
        toast.success(
          parent.is_active ? "Wali murid dinonaktifkan" : "Wali murid diaktifkan"
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal update wali murid");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteParent(parent.id);
        toast.success("Akun wali murid dihapus");
        setShowDelete(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal hapus akun");
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
          <DropdownMenuItem asChild>
            <Link href={`${ROUTES.ADMIN_ACCESS}?parent=${parent.id}`}>
              <Link2 className="h-4 w-4 mr-2" /> Atur Akses Kamera
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggle}>
            {parent.is_active ? (
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
        title="Hapus Akun Wali Murid"
        description={`Yakin hapus akun "${parent.full_name}"? Akun beserta semua akses kameranya akan terhapus permanen.`}
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
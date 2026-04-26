"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared";
import { useAuthStore } from "@/stores";
import { ROUTES } from "@/constants";

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  showIcon = true,
  showText = true,
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        className={className}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {showIcon && (
              <LogOut className={showText ? "mr-2 h-4 w-4" : "h-4 w-4"} />
            )}
            {showText && "Keluar"}
          </>
        )}
      </Button>

      <ConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Keluar dari Aplikasi"
        description="Apakah Anda yakin ingin keluar dari akun ini?"
        confirmLabel="Keluar"
        variant="destructive"
        isLoading={isLoading}
        onConfirm={handleLogout}
      />
    </>
  );
}
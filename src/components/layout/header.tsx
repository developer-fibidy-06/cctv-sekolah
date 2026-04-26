"use client";

import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { useAuthStore } from "@/stores";
import { ROUTES, APP_CONFIG } from "@/constants";

export function Header() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const homeHref = isAdmin ? ROUTES.DASHBOARD : ROUTES.WATCH;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4">
      <Link href={homeHref} className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <Image
            src="/icon/icon-96x96.png"
            alt={APP_CONFIG.shortName}
            fill
            className="object-contain"
          />
        </div>
        <span className="font-semibold text-sm md:text-base">
          {APP_CONFIG.shortName}
        </span>
      </Link>

      <div className="flex-1" />

      <UserMenu />
    </header>
  );
}
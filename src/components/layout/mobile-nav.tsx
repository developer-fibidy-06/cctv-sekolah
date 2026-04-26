"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { getAllNavItems } from "./nav-config";

export function MobileBottomNav() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  // Mobile: max 5 items
  const navItems = getAllNavItems(isAdmin).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight text-center">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
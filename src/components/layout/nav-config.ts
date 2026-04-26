import {
  Video,
  User,
  LayoutDashboard,
  Camera as CameraIcon,
  Users,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// =============================================
// Parent (wali murid) — minimal: cuma watch + profil
// =============================================
export const parentNavItems: NavItem[] = [
  { title: "Live CCTV", href: ROUTES.WATCH, icon: Video },
  { title: "Profil", href: ROUTES.PROFILE, icon: User },
];

// =============================================
// Admin — full menu management
// =============================================
export const adminMainItems: NavItem[] = [
  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { title: "Live CCTV", href: ROUTES.WATCH, icon: Video },
  { title: "Profil", href: ROUTES.PROFILE, icon: User },
];

export const adminManageItems: NavItem[] = [
  {
    title: "Kamera",
    href: ROUTES.ADMIN_CAMERAS,
    icon: CameraIcon,
    adminOnly: true,
  },
  {
    title: "Wali Murid",
    href: ROUTES.ADMIN_PARENTS,
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Akses Kamera",
    href: ROUTES.ADMIN_ACCESS,
    icon: Link2,
    adminOnly: true,
  },
];

export function getNavItems(isAdmin: boolean): NavSection[] {
  if (isAdmin) {
    return [
      { title: "Menu", items: adminMainItems },
      { title: "Administrasi", items: adminManageItems },
    ];
  }
  return [{ items: parentNavItems }];
}

export function getAllNavItems(isAdmin: boolean): NavItem[] {
  if (isAdmin) {
    return [...adminMainItems, ...adminManageItems];
  }
  return parentNavItems;
}

// Backward compat (used by some older imports)
export const mainNavItems = adminMainItems;
export const adminNavItems = adminManageItems;
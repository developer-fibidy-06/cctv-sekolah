export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  WATCH: "/watch",
  PROFILE: "/profile",
  DASHBOARD: "/dashboard",
  ADMIN_CAMERAS: "/admin/cameras",
  ADMIN_CAMERAS_NEW: "/admin/cameras/new",
  ADMIN_PARENTS: "/admin/parents",
  ADMIN_PARENTS_NEW: "/admin/parents/new",
  ADMIN_ACCESS: "/admin/access",
  ADMIN_SETUP_GUIDE: "/admin/setup-guide",
} as const;

export const APP_CONFIG = {
  name: "Daycare CCTV",
  shortName: "Daycare CCTV",
  description: "Pemantauan CCTV daycare untuk wali murid",
  // Operational hours WIB (Asia/Jakarta)
  operationalHours: { open: 7, close: 17 },
  timezone: "Asia/Jakarta",
} as const;
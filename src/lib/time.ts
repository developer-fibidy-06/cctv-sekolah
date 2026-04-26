import { APP_CONFIG } from "@/constants";

const TZ = APP_CONFIG.timezone;
const OPEN_HOUR = APP_CONFIG.operationalHours.open;
const CLOSE_HOUR = APP_CONFIG.operationalHours.close;

/**
 * Get current hour (0-23) in Asia/Jakarta timezone.
 * IMPORTANT: jangan andalkan server time — Vercel server bisa di mana aja.
 */
function getJakartaHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? parseInt(hourPart.value, 10) : 0;
}

/**
 * Check if current time is within operational hours.
 * Daycare buka setiap hari 07:00–17:00 WIB.
 */
export function isOperationalHour(now: Date = new Date()): boolean {
  const hour = getJakartaHour(now);
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR;
}

/**
 * Human-readable operational hours label for UI.
 * Contoh: "07:00–17:00"
 */
export function operationalHoursLabel(): string {
  const open = String(OPEN_HOUR).padStart(2, "0");
  const close = String(CLOSE_HOUR).padStart(2, "0");
  return `${open}:00–${close}:00`;
}

/**
 * Get current time as readable string in Jakarta TZ.
 * Contoh: "14:32"
 */
export function getJakartaTimeString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}
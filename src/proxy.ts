import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/session";

const publicRoutes = ["/login", "/api/auth/callback"];

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Runs on Node.js runtime (edge NOT supported in proxy).
 * Handles:
 *   - Supabase session refresh (cookie rotation)
 *   - Auth gate for protected routes
 *   - JSON 401 for /api/* (no redirect to /login)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle auth sendiri & return JSON error — bukan redirect ke /login
  if (pathname.startsWith("/api/")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Public routes: refresh session, no auth gate
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Protected routes: cek auth
  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder static files (svg/png/jpg/jpeg/gif/webp/ico/json)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
};
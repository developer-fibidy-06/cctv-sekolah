import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refresh Supabase session via cookies.
 * Dipanggil dari src/proxy.ts — JANGAN hapus call ke supabase.auth.getUser(),
 * itu yang trigger cookie rotation untuk SSR auth.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Trigger session refresh — JANGAN hapus, penting untuk SSR auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
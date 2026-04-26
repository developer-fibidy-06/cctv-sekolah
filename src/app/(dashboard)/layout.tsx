"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { FullPageLoader } from "@/components/shared";
import { MobileBottomNav, AppSidebar, Header } from "@/components/layout";
import { ROUTES } from "@/constants";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const authListenerSetup = useRef(false);

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasFetched = useAuthStore((state) => state.hasFetched);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const reset = useAuthStore((state) => state.reset);

  // Fetch user on mount jika belum ada
  useEffect(() => {
    if (!hasFetched && !isLoading) {
      fetchUser();
    }
  }, [hasFetched, isLoading, fetchUser]);

  // Auth state listener — satu-satunya di seluruh app
  useEffect(() => {
    if (authListenerSetup.current) return;
    authListenerSetup.current = true;

    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        reset();
        router.push(ROUTES.LOGIN);
      } else if (event === "SIGNED_IN" && session) {
        const state = useAuthStore.getState();
        if (!state.user) {
          fetchUser();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authListenerSetup.current = false;
    };
  }, [router, reset, fetchUser]);

  // Redirect guard
  useEffect(() => {
    if (hasFetched && !isLoading && !user) {
      router.push(ROUTES.LOGIN);
    }
  }, [hasFetched, isLoading, user, router]);

  if (!hasFetched) return <FullPageLoader text="Memuat..." />;
  if (isLoading) return <FullPageLoader text="Mengautentikasi..." />;
  if (!user) return <FullPageLoader text="Mengalihkan..." />;

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <div className="flex flex-1 flex-col md:ml-64">
        <Header />

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
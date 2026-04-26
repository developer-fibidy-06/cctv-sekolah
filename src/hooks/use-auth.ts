"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { ROUTES } from "@/constants";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const hasFetched = useAuthStore((state) => state.hasFetched);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const storeLogout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useEffect(() => {
    if (!hasFetched && !isLoading) {
      fetchUser();
    }
  }, [hasFetched, isLoading, fetchUser]);

  const logout = useCallback(async () => {
    await storeLogout();
    router.push(ROUTES.LOGIN);
  }, [storeLogout, router]);

  return { user, isLoading, isAuthenticated, isAdmin, hasFetched, logout };
}
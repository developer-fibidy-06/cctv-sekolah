import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasFetched: boolean;
  fetchPromise: Promise<void> | null;

  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  hasFetched: false,
  fetchPromise: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  fetchUser: async () => {
    const state = get();

    if (state.hasFetched && state.user) return;
    if (state.fetchPromise) return state.fetchPromise;
    if (state.isLoading) return;

    const supabase = createClient();

    const promise = (async () => {
      try {
        set({ isLoading: true });

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          set({ ...initialState, hasFetched: true });
          return;
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .eq("is_active", true)
          .single();

        if (error || !profile) {
          set({ ...initialState, hasFetched: true });
          return;
        }

        set({
          user: profile,
          isAuthenticated: true,
          isAdmin: profile.role === "super_admin",
          isLoading: false,
          hasFetched: true,
          fetchPromise: null,
        });
      } catch (err) {
        console.error("fetchUser error:", err);
        set({ ...initialState, hasFetched: true });
      }
    })();

    // Set promise SEBELUM async resolve — fix race condition
    set({ fetchPromise: promise });
    return promise;
  },

  logout: async () => {
    const supabase = createClient();

    // Clear state dulu, baru signOut
    set({ ...initialState });

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
  },

  reset: () => set({ ...initialState }),
}));
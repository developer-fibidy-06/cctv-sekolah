import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/features/auth";
import { ROUTES, APP_CONFIG } from "@/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Login - ${APP_CONFIG.name}`,
  description: APP_CONFIG.description,
};

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // root page akan handle role-based redirect
    redirect(ROUTES.HOME);
  }

  return <LoginForm />;
}
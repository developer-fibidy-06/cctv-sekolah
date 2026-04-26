"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores";
import { loginSchema, type LoginFormData } from "@/lib/validators";
import { ROUTES, APP_CONFIG } from "@/constants";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        setError(
          authError.message.includes("Invalid login")
            ? "Email atau password salah"
            : authError.message
        );
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Gagal login. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      // Verifikasi profile aktif
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, role, is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Akun tidak terdaftar dalam sistem. Hubungi administrator.");
        setIsLoading(false);
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError("Akun Anda telah dinonaktifkan. Hubungi administrator.");
        setIsLoading(false);
        return;
      }

      // Reset store → trigger fresh fetch
      useAuthStore.setState({
        hasFetched: false,
        isLoading: false,
        fetchPromise: null,
      });

      // Redirect ke "/" — root page handle role-based redirect
      // (super_admin → /dashboard, parent → /watch)
      router.push(ROUTES.HOME);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-4 pb-4">
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            <Image
              src="/icon/icon-192x192.png"
              alt={APP_CONFIG.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">{APP_CONFIG.name}</CardTitle>
          <CardDescription className="text-base mt-1">
            {APP_CONFIG.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="email@daycare.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pl-10 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Masuk
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <p>
                Lupa password?{" "}
                <span className="font-medium text-foreground">
                  Hubungi Administrator
                </span>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
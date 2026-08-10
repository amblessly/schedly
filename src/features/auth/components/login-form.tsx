"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { TurnstileWidget } from "@/components/turnstile";
import { verifyCaptcha } from "@/app/actions";
import { toast } from "sonner";
import Link from "next/link";

export function LoginForm() {
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callback") || "/dashboard";

  function update(field: keyof LoginInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (serverError) setServerError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const captchaResult = await verifyCaptcha(turnstileToken);
      if (!captchaResult.success) {
        setServerError("Bot verification failed. Please try again.");
        toast.error("Bot verification failed. Please try again.");
        setLoading(false);
        return;
      }

      const signInResult = await signIn(result.data);

      if (signInResult.error) {
        const msg = signInResult.error.message || "";
        if (
          msg.toLowerCase().includes("email not verified") ||
          msg.toLowerCase().includes("verify your email")
        ) {
          const email = encodeURIComponent(result.data.email);
          router.push(`/verify-email/pending?email=${email}`);
          return;
        }
        if (msg.includes("locked") || msg.includes("too many")) {
          setServerError("Account temporarily locked due to too many failed attempts. Please try again later.");
        } else if (msg.includes("Invalid") || msg.includes("invalid")) {
          setServerError("Invalid email or password.");
        } else {
          setServerError(msg || "Sign in failed. Please try again.");
        }
        toast.error("Login failed. Please check your credentials and try again.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      console.error("[LoginForm] Unexpected error:", err);
      setServerError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-lg shadow-primary/5">
      <CardHeader className="pb-4 text-center">
        <img
          src="/images/logo.jpg"
          alt=""
          aria-hidden
          className="mx-auto mb-2 h-10 w-10 rounded-lg object-cover shadow-md shadow-primary/20"
        />
        <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Welcome back</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sign in to your Schedly account
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-2">
            <FloatingLabelInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <FloatingLabelInput
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>
          {serverError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}
          <div className="flex justify-center">
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="h-10 w-full font-medium hover:bg-primary/10 hover:text-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        <div className="pt-4 border-t border-border/50 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

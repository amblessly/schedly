"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword;
  const isValid = password.length >= 8 && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !isValid) return;

    setLoading(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(result.error.message || "Invalid or expired reset link");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="border-border/50 shadow-lg shadow-primary/5">
        <CardHeader className="pb-4 text-center">
          <Image
            src="/images/logo.jpg"
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover shadow-lg shadow-primary/20"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-3 text-xl font-bold">Invalid reset link</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This password reset link is invalid or missing a token.
            Please request a new one.
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">Request New Link</Button>
          </Link>
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="border-border/50 shadow-lg shadow-primary/5">
        <CardHeader className="pb-4 text-center">
          <Image
            src="/images/logo.jpg"
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover shadow-lg shadow-primary/20"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="mt-3 text-xl font-bold">Password reset!</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Sign In</Button>
          </Link>
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg shadow-primary/5">
      <CardHeader className="pb-4 text-center">
        <Image
          src="/images/logo.jpg"
          alt=""
          aria-hidden
          width={48}
          height={48}
          className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover shadow-lg shadow-primary/20"
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-3 text-xl font-bold">Set new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                autoFocus
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 pr-10 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 pr-10 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                style={{
                  borderColor:
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "var(--destructive)"
                      : "var(--input)",
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords don&apos;t match</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !isValid}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size={16} color="var(--secondary-foreground)" />
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

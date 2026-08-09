"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export function VerifyEmailPrompt() {
  const { user, refetchSession, signOut } = useAuth();
  const email = (user as { email?: string } | null)?.email || "";
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  async function verifyOtp() {
    if (otp.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await authClient.emailOtp.verifyEmail({
        email,
        otp: otp.trim(),
      });
      if (res.error) {
        const code = (res.error as { code?: string })?.code;
        setError(
          code === "OTP_EXPIRED"
            ? "This code has expired. Request a new one."
            : code === "TOO_MANY_ATTEMPTS"
              ? "Too many incorrect attempts. Request a new code and try again."
              : "Invalid code. Check your email and try again."
        );
        return;
      }
      setOtp("");
      refetchSession();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    if (!email) return;
    setSending(true);
    setError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setResent(true);
    } catch {
      setError("Couldn't send the code. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-lg shadow-primary/5">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Verify your email
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            verifyOtp();
          }}
        >
          <div>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter code"
              value={otp}
              maxLength={6}
              disabled={verifying}
              autoFocus
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="h-14 text-center text-2xl font-semibold tracking-[0.5em] placeholder:tracking-normal"
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={verifying || !otp}>
            {verifying ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {verifying ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Didn&rsquo;t get a code?</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 font-medium"
            onClick={resendCode}
            disabled={sending}
          >
            {sending ? "Sending..." : "Resend code"}
          </Button>
        </div>
        {resent && (
          <p className="text-center text-xs text-muted-foreground">
            A new code was sent to your inbox.
          </p>
        )}

        <Button
          variant="outline"
          className="h-11 w-full font-medium"
          onClick={() => signOut()}
        >
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

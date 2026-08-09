"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth-fetch";
import { Loader2 } from "lucide-react";

interface EmailProvider {
  app?: string;
  web: string;
}

// Each provider maps to both its native app URL scheme (for Capacitor/PWA so
// the mail app opens directly instead of the browser) and its web URL fallback.
const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  gmail: { app: "googlegmail://", web: "https://mail.google.com" },
  googlemail: { app: "googlegmail://", web: "https://mail.google.com" },
  outlook: { app: "ms-outlook://", web: "https://outlook.live.com" },
  hotmail: { app: "ms-outlook://", web: "https://outlook.live.com" },
  live: { app: "ms-outlook://", web: "https://outlook.live.com" },
  msn: { app: "ms-outlook://", web: "https://outlook.live.com" },
  yahoo: { app: "ymail://", web: "https://mail.yahoo.com" },
  proton: { app: "protonmail://", web: "https://mail.proton.me" },
  icloud: { web: "https://www.icloud.com/mail" },
  zoho: { web: "https://mail.zoho.com" },
  aol: { web: "https://mail.aol.com" },
  gmx: { web: "https://www.gmx.com" },
};

function getProvider(email: string): EmailProvider {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  const providerKey = (domain.split(".")[0] ?? "").toLowerCase();
  return EMAIL_PROVIDERS[providerKey] || { web: `https://${domain}` };
}

function openInbox(email: string) {
  const { app, web } = getProvider(email);
  if (app) {
    // T
    // he app scheme may not be installed; fall back to the web mail client.
    window.location.href = app;
    setTimeout(() => {
      if (!document.hidden) {
        window.open(web, "_blank", "noopener,noreferrer");
      }
    }, 600);
  } else {
    window.open(web, "_blank", "noopener,noreferrer");
  }
}

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [polling, setPolling] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch("/api/auth/get-session");
        const data = await res.json();
        if (data?.user?.emailVerified) {
          clearInterval(pollRef.current);
          setPolling(false);
          router.push("/dashboard");
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => {
      clearInterval(pollRef.current);
    };
  }, [router]);

  // Resend cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function verifyOtp() {
    if (!email || otp.trim().length < 6) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      const res = await authClient.emailOtp.verifyEmail({
        email,
        otp: otp.trim(),
      });
      if (res.error) {
        const code = (res.error as { code?: string })?.code;
        const msg =
          code === "OTP_EXPIRED"
            ? "This code has expired. Request a new one."
            : code === "TOO_MANY_ATTEMPTS"
              ? "Too many incorrect attempts. Request a new code and try again."
              : "Invalid code. Check your email and try again.";
        setOtpError(msg);
        return;
      }
      router.push("/dashboard");
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    if (!email || cooldown > 0) return;
    setSending(true);
    setOtpError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setResent(true);
      setCooldown(30);
    } catch {
      setOtpError("Couldn't send the code. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-lg shadow-primary/5">
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
          Check your email
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit verification code to{" "}
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
                setOtpError("");
              }}
              className="h-14 text-center text-2xl font-semibold tracking-[0.5em] placeholder:tracking-normal"
            />
            {otpError && (
              <p className="mt-2 text-xs text-destructive">{otpError}</p>
            )}
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
            disabled={sending || cooldown > 0}
          >
            {sending
              ? "Sending..."
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </Button>
        </div>
        {resent && (
          <p className="text-center text-xs text-muted-foreground">
            A new code was sent to your inbox.
          </p>
        )}

        <div className="flex flex-col items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => email && openInbox(email)}
          >
            Open email app
          </Button>
          {polling && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Waiting for verification
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearReauth, getReauthStatus } from "./actions";

const WHATS_NEW = [
  "Reminder notifications before every class",
  "Weather in your area for your schedule",
  "Asia/Manila timezone applied automatically",
];

/**
 * Forced one-time re-authentication dialog for accounts created before the
 * current session schema. Non-dismissable: the only way forward is Continue →
 * see what's new → Sign out, then sign back in. The re-auth flag is cleared
 * only when this dialog signs the user out.
 */
export function ReauthDialog() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getReauthStatus()
      .then((s) => {
        if (active && s.requiresReauth) setShow(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clearReauth();
    } catch {
      // Still sign out even if clearing the flag failed.
    }
    try {
      await authClient.signOut();
    } catch {
      // Continue to login regardless.
    }
    router.replace("/login");
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in again"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-5 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-7 shadow-2xl sm:p-8">
        {step === 1 ? (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                You need to sign in again
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We made some security and account updates, so you&apos;ll need to
                sign in once more. It only takes a second and your data stays
                exactly where you left it.
              </p>
            </div>
            <Button
              className="h-12 w-full font-semibold"
              onClick={() => setStep(2)}
              autoFocus
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                What&apos;s new
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Here&apos;s what Schedly has for you.
              </p>
            </div>
            <ul className="mb-6 space-y-3">
              {WHATS_NEW.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="h-12 w-full font-semibold"
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

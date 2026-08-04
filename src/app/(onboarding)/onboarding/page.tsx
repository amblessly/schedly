"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { uploadAvatar } from "@/app/(dashboard)/settings/actions";
import { AddToHomeScreenCard } from "./add-to-home-screen";
import { NotificationsCard } from "./notifications-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type UserWithExtras = {
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  avatarUrl?: string;
} & Record<string, unknown>;

export default function OnboardingPage() {
  const { user, isLoading, refetchSession } = useAuth();
  const u = user as UserWithExtras | null;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [avatarUrl, setAvatarUrl] = useState<string | null>((u?.image as string) || (u?.avatarUrl as string) || null);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const firstName = u?.firstName || "User";
  const lastName = u?.lastName || "";
  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase();

  const markComplete = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await authClient.updateUser({
        onboardingCompleted: true,
      } as Parameters<typeof authClient.updateUser>[0]);
    } catch {
      /* let the user through either way */
    }
    router.push("/dashboard");
  };

  const handleContinue = () => {
    setStep(2);
  };

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAvatar(fd);
      if ("url" in result) {
        setAvatarUrl(result.url);
        refetchSession();
      }
    } catch {
      /* keep current avatar */
    }
    setUploading(false);
    e.target.value = "";
  }

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white p-5">
      <div className="w-full max-w-md">
        {/* Top bar: logo + skip */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo.jpg" alt="Schedly" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-lg font-bold tracking-tight text-foreground">Schedly</span>
          </div>
          <button
            type="button"
            onClick={markComplete}
            disabled={finishing}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s === step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {step === 1 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-8">
              <div className="mb-7 flex flex-col items-center text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Set up your profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a profile photo so your friends can find you.
                </p>
              </div>

              {/* Avatar */}
              <div className="mb-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="group relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-border/40 transition-shadow hover:ring-primary/40"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-primary/10 text-3xl font-semibold text-primary">
                      {initials}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </span>
                </button>
                <p className="text-xs text-muted-foreground">
                  {avatarUrl ? "Tap to change your photo" : "Add a profile photo (optional)"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>

              <Button
                className="mt-6 h-12 w-full font-semibold"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-8">
              <div className="mb-7 flex flex-col items-center text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Almost done</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  These two steps make Schedly feel like a real app. You can skip them.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 p-4">
                  <AddToHomeScreenCard />
                </div>
                <div className="rounded-2xl border border-border/50 p-4">
                  <NotificationsCard />
                </div>
              </div>

              <Button className="mt-6 h-12 w-full font-semibold" disabled={finishing} onClick={markComplete}>
                {finishing ? "Finishing up..." : "Get started"}
              </Button>
              <button
                type="button"
                onClick={markComplete}
                disabled={finishing}
                className="mt-3 w-full text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Not now
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
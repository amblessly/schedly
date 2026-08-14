"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";

// Inline profile avatar shown at the start of page headers (main pages).
// Tapping it opens the profile page — replaces the old floating top-left
// avatar button so the avatar sits flush with the page title instead.
export function HeaderAvatar() {
  const router = useRouter();
  const { user } = useAuth();

  const u = user as
    | { firstName?: string; image?: string; avatarUrl?: string }
    | null
    | undefined;
  const initials = (u?.firstName || "U").charAt(0).toUpperCase();
  const rawAvatar = u?.image || u?.avatarUrl || null;
  // Ensure avatar URL is absolute for Capacitor/PWA origins.
  const avatar =
    rawAvatar &&
    !rawAvatar.startsWith("data:") &&
    !rawAvatar.startsWith("http") &&
    rawAvatar.startsWith("/")
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${rawAvatar}`
      : rawAvatar;

  return (
    <button
      type="button"
      onClick={() => router.push("/profile")}
      aria-label="Open profile"
      className="hidden shrink-0 transition-transform duration-200 hover:scale-105 md:block"
    >
      {avatar ? (
        <img
          src={avatar}
          alt={initials}
          className="h-10 w-10 rounded-full object-cover ring-2 ring-border/40"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary ring-2 ring-border/40">
          {initials}
        </div>
      )}
    </button>
  );
}

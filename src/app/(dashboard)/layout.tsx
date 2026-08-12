"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ArrowLeft, Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { useThemeConfig } from "@/features/theme";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { reportClientType, type ClientType } from "./actions";
import { getUserSchedules } from "@/app/(dashboard)/schedule/actions";
import { getUserReminders, scheduleUpcomingReminders } from "@/app/(dashboard)/reminders/actions";
import { programReminderAlarms } from "@/lib/notification-scheduler";
import { cachedAction } from "@/lib/server-action-cache";

// The drawer's open state lives in a tiny external store so its initial
// value can come from matchMedia only AFTER hydration. The server renders
// "closed" by default — otherwise narrow (mobile) windows would paint the
// open sidebar briefly during SSR, then slide it shut right after hydration
// (the flash the user saw). On desktop the drawer slides open once hydration
// computes the true viewport, with no hydration mismatch.
let openState: boolean | null = null;
const openListeners = new Set<() => void>();

function getOpenSnapshot(): boolean {
  if (openState === null) {
    openState = window.matchMedia("(min-width: 768px)").matches;
  }
  return openState;
}

function subscribeOpen(listener: () => void) {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

function setOpen(next: boolean) {
  openState = next;
  openListeners.forEach((l) => l());
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { themeVars } = useThemeConfig();
  const open = useSyncExternalStore(subscribeOpen, getOpenSnapshot, () => false);
  const showButton = !open;
  const pathname = usePathname();
  const router = useRouter();

  // First-time users are pushed through the setup flow before using the app.
  const { user, isLoading } = useAuth();
  const userObj = user as { onboardingCompleted?: boolean; emailVerified?: boolean } | null;
  const needsOnboarding =
    !isLoading && user && !userObj?.onboardingCompleted;
  // Email must be verified before the user can enter the app — covers users
  // who still hold a session created before verification was enforced.
  const needsEmailVerification =
    !isLoading && user && userObj?.emailVerified === false;

  const u = user as
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
        image?: string;
        avatarUrl?: string;
        isAdmin?: boolean;
      }
    | null
    | undefined;
  const firstName = u?.firstName || "User";
  const lastName = u?.lastName || "";
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const initials = firstName.charAt(0).toUpperCase();
  const userAvatar = u?.image || u?.avatarUrl || null;

  // Auto-download offline support: once signed in, warm the cache with the
  // main tab pages so they're instantly available (and work) offline. The
  // avatar is warmed too so the user's photo still renders without internet.
  // Runs once per session and only after the page has settled — hitting 7
  // pages at once on app open just competes with the first paint.
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;
    const KEY = `schedly-precached-${(user as { id?: string }).id ?? ""}`;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      // No sessionStorage (rare) — still precache.
    }
    const timer = setTimeout(() => {
      navigator.serviceWorker.ready
        .then((reg) => {
          const avatar = (user as { image?: string; avatarUrl?: string } | null)?.image
            || (user as { image?: string; avatarUrl?: string } | null)?.avatarUrl;
          reg.active?.postMessage({
            type: "PRECACHE",
            urls: [
              "/dashboard", "/schedule", "/capture", "/notes", "/flashcards", "/notifications", "/pomodoro", "/gwa",
              ...(avatar ? [avatar] : []),
            ],
          });
          // Re-arm pending class-reminder alarms after every app open so they
          // still fire even if the tab/SW was closed since they were set.
          reg.active?.postMessage({ type: "REARM_ALARMS" });
        })
        .catch(() => {});
    }, 3000);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Best-effort.
    }
    return () => clearTimeout(timer);
  }, [user]);

  // Arm local class-reminder alarms from the service worker on every app open
  // (any dashboard page), not just the Notifications page. Local alarms fire
  // at the exact minute via Notification Triggers (installed PWA) or the SW
  // ticker while the app is open. Exact-time delivery when the app is closed
  // comes from QStash, re-scheduled here (throttled) so edits take effect.
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;
    let active = true;
    // Deduped: the layout and the pages both fetch schedules/reminders, so
    // these collapse into one request instead of 2-4 per navigation.
    Promise.all([
      cachedAction("layout:schedules", () => getUserSchedules()),
      cachedAction("layout:reminders", () => getUserReminders()),
    ])
      .then(([schedules, reminders]) => {
        if (!active) return;
        if (schedules.length > 0 && reminders.length > 0) {
          programReminderAlarms(schedules as never, reminders as never).catch(() => {});
        }
      })
      .catch(() => {});
    // Refresh exact-time QStash deliveries (30s throttle, no-op until tokens
    // are configured).
    cachedAction("layout:qstash", () => scheduleUpcomingReminders(), 30_000).catch(() => {});
    return () => {
      active = false;
    };
  }, [user, pathname]);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
    else if (needsEmailVerification && user) {
      const email = encodeURIComponent((user as { email?: string }).email || "");
      router.replace(`/verify-email/pending?email=${email}`);
    }
  }, [needsOnboarding, needsEmailVerification, user, router]);

  // Record what the user is running on (web, PWA on Android/iOS, or the
  // Android APK) so the admin dashboard can show each user's device. Runs
  // once per session per type, so it doesn't spam the database.
  useEffect(() => {
    if (!user) return;
    let type: ClientType = "web";
    try {
      if (Capacitor.isNativePlatform()) {
        type = "apk";
      } else {
        const standalone =
          (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false) ||
          (navigator as { standalone?: boolean }).standalone === true;
        if (standalone) {
          type =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
              ? "pwa-ios"
              : "pwa-android";
        }
      }
    } catch {
      type = "web";
    }
    const KEY = `schedly-client-${(user as { id?: string }).id ?? ""}`;
    const now = Date.now();
    try {
      const cached = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as {
        type: ClientType;
        at: number;
      } | null;
      if (cached?.type === type && now - cached.at < 6 * 60 * 60 * 1000) return;
      sessionStorage.setItem(KEY, JSON.stringify({ type, at: now }));
    } catch {
      // No sessionStorage (rare) — still report.
    }
    reportClientType(type).catch(() => {});
  }, [user]);
  // The design editor is immersive on mobile: no fixed header, drawer,
  // backdrop, or bottom nav covering it — the canvas fills the screen.
  const isImmersive = pathname === "/design";

  // Account settings is a full-screen page — hide the bottom nav there.
  const isSettings = pathname === "/settings";

  // Profile page turns the top-left avatar into a back arrow.
  const isProfile = pathname === "/profile";  // Admin pages are full-screen — same treatment as settings/profile.
  const isAdmin = pathname.startsWith("/admin");

  // Feedback page is opened from Settings → Support, so it goes back there too.
  const isFeedback = pathname === "/feedback";

  // Notifications page is opened from the bell icon — the avatar becomes a
  // back arrow that exits back to the dashboard.
  const isNotifications = pathname === "/notifications";

  // Close the mobile drawer on every navigation so it never stays open
  // covering a page (e.g., after coming back from the design editor).
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    setOpen(false);
  }, [pathname]);

  // Reset the scroll position on navigation so the next page starts at the
  // top instead of resuming where the previous page left off.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  // Full-screen edge-to-edge on Android: the status bar stays visible but
  // transparent, and the app adapts its safe-area padding around it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.show().catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  }, []);

  // The shell always renders: while the session loads, each page shows its
  // own skeletons instead of a full-screen loading state, so a refresh feels
  // like the cards are simply refreshing in place.
  const sidebarWrap = [
    "sidebar-slide fixed right-3 z-40 w-[304px] max-w-[calc(100vw-1.5rem)] will-change-transform",
    "top-16 max-h-[70vh] md:top-0 md:bottom-0 md:max-h-none md:right-0",
    open ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0",
  ].join(" ");

  return (
    <div
      className="relative isolate flex min-h-dvh-fallback"
      style={themeVars}
    >
      <div className={sidebarWrap} inert={!open}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      <div
        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        } ${isImmersive ? "hidden" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Avatar/back top-left — fixed to the page (stays put while content scrolls).
          On account settings, profile, admin, feedback, and notifications pages it
          becomes a back arrow. Elsewhere it's the user's avatar; tapping it opens
          the profile page. */}
      {!isImmersive && showButton && (
        <button
          type="button"
          onClick={() =>
            isSettings || isProfile
              ? router.push("/dashboard")
              : isAdmin || isFeedback || isNotifications
                ? isNotifications
                  ? router.push("/dashboard")
                  : router.push("/settings?tab=support")
                : router.push("/profile")
          }
          className={`fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex h-11 w-11 items-center justify-center transition-all duration-300 ${isSettings || isProfile || isAdmin || isFeedback || isNotifications ? "" : "hover:scale-105"}`}
          aria-label={
            isSettings || isProfile || isAdmin || isFeedback || isNotifications ? "Back" : "Open profile"
          }
        >
          {isSettings || isProfile || isAdmin || isFeedback || isNotifications ? (
            <ArrowLeft className="h-6 w-6 text-foreground" />
          ) : userAvatar ? (
            <img src={userAvatar} alt={displayName} className="h-11 w-11 rounded-full object-cover ring-2 ring-border/40" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary ring-2 ring-border/40">
              {initials}
            </div>
          )}
        </button>
      )}

      {/* Notification button — sits to the left of the sidebar menu button */}
      {!isImmersive && showButton && !isNotifications && (
        <button
          onClick={() => router.push("/notifications")}
          className="fixed right-[4.75rem] top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar/90 text-sidebar-foreground shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-colors hover:bg-sidebar"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      )}

      {/* Floating menu button — opens the sidebar drawer (top-right, same height as the logo) */}
      {!isImmersive && showButton && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar/90 text-sidebar-foreground shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-colors hover:bg-sidebar"
          aria-label="Show sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          onClick={() => setOpen(false)}
          className={[
            "flex-1 transition-transform duration-300 ease-out",
            isImmersive ? "" : "px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-28 sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+4rem)] md:pt-20 md:pb-4",
            open ? "md:-translate-x-[304px]" : "md:translate-x-0",
          ].join(" ")}
        >
          {isImmersive ? (
            <div key={pathname} className="animate-fade-up h-dvh-fallback overflow-y-auto p-0 md:p-6 md:pt-20">
              {children}
            </div>
          ) : (
            <div key={pathname} className="animate-fade-up mx-auto w-full min-w-0 max-w-5xl md:w-full">{children}</div>
          )}
        </main>
      </div>

      {!isImmersive && !isProfile && !isNotifications && !isSettings && !isAdmin && <BottomNav />}
      {!isImmersive && <OfflineBanner />}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}

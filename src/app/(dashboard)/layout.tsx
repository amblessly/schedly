"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ArrowLeft } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useThemeConfig } from "@/features/theme";
import { useAuth } from "@/features/auth/hooks/use-auth";

// The drawer's open state lives in a tiny external store so its initial
// value can come from matchMedia only AFTER hydration: the server always
// renders "open" (the desktop default), and on narrow windows the drawer
// closes itself right after hydration — with no hydration mismatch.
let openState: boolean | null = null;
const openListeners = new Set<() => void>();

function getOpenSnapshot(): boolean {
  if (openState === null) {
    openState =
      typeof window === "undefined"
        ? true
        : window.matchMedia("(min-width: 768px)").matches;
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
  const { themeVars, activeId } = useThemeConfig();
  const open = useSyncExternalStore(subscribeOpen, getOpenSnapshot, () => true);
  const showButton = !open;
  const pathname = usePathname();
  const router = useRouter();

  // First-time users are pushed through the setup flow before using the app.
  const { user, isLoading } = useAuth();
  const needsOnboarding =
    !isLoading && user && (user as { onboardingCompleted?: boolean }).onboardingCompleted === false;

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);
  // The design editor is immersive on mobile: no fixed header, drawer,
  // backdrop, or bottom nav covering it — the canvas fills the screen.
  const isImmersive = pathname === "/design" || pathname === "/widget";

  // Account settings is a full-screen page — hide the bottom nav there.
  const isSettings = pathname === "/settings";

  // Fade the top-left logo out on scroll down, back in on scroll up.
  const [logoHidden, setLogoHidden] = useState(false);
  const logoLastY = useRef(0);
  const logoTicking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (logoTicking.current) return;
      logoTicking.current = true;
      requestAnimationFrame(() => {
        logoTicking.current = false;
        const y = window.scrollY;
        const delta = y - logoLastY.current;
        if (Math.abs(delta) > 4) {
          setLogoHidden(delta > 0 && y > 80);
        }
        logoLastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // A swipe down from the very top would normally refresh the page by
  // accident. In the browser, the browser's own refresh icon shows during the
  // pull; detect the gesture here and ask before actually reloading.
  const [refreshOpen, setRefreshOpen] = useState(false);
  const pullStartY = useRef<number | null>(null);

  useEffect(() => {
    if (isImmersive) return;

    const onTouchStart = (e: TouchEvent) => {
      pullStartY.current = window.scrollY <= 0 ? (e.touches[0]?.clientY ?? null) : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null) return;
      const y = e.touches[0]?.clientY ?? 0;
      if (y - pullStartY.current > 80) {
        pullStartY.current = null;
        setRefreshOpen(true);
      }
    };
    const onTouchEnd = () => {
      pullStartY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isImmersive]);

  // Full-screen edge-to-edge on native: the status bar stays visible but
  // transparent, and the app adapts its safe-area padding around it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.show().catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: activeId === "midnight" ? Style.Light : Style.Dark }).catch(() => {});
  }, [activeId]);

  // Never show the dashboard until we know who the user is: while the
  // session is loading, or when the user hasn't finished onboarding, show a
  // blank loading screen instead of flashing the dashboard behind it.
  if (isLoading || needsOnboarding) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const sidebarWrap = [
    "sidebar-slide fixed right-3 z-40 w-[304px] max-w-[calc(100vw-1.5rem)] will-change-transform",
    "top-16 max-h-[70vh] md:top-0 md:bottom-0 md:max-h-none md:right-0",
    open ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0",
  ].join(" ");

  return (
    <div
      className="relative isolate flex min-h-dvh-fallback"
      style={{
        ...themeVars,
        backgroundColor: "#fff",
        backgroundImage: "radial-gradient(circle at top center, color-mix(in srgb, var(--primary) 50%, transparent), transparent 70%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {/* Theme-colored wash behind the status bar (edge-to-edge overlay) */}
      {!isImmersive && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-24"
          style={{
            background:
              "linear-gradient(to bottom, var(--primary) 0%, color-mix(in srgb, var(--primary) 45%, transparent) 32px, transparent 88px)",
          }}
        />
      )}

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

      {/* Logo/back top-left — fixed to the page (stays put while content scrolls).
          On account settings it becomes a back arrow that returns to the dashboard. */}
      {!isImmersive && showButton && (
        <button
          type="button"
          onClick={() => (isSettings ? router.push("/dashboard") : window.location.reload())}
          className={`fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-card/90 shadow-[0_8px_40px_rgba(0,0,0,0.1)] transition-all duration-300 ${isSettings || logoHidden ? "" : "hover:scale-105"} ${logoHidden ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"}`}
          aria-label={isSettings ? "Back to dashboard" : "Refresh page"}
        >
          {isSettings ? (
            <ArrowLeft className="h-5 w-5" />
          ) : (
            <img src="/images/logo.jpg" alt="Schedly" className="h-9 w-9 rounded-xl object-cover" />
          )}
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

      <div className="flex flex-1 flex-col">
        <main
          onClick={() => setOpen(false)}
          className={[
            "flex-1 transition-transform duration-300 ease-out",
            isImmersive ? "" : "px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-28 sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+4rem)] md:pt-20 md:pb-4",
            open ? "md:-translate-x-[304px]" : "md:translate-x-0",
          ].join(" ")}
        >
          {isImmersive ? (
            <div className="animate-fade-up h-dvh-fallback overflow-y-auto p-0 md:p-6 md:pt-20">
              {children}
            </div>
          ) : (
            <div className="animate-fade-up mx-auto w-full max-w-3xl md:w-full">{children}</div>
          )}
        </main>
      </div>

      {!isImmersive && !isSettings && <BottomNav />}

      <Dialog open={refreshOpen} onOpenChange={setRefreshOpen}>
        <DialogContent className="max-w-[300px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Refresh this page?</DialogTitle>
            <DialogDescription>
              Refreshing reloads Schedly from the start. Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefreshOpen(false)}>
              No, stay here
            </Button>
            <Button onClick={() => window.location.reload()}>Yes, refresh</Button>
          </div>
        </DialogContent>
      </Dialog>
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

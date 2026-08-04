"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
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
  const { themeVars } = useThemeConfig();
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
    const el = document.querySelector("main");
    if (!el) return;

    const onScroll = () => {
      if (logoTicking.current) return;
      logoTicking.current = true;
      requestAnimationFrame(() => {
        logoTicking.current = false;
        const y = el.scrollTop;
        const delta = y - logoLastY.current;
        if (Math.abs(delta) > 4) {
          setLogoHidden(delta > 0 && y > 80);
        }
        logoLastY.current = y;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on every navigation so it never stays open
  // covering a page (e.g., after coming back from the design editor).
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    setOpen(false);
  }, [pathname]);

  // Reset the scroll container on navigation so the next page starts at the
  // top instead of resuming where the previous page left off.
  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  if (needsOnboarding) {
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
      className="relative flex h-dvh-fallback overflow-hidden"
      style={{
        ...themeVars,
        backgroundColor: "#fff",
        backgroundImage: "radial-gradient(circle at top center, color-mix(in srgb, var(--primary) 50%, transparent), transparent 70%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
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

      {/* Logo top-left — fixed to the page (stays put while content scrolls) */}
      {!isImmersive && showButton && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-card/90 shadow-[0_8px_40px_rgba(0,0,0,0.1)] transition-all duration-300 ${logoHidden ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"}`}
          aria-label="Refresh page"
        >
          <img src="/images/logo.jpg" alt="Schedly" className="h-9 w-9 rounded-xl object-cover" />
        </button>
      )}

      {/* Floating menu button — opens the sidebar drawer (top-right, same height as the logo) */}
      {!isImmersive && showButton && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar/90 text-sidebar-foreground shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-colors hover:bg-sidebar"
          aria-label="Show sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <main
          onClick={() => setOpen(false)}
          className={[
            "flex-1 touch-pan-y overflow-x-hidden overscroll-x-none",
            isImmersive
              ? "overflow-y-auto p-0 md:p-6 md:pt-20"
              : isSettings
                ? "overflow-y-auto p-4 pt-16 pb-8 sm:p-6 sm:pt-16 md:pt-20 md:pb-4"
                : "overflow-y-auto p-4 pt-16 pb-28 sm:p-6 sm:pt-16 md:pt-20 md:pb-4",
            "transition-transform duration-300 ease-out",
            open ? "md:-translate-x-[304px]" : "md:translate-x-0",
          ].join(" ")}
        >
          {isImmersive ? (
            <>{children}</>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-3xl md:w-full">
              <div className="m-auto w-full">{children}</div>
            </div>
          )}
        </main>
      </div>

      {!isImmersive && !isSettings && <BottomNav />}
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

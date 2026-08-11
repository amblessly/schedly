"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Download, X, Share, Home, Check, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "schedly-install-dismissed";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/* True when the page is already running as an installed app — either a
 * standalone PWA (launched from home screen) or the Capacitor app. */
function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false) ||
    (navigator as { standalone?: boolean }).standalone === true ||
    Capacitor.isNativePlatform()
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [ios, setIos] = useState(false);
  const reloadedOnce = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    // The onboarding flow has its own "Add to home screen" step, so the
    // global install sheet should not compete with it.
    if (pathname?.startsWith("/onboarding")) return;

    // Already running as an installed app — nothing to install, never show.
    if (isStandaloneApp()) return;

    // Register the service worker so the PWA is installable (Chrome/Edge)
    // and the app shell is cached for offline use. Registered on every mount
    // so already-installed PWAs also pick up SW updates (cache v2).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Show the install sheet immediately when the browser is ready.
      if (!localStorage.getItem(DISMISS_KEY)) setVisible(true);
    };
    const onInstalled = () => {
      // Permanently remember the install so the prompt never returns.
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Show the prompt on every visit until the user actually installs the
    // app. "Not now" only hides it for the current session.
    const timer = setTimeout(() => {
      if (!localStorage.getItem(DISMISS_KEY)) {
        setIos(isIOS());
        setVisible(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, [pathname]);

  if (pathname?.startsWith("/onboarding")) return null;
  if (isStandaloneApp()) return null;

  const dismiss = () => {
    // Session-only dismiss: the prompt returns on the next visit until the
    // app is actually installed (see appinstalled handler above).
    setVisible(false);
  };

  const handleInstall = async () => {
    // Install prompt available -> install directly.
    if (deferred) {
      setInstalling(true);
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setInstalling(false);
      if (choice.outcome === "accepted") {
        localStorage.setItem(DISMISS_KEY, "1");
      }
      setVisible(false);
      return;
    }

    // No prompt yet: the service worker may not be controlling this page yet
    // (a fresh visit). Reload once to activate it — the browser then considers
    // the site installable and the "Install" button works on the next tap.
    if (!reloadedOnce.current) {
      reloadedOnce.current = true;
      try {
        await navigator.serviceWorker.ready;
      } catch {
        // Ignore — reload anyway.
      }
      window.location.reload();
      return;
    }

    // After the reload the browser still can't install (e.g. Firefox) —
    // fall back to manual instructions.
    setShowFallback(true);
  };

  if (!visible) return null;

  const isSheet = !ios && !showFallback;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden
      />

      {isSheet ? (
        /* ===== Install sheet (Android / desktop Chrome, Edge) ===== */
        <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border border-border/70 bg-card p-6 pb-[calc(1.25rem+var(--sab))] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
            Install Schedly
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Get the full app experience — install Schedly on your device for a
            dedicated icon, faster startup, and offline access.
          </p>

          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)] active:scale-[0.97] disabled:opacity-60"
          >
            <Download className="h-5 w-5" />
            {installing ? "Installing..." : "Install App"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2.5 h-10 w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Not now
          </button>
        </div>
      ) : (
        /* ===== Instructions dialog (iPhone / unsupported browsers) ===== */
        <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border border-border/70 bg-card p-6 pb-[calc(1.25rem+var(--sab))] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
            {ios ? "Install Schedly on your iPhone" : "Install Schedly"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {ios
              ? "Add Schedly to your Home Screen so it works just like a native app — one tap to open, no browser tabs."
              : "Your browser doesn't offer one-tap install. Create a shortcut manually instead."}
          </p>

          <div className="mt-5 space-y-3">
            {ios ? (
              <>
                <Step
                  icon={<Share className="h-4 w-4" />}
                  text="Tap the Share button in your browser."
                />
                <Step
                  icon={<Home className="h-4 w-4" />}
                  text="Scroll down and tap &quot;Add to Home Screen&quot;."
                />
                <Step
                  icon={<Check className="h-4 w-4" />}
                  text="Tap &quot;Add&quot; in the top-right corner. Done!"
                />
              </>
            ) : (
              <Step
                icon={<Download className="h-4 w-4" />}
                text="Use your browser&apos;s menu and choose &quot;Install app&quot; or &quot;Add to Home Screen&quot;."
              />
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)] active:scale-[0.97]"
          >
            Got it
          </button>
        </div>
      )}
    </>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      <p className="text-sm font-medium leading-snug text-foreground">{text}</p>
    </div>
  );
}

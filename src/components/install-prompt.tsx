"use client";

import { useEffect, useState } from "react";
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

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || isStandalone()) return;

    // Register the service worker so the PWA is installable (Chrome/Edge).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

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
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } else {
      setVisible(false);
    }
  };

  if (!visible || installed) return null;

  const showSteps = ios || !deferred;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden
      />

      {showSteps ? (
        /* ===== Instructions dialog (iPhone / browsers without install prompt) ===== */
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
              : "Create a shortcut to Schedly on your device so it opens like a native app."}
          </p>

          <div className="mt-5 space-y-3">
            {ios ? (
              <>
                <Step
                  icon={<Share className="h-4 w-4" />}
                  text='Tap the Share button in your browser.'
                />
                <Step
                  icon={<Home className="h-4 w-4" />}
                  text='Scroll down and tap "Add to Home Screen".'
                />
                <Step
                  icon={<Check className="h-4 w-4" />}
                  text='Tap "Add" in the top-right corner. Done!'
                />
              </>
            ) : (
              <Step
                icon={<Download className="h-4 w-4" />}
                text={"Use your browser's menu and choose \"Install app\" or \"Add to Home Screen\"."}
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
      ) : (
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
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.35)] active:scale-[0.97]"
          >
            <Download className="h-5 w-5" />
            Install App
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2.5 h-10 w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Not now
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

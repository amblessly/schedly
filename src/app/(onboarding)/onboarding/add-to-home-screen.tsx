"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Home, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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

export function AddToHomeScreenCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [ios, setIos] = useState(false);
  const reloadedOnce = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (isStandalone()) setInstalled(true);
      setIos(isIOS());
    }, 0);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleAdd = async () => {
    if (deferred) {
      setInstalling(true);
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setInstalling(false);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }

    if (!reloadedOnce.current) {
      reloadedOnce.current = true;
      try {
        await navigator.serviceWorker.ready;
      } catch {
        /* ignore — reload anyway */
      }
      window.location.reload();
      return;
    }

    setShowInstructions(true);
  };

  if (installed) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-600">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Schedly is on your home screen</p>
          <p className="text-xs text-muted-foreground">Tap the icon anytime to open the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Add Schedly to your home screen</p>
            <p className="text-xs text-muted-foreground">
              Open it like a real app with one tap — no browser needed.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={handleAdd} disabled={installing} className="w-full h-11 font-medium">
        <Download className="h-4 w-4" />
        {installing ? "Adding..." : "Add to home screen"}
      </Button>

      {showInstructions && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-3.5">
          {ios ? (
            <>
              <Step icon={<Share className="h-4 w-4" />} text="Tap the Share button in your browser." />
              <Step icon={<Home className="h-4 w-4" />} text="Scroll down and tap “Add to Home Screen”." />
              <Step icon={<Check className="h-4 w-4" />} text="Tap “Add” in the top-right corner." />
            </>
          ) : (
            <Step
              icon={<Download className="h-4 w-4" />}
              text="Use your browser’s menu and choose “Install app” or “Add to Home Screen”."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
        {icon}
      </span>
      <p className="text-sm font-medium leading-snug text-foreground">{text}</p>
    </div>
  );
}
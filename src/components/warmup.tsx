"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { warmup } from "@/lib/warmup";

export function Warmup() {
  useEffect(() => {
    warmup();
    // The native app has no browser chrome, so keep overscroll contained there
    // to avoid rubber-banding/edge-glow. In the browser, overscroll is left
    // enabled so the browser's own refresh icon appears when pulling down.
    const isNative = Capacitor.isNativePlatform();
    document.documentElement.classList.toggle("is-native", isNative);

    // viewport-fit=cover makes env(safe-area-inset-bottom) report the home
    // indicator inset even in a plain browser tab, where the browser's own
    // toolbar already covers it — that inflated the floating bottom nav and
    // other fixed UI. Only keep the insets where they're real: the PWA shell
    // (display-mode: standalone) and the native app.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    if (!isNative && !isStandalone) {
      const root = document.documentElement;
      root.style.setProperty("--sat", "0px");
      root.style.setProperty("--sar", "0px");
      root.style.setProperty("--sab", "0px");
      root.style.setProperty("--sal", "0px");
    }
  }, []);
  return null;
}

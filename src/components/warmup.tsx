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
    document.documentElement.classList.toggle(
      "is-native",
      Capacitor.isNativePlatform()
    );
  }, []);
  return null;
}

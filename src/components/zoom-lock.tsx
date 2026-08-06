"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Locks the page's visual scale to the 90% browser-zoom look, no matter what
// zoom level the user is currently on. In Chromium the browser zoom can be
// read from the `outerWidth / innerWidth` ratio (outerWidth stays fixed while
// innerWidth scales with zoom), so we apply the inverse as the CSS `zoom`
// property to cancel it out: actual = browserZoom * counter == TARGET_ZOOM.
// The native Android WebView never reports a zoom change, so it is skipped.
const TARGET_ZOOM = 0.9;

export function ZoomLock() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const apply = () => {
      const zoom =
        window.outerWidth && window.innerWidth
          ? window.outerWidth / window.innerWidth
          : 1;
      let counter = TARGET_ZOOM / Math.max(0.1, zoom);
      counter = Math.min(1.5, Math.max(0.5, counter));
      const next = Math.abs(counter - 1) < 0.001 ? "" : counter.toFixed(4);
      const html = document.documentElement;
      if (html.style.zoom !== next) html.style.zoom = next;
    };

    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.documentElement.style.zoom = "";
    };
  }, []);

  return null;
}
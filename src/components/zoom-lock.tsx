"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";

// Locks the page's visual scale to the 90% browser-zoom look, no matter what
// zoom level the user is currently on. In Chromium the browser zoom can be
// read from the `outerWidth / innerWidth` ratio (outerWidth stays fixed while
// innerWidth scales with zoom), so we apply the inverse as the CSS `zoom`
// property to cancel it out: actual = browserZoom * counter == TARGET_ZOOM.
// The native Android WebView never reports a zoom change, so it is skipped.
const TARGET_ZOOM = 0.9;

// The landing/onboarding flow should always render at a natural 100% scale —
// the small screen already fills the viewport, so the 90% zoom-lock is only
// for the in-app screens (dashboard, settings, etc.).
const NO_ZOOM_PATHS = ["/"];

export function ZoomLock() {
  const pathname = usePathname();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    // Onboarding stays at natural scale: clear any zoom applied on a previous
    // route and avoid attaching the zoom/scroll handlers.
    if (NO_ZOOM_PATHS.includes(pathname ?? "")) {
      document.documentElement.style.zoom = "";
      return;
    }

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

    // Block pinch/multi-touch page zoom on mobile WebViews that ignore the
    // viewport meta, and ctrl+wheel / ctrl+plus-minus zoom on desktop — the
    // ZoomLock math already re-corrects visual scale on resize, so user zoom
    // is disabled entirely.
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const preventKeyZoom = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", preventWheelZoom, { passive: false });
    document.addEventListener("keydown", preventKeyZoom);

    return () => {
      window.removeEventListener("resize", apply);
      document.removeEventListener("wheel", preventWheelZoom);
      document.removeEventListener("keydown", preventKeyZoom);
      if (document.documentElement.style.zoom !== "") {
        document.documentElement.style.zoom = "";
      }
    };
  }, [pathname]);

  return null;
}
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/config/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BellRing,
  Timer,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  calendar: Calendar,
  "check-square": CheckSquare,
  "bell-ring": BellRing,
  timer: Timer,
};

export function BottomNav() {
  const pathname = usePathname();
  const items = primaryNav;

  // Auto-hide on scroll down, reappear on scroll up (mobile only).
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) > 4) {
          setHidden(delta > 0 && y > 80);
        }
        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-300 ease-out md:hidden",
        hidden
          ? "pointer-events-none translate-y-[calc(100%+0.5rem)] opacity-0"
          : "translate-y-0 opacity-100"
      )}
      style={{ paddingBottom: "calc(1rem + var(--sab))" }}
    >
      <div className="bottom-nav flex items-center justify-center gap-1 rounded-full border border-border/70 bg-card/95 px-16 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || Calendar;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/config/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BellRing,
  Timer,
  Camera,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  calendar: Calendar,
  "check-square": CheckSquare,
  "bell-ring": BellRing,
  timer: Timer,
};

/** Where the center "camera" button should take the user, per page. */
const QUICK_ADD_TARGETS = [
  { match: "/todo", href: "/todo?focus=1" },
  { match: "/schedule", href: "/schedule?add=1" },
];
const DEFAULT_ADD = "/schedule?add=1";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const items = primaryNav;

  // Auto-hide on scroll down, reappear on scroll up (mobile only).
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  // The /schedule page reports which sub-screen it's on ("list", "upload"…)
  // so the Calendar tab only lights up on the actual list, not upload/review.
  const [schedulePhase, setSchedulePhase] = useState<string>("list");
  useEffect(() => {
    const onPhase = (e: Event) => setSchedulePhase((e as CustomEvent<string>).detail);
    window.addEventListener("schedly:schedule-phase", onPhase);
    return () => window.removeEventListener("schedly:schedule-phase", onPhase);
  }, []);

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

  const handleQuickAdd = () => {
    let target: string | null = null;
    for (const t of QUICK_ADD_TARGETS) {
      if (pathname.startsWith(t.match)) {
        target = t.href;
        break;
      }
    }
    if (!target) target = DEFAULT_ADD;
    if (target.split("?")[0] === pathname) {
      // Already on the right page — tell it to open the add flow.
      window.dispatchEvent(new CustomEvent("schedly:quickadd"));
    } else {
      router.push(target);
    }
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-300 ease-out md:hidden",
        hidden
          ? "pointer-events-none translate-y-[calc(100%+0.5rem)] opacity-0"
          : "translate-y-0 opacity-100"
      )}
    >
<div
        className="bottom-nav flex items-end justify-center gap-2.5 rounded-full border border-border/60 bg-card/90 px-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.03] backdrop-blur-xl"
        style={{ paddingBottom: "calc(0.75rem + var(--sab))", marginBottom: "calc(0.75rem + var(--sab))" }}
      >
        {items.slice(0, 2).map((item) => {
          const Icon = iconMap[item.icon] || Calendar;
          const noCalendarGlow = item.href === "/schedule";
          const isUploadPhase = schedulePhase !== "list";
          const active =
            (!(noCalendarGlow && isUploadPhase)) &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-8 w-8" strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label="Quick add"
          title="Quick add"
          className="relative -mt-6 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-transform active:scale-95"
        >
          <Camera className="h-7 w-7" strokeWidth={2.5} />
        </button>

        {items.slice(2).map((item) => {
          const Icon = iconMap[item.icon] || Calendar;
          const noCalendarGlow = item.href === "/schedule";
          const isUploadPhase = schedulePhase !== "list";
          const active =
            (!(noCalendarGlow && isUploadPhase)) &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-8 w-8" strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
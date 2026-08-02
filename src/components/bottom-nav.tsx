"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/config/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BellRing,
  Timer,
} from "lucide-react";
import Dock from "@/components/Dock";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  "layout-dashboard": LayoutDashboard,
  calendar: Calendar,
  "check-square": CheckSquare,
  "bell-ring": BellRing,
  timer: Timer,
};

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const items = primaryNav;

  // Auto-hide on scroll down, reappear on scroll up (mobile only).
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const el = document.querySelector("main");
    if (!el) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        const y = el.scrollTop;
        const delta = y - lastY.current;
        if (Math.abs(delta) > 4) {
          setHidden(delta > 0 && y > 80);
        }
        lastY.current = y;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const dockItems = items.map((item) => {
    const Icon = iconMap[item.icon] || Calendar;
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return {
      icon: (
        <Icon
          size={18}
          className={active ? "text-primary" : "text-muted-foreground"}
        />
      ),
      label: item.label.split(" ")[0] ?? "",
      onClick: () => router.push(item.href),
      className: active ? "dock-item-active" : undefined,
    };
  });

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-300 ease-out md:hidden",
        hidden
          ? "pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0"
          : "translate-y-0 opacity-100"
      )}
      style={{ paddingBottom: "calc(0.5rem + var(--sab))" }}
    >
      <Dock
        items={dockItems}
        panelHeight={30}
        baseItemSize={40}
        magnification={70}
        dockHeight={200}
      />
    </div>
  );
}

"use client";

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

const ADD_PAGE = "/capture";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const items = primaryNav;

  const handleQuickAdd = () => {
    if (pathname === ADD_PAGE) {
      window.dispatchEvent(new CustomEvent("schedly:quickadd"));
    } else {
      router.push(ADD_PAGE);
    }
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 md:hidden"
    >
      <div
        className="bottom-nav flex items-end justify-center gap-2 rounded-[1.75rem] border-2 border-foreground/70 bg-card/90 px-3 shadow-[4px_4px_0_0_#401f32] ring-1 ring-black/[0.03] backdrop-blur-xl"
        style={{ paddingBottom: "calc(0.75rem + var(--sab))", marginBottom: "calc(1.25rem + var(--sab))" }}
      >
        {items.slice(0, 2).map((item) => {
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
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-7 w-7 translate-y-1.5" strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label="Quick add"
          title="Quick add"
          className="relative -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-foreground/80 bg-primary text-primary-foreground transition-transform active:scale-95"
        >
          <Camera className="h-6 w-6 -translate-y-0.5" strokeWidth={2.5} />
        </button>

        {items.slice(2).map((item) => {
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
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-7 w-7 translate-y-1.5" strokeWidth={active ? 2 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

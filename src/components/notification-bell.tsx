"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { getUnreadNotificationCount } from "@/app/(dashboard)/notifications/actions";

const POLL_INTERVAL = 30_000;

/** Bell icon with a live unread-count badge. Sits next to the sidebar menu
 *  button. Polls the unread count every 30s, refreshes on window focus, and
 *  refreshes again on every navigation (e.g. returning from the Notifications
 *  page right after marking reads). */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      if (!mounted.current) return;
      getUnreadNotificationCount()
        .then((n) => {
          if (mounted.current) setUnread(n);
        })
        .catch(() => {});
    };

    refresh();
    const id = setInterval(refresh, POLL_INTERVAL);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <button
      onClick={() => router.push("/notifications")}
      className="fixed right-[4.75rem] top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar/90 text-sidebar-foreground shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-colors hover:bg-sidebar"
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground ring-2 ring-background">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

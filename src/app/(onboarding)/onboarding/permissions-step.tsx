"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  isPushSupported,
  enablePush,
  pushUnsupportedReasons,
  isIosPwa,
} from "@/lib/push";
import { getPermissionState, updatePermissionState } from "./actions";

const DEFAULT_TIMEZONE = "Asia/Manila";

type NotifState = "loading" | "off" | "requesting" | "granted" | "denied" | "unsupported";
type LocState = "loading" | "off" | "requesting" | "granted" | "denied" | "unsupported";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function deniedNotifMsg(): string {
  return isIosPwa()
    ? "Notifications are blocked. Enable them in iOS Settings → Schedly → Notifications."
    : "Notifications are blocked in your browser settings. Allow Schedly there, then try again.";
}

function deniedLocMsg(): string {
  return isIosPwa()
    ? "Location is blocked. Enable it in iOS Settings → Schedly → Location."
    : "Location is blocked. Allow Schedly to access your location in your browser or device settings, then try again.";
}

async function geolocationPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unsupported";
  try {
    const p = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return p.state;
  } catch {
    return "prompt";
  }
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-muted"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-transform duration-200">
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

export function PermissionsStep({
  mode,
  onComplete,
  finishing,
  buttonLabel,
}: {
  mode: "notifications" | "location";
  onComplete: () => void;
  finishing: boolean;
  buttonLabel: string;
}) {
  const [notif, setNotif] = useState<NotifState>("loading");
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocState>("loading");
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  const ready = mode === "notifications" ? notif === "granted" : loc === "granted";

  useEffect(() => {
    let active = true;

    // Deferred so we never set state synchronously inside the effect body.
    const t = setTimeout(() => {
      const tz = detectTimezone();
      setTimezone(tz);

      // Reflect the REAL browser notification state (never trust the DB alone).
      if (!isPushSupported()) {
        setNotif("unsupported");
        setNotifMsg(pushUnsupportedReasons().join(" · "));
      } else if (Notification.permission === "granted") {
        setNotif("granted");
      } else if (Notification.permission === "denied") {
        setNotif("denied");
        setNotifMsg(deniedNotifMsg());
      } else {
        setNotif("off");
      }

      // Reflect the REAL geolocation state via the Permissions API.
      geolocationPermission().then((state) => {
        if (!active) return;
        if (state === "granted") {
          setLoc("granted");
          updatePermissionState({ locationEnabled: true, timezone: tz }).catch(() => {});
        } else if (state === "denied") {
          setLoc("denied");
          setLocMsg(deniedLocMsg());
        } else if (state === "unsupported") {
          setLoc("unsupported");
          setLocMsg("Location isn't supported on this browser.");
        } else {
          setLoc("off");
        }
      });

      // Restore persisted prefs (timezone + sync the DB with real state). When
      // notification permission is already granted, subscribe this device so
      // reminders arrive without any extra prompt.
      getPermissionState()
        .then((s) => {
          if (!active) return;
          if (s?.timezone && s.timezone !== "UTC") setTimezone(s.timezone);
          if (isPushSupported() && Notification.permission === "granted") {
            if (s?.notificationsEnabled !== true) {
              updatePermissionState({ notificationsEnabled: true, timezone: tz }).catch(() => {});
            }
            enablePush().catch(() => {});
          }
        })
        .catch(() => {});
    }, 0);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, []);

  const handleNotifications = async () => {
    if (notif === "requesting" || notif === "granted") return;
    setNotifMsg(null);
    if (!isPushSupported()) {
      setNotif("unsupported");
      setNotifMsg(pushUnsupportedReasons().join(" · "));
      return;
    }
    setNotif("requesting");
    const result = await enablePush();
    if (result.ok || Notification.permission === "granted") {
      setNotif("granted");
      updatePermissionState({ notificationsEnabled: true, timezone }).catch(() => {});
      if (!result.ok) {
        setNotifMsg("Notification permission is on, but background alerts couldn't be set up on this browser.");
      }
    } else {
      setNotif(result.code === "PUSH_NOT_SUPPORTED" ? "unsupported" : "denied");
      setNotifMsg(result.reason);
    }
  };

  const handleLocation = () => {
    if (loc === "requesting" || loc === "granted") return;
    setLocMsg(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLoc("unsupported");
      setLocMsg("Location isn't supported on this browser.");
      return;
    }
    setLoc("requesting");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLoc("granted");
        updatePermissionState({ locationEnabled: true, timezone }).catch(() => {});
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLoc("denied");
          setLocMsg(deniedLocMsg());
        } else {
          setLoc("off");
          setLocMsg("Couldn't get your location. Check your connection and try again.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const permissionRow = (icon: React.ReactNode, title: string, description: string, extra: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {extra}
    </div>
  );

  return (
    <div className="space-y-4">
      {mode === "notifications" ? (
        <>
          {permissionRow(
            <BellRing className="h-5 w-5" />,
            "Allow notifications",
            "You’ll get reminders about your classes.",
            <Toggle
              checked={notif === "granted"}
              onChange={handleNotifications}
              disabled={notif === "requesting" || notif === "unsupported"}
              label="Allow notifications"
            />
          )}
          {notifMsg && (
            <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {notifMsg}
            </p>
          )}
          {notif === "requesting" ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size={14} color="var(--muted-foreground)" />
              Waiting for permission…
            </p>
          ) : null}
        </>
      ) : (
        <>
          {permissionRow(
            <MapPin className="h-5 w-5" />,
            "Allow location",
            "We’ll use your location to provide weather information for your schedule.",
            <Toggle
              checked={loc === "granted"}
              onChange={handleLocation}
              disabled={loc === "requesting" || loc === "unsupported"}
              label="Allow location"
            />
          )}
          {locMsg && (
            <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {locMsg}
            </p>
          )}
          {loc === "requesting" ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size={14} color="var(--muted-foreground)" />
              Waiting for permission…
            </p>
          ) : null}
        </>
      )}

      <Button className="mt-2 h-12 w-full font-semibold" disabled={!ready || finishing} onClick={onComplete}>
        {finishing ? "Finishing up..." : buttonLabel}
      </Button>
      {!ready && (
        <p className="text-center text-xs text-muted-foreground">
          {mode === "notifications"
            ? "Allow notifications to continue."
            : "Allow location to continue."}
        </p>
      )}
    </div>
  );
}

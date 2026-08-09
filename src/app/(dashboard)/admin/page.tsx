"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getUsers, toggleAdminRole, sendBroadcastNotification } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Megaphone, Loader2, LayoutDashboard, Users, Radio, type LucideIcon } from "lucide-react";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  isAdmin: boolean;
  emailVerified: boolean;
  clientType: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
};

export default function AdminPage() {
  const [stats, setStats] = useState<{
    users: number;
    schedules: number;
    uploads: number;
    feedback: number;
  } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const { user } = useAuth();
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, u] = await Promise.all([getAdminStats(), getUsers()]);
        setStats(s);
        setUsers(u as AdminUser[]);
      } catch {
        window.location.href = "/login";
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(userId: string) {
    setConfirmId(userId);
    setConfirmPassword("");
    setConfirmError("");
  }

  async function confirmToggle() {
    if (!confirmId) return;
    setTogglingId(confirmId);
    setConfirmId(null);
    try {
      const updated = await toggleAdminRole(confirmId, confirmPassword);
      setUsers((prev) =>
        prev.map((u) => (u.id === confirmId ? { ...u, isAdmin: updated.isAdmin } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
    setTogglingId(null);
  }

  async function handleBroadcast(targetUserId?: string) {
    if (broadcasting) return;
    if (!broadcastMessage.trim()) {
      toast.error("Enter a message first.");
      return;
    }
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await sendBroadcastNotification({
        title: broadcastTitle.trim() || undefined,
        message: broadcastMessage.trim(),
        targetUserId,
      });
      const scope = targetUserId ? "self (test)" : `${res.users} users`;
      const fcm = res.fcmConfigured
        ? `FCM push delivered: ${res.fcmSent}`
        : "FCM push NOT configured on server";
      const vapid = res.vapidConfigured
        ? `web push delivered: ${res.legacySent}`
        : "web push not configured";
      setBroadcastResult(
        `Sent to ${scope}. In-app: ${res.users} notification(s). ${fcm}; ${vapid}.`
      );
      toast.success("Notification sent.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send notification.";
      toast.error(msg);
      setBroadcastResult(null);
    }
    setBroadcasting(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-5 pb-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent>
            <div className="hidden sm:block space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-7 w-20 ml-auto" />
                </div>
              ))}
            </div>
            <div className="sm:hidden space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage users, monitor activity, and broadcast updates.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader
          icon={LayoutDashboard}
          title="Overview"
          description="Platform activity at a glance"
        />
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Schedules" value={stats.schedules} />
            <StatCard label="Uploads" value={stats.uploads} />
            <StatCard label="Feedback" value={stats.feedback} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={Radio}
          title="Broadcast"
          description="Send a push notification to all users — or just yourself to test"
        />
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Send Notification</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Shows in every user&rsquo;s Notifications tab. A push alert is
              also sent when the server&rsquo;s FCM keys are set and the device
              has notifications enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title (optional) — e.g. New update!"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              maxLength={100}
              disabled={broadcasting}
            />
            <Textarea
              placeholder="Message — e.g. Schedly v1.3 is out with bug fixes. Check it out!"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              maxLength={500}
              disabled={broadcasting}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => handleBroadcast()}
                disabled={broadcasting}
              >
                {broadcasting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="mr-1.5 h-4 w-4" />
                )}
                Send to all users
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBroadcast((user as { id?: string } | null)?.id)}
                disabled={broadcasting}
              >
                Send to myself (test)
              </Button>
            </div>
            {broadcastResult && (
              <p className="text-sm text-muted-foreground">{broadcastResult}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={Users}
          title="User Management"
          description="Roles, devices, and account access"
        />
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="max-h-[360px] overflow-y-auto pr-1">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Username</th>
                  <th className="pb-3 pr-4">Device</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {users.slice(0, visibleCount).map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">@{user.username}</td>
                    <td className="py-3 pr-4">
                      <DeviceBadge clientType={user.clientType} lastSeenAt={user.lastSeenAt} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <RoleBadge isAdmin={user.isAdmin} />
                    </td>
                    <td className="py-3 text-right">
                      <ToggleAdminButton user={user} togglingId={togglingId} onToggle={handleToggle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {users.slice(0, visibleCount).map((user) => (
              <div key={user.id} className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm">
                    {user.firstName} {user.lastName}
                  </p>
                  <RoleBadge isAdmin={user.isAdmin} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                <div className="flex items-center justify-between pt-1">
                  <DeviceBadge clientType={user.clientType} lastSeenAt={user.lastSeenAt} />
                  <p className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <ToggleAdminButton user={user} togglingId={togglingId} onToggle={handleToggle} />
                </div>
              </div>
            ))}
          </div>
          </div>

          {visibleCount < users.length && (
            <div className="flex shrink-0 justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + 5)}
              >
                Load more ({users.length - visibleCount} left)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </section>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Confirm your password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Re-enter your password to authorize this admin action.
            </p>
            <Input
              type="password"
              autoFocus
              placeholder="Your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(""); }}
              onKeyDown={(e) => e.key === "Enter" && confirmToggle()}
              className="mt-4 h-11"
            />
            {confirmError && (
              <p className="mt-2 text-xs text-destructive">{confirmError}</p>
            )}
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button className="flex-1 h-11" onClick={confirmToggle} disabled={!confirmPassword}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-5 pb-4 text-center">
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isAdmin
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function DeviceBadge({
  clientType,
  lastSeenAt,
}: {
  clientType: string | null;
  lastSeenAt: Date | null;
}) {
  const config: Record<string, { label: string; cls: string; icon: string }> = {
    web: { label: "Website", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: "🌐" },
    "pwa-android": { label: "PWA · Android", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: "🤖" },
    "pwa-ios": { label: "PWA · iOS", cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", icon: "🍎" },
    apk: { label: "Android App (APK)", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: "📲" },
  };
  const c = config[clientType ?? ""];

  return (
    <span className="inline-flex items-center gap-2">
      {c ? (
        <span
          title={
            lastSeenAt
              ? `Last active: ${new Date(lastSeenAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Never reported"
          }
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}
        >
          <span aria-hidden>{c.icon}</span>
          {c.label}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          Unknown
        </span>
      )}
    </span>
  );
}

function ToggleAdminButton({
  user,
  togglingId,
  onToggle,
}: {
  user: AdminUser;
  togglingId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      disabled={togglingId === user.id}
      onClick={() => onToggle(user.id)}
    >
      {togglingId === user.id
        ? "Updating..."
        : user.isAdmin
          ? "Remove Admin"
          : "Make Admin"}
    </Button>
  );
}

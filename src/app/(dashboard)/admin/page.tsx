"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getUsers, getFeedbacks, toggleAdminRole, sendBroadcastNotification, sendThankYouNotification, getLimitsStatsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { FloatingLabelTextarea } from "@/components/ui/floating-label-textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Skeleton as BoneSkeleton } from "boneyard-js/react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Megaphone, LayoutDashboard, Users, Radio, Globe, Smartphone, Apple, MessageSquare, Send, Search, Gauge, AlertTriangle, CheckCircle, type LucideIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { HeaderBack } from "@/components/header-back";
import { NotificationBell } from "@/components/notification-bell";
import { friendlyError } from "@/server/lib/friendly-error";
import { cn } from "@/lib/utils";

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

type FeedbackWithUser = {
  id: string;
  userId: string;
  email: string | null;
  type: string;
  subject: string | null;
  message: string;
  page: string | null;
  status: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
};

type LimitsStat = {
  id: string;
  name: string;
  description: string;
  usage: number;
  limit: number;
  bytesUsed?: number;
  bytesLimit?: number;
  unit: "requests" | "transactions" | "bandwidth";
  color: "ok" | "warn" | "critical";
  realtime?: {
    usage: number;
    limit: number | null;
    reset: string | null;
    remaining: number | null;
    isFreeTier: boolean;
    label: string;
  };
};

export default function AdminPage() {
  const [stats, setStats] = useState<{
    users: number;
    schedules: number;
    uploads: number;
    feedback: number;
  } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackWithUser[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [thankingId, setThankingId] = useState<string | null>(null);
  const [feedbackQuery, setFeedbackQuery] = useState("");
  const [feedbackType, setFeedbackType] = useState<"all" | "bug" | "feedback" | "question">("all");
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
  const [activeTab, setActiveTab] = useState("overview");
  const [limitsStats, setLimitsStats] = useState<LimitsStat[] | null>(null);
  const [limitsDate, setLimitsDate] = useState("");
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function loadLimits(background = false) {
    if (!background) setLimitsLoading(true);
    try {
      const res = await getLimitsStatsAction();
      setLimitsStats(res.stats as LimitsStat[]);
      setLimitsDate(res.date);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setLimitsError(err instanceof Error ? err.message : "Failed to load limits");
    } finally {
      setLimitsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "service-limits" && !limitsStats && !limitsLoading) {
      void loadLimits();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (feedbackType !== "all" && fb.type !== feedbackType) return false;
    if (!feedbackQuery.trim()) return true;
    const q = feedbackQuery.toLowerCase();
    return (
      fb.message.toLowerCase().includes(q) ||
      (fb.subject?.toLowerCase().includes(q) ?? false) ||
      fb.user.email.toLowerCase().includes(q) ||
      fb.user.username.toLowerCase().includes(q) ||
      `${fb.user.firstName} ${fb.user.lastName}`.toLowerCase().includes(q)
    );
  });

  const feedbackCounts = {
    all: feedbacks.length,
    bug: feedbacks.filter((f) => f.type === "bug").length,
    feedback: feedbacks.filter((f) => f.type === "feedback").length,
    question: feedbacks.filter((f) => f.type === "question").length,
  };

  async function loadFeedbacks() {
    setFeedbacksLoading(true);
    try {
      const data = await getFeedbacks();
      setFeedbacks(data as FeedbackWithUser[]);
    } catch (err) {
      toast.error(friendlyError(err, "save"));
    }
    setFeedbacksLoading(false);
  }

  useEffect(() => {
    if (activeTab === "feedback" && feedbacks.length === 0 && !feedbacksLoading) {
      loadFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
      toast.error(friendlyError(err, "save"));
    }
    setTogglingId(null);
  }

  async function handleThankYou(userId: string) {
    setThankingId(userId);
    try {
      await sendThankYouNotification(userId);
      toast.success("Thank you notification sent!");
    } catch (err) {
      toast.error(friendlyError(err, "reminder"));
    }
    setThankingId(null);
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
        ? `FCM push delivered: ${res.fcmSent}${res.fcmFailed ? `, failed: ${res.fcmFailed}` : ""}${res.fcmErrors?.length ? ` (${res.fcmErrors.join("; ")})` : ""}`
        : "FCM push NOT configured on server";
      const vapid = res.vapidConfigured
        ? `web push delivered: ${res.legacySent}`
        : "web push not configured";
      setBroadcastResult(
        `Sent to ${scope}. In-app: ${res.users} notification(s). ${fcm}; ${vapid}.`
      );
      toast.success("Notification sent.");
    } catch (err) {
      toast.error(friendlyError(err, "reminder"));
      setBroadcastResult(null);
    }
    setBroadcasting(false);
  }

  return (
    <div className="mx-auto max-w-5xl pt-8 md:pt-0">
      <BoneSkeleton
        name="admin-page"
        loading={loading}
        fallback={renderSkeleton(activeTab)}
      >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
        <div className="flex items-start gap-3">
          <HeaderBack to="/dashboard" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage users, monitor activity, and broadcast updates.
            </p>
          </div>
        </div>
        <NotificationBell variant="inline" className="hidden md:flex" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left nav */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible md:rounded-2xl md:border md:border-border/60 md:bg-card/80 md:p-2 md:backdrop-blur-sm md:sticky md:top-6">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "feedback", label: "Feedback", icon: MessageSquare },
            { id: "broadcast", label: "Broadcast", icon: Radio },
            { id: "users", label: "Users", icon: Users },
            { id: "service-limits", label: "Service Limits", icon: Gauge },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-6">
          {activeTab === "overview" && (
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
          )}

          {activeTab === "broadcast" && (
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
                  <TextField
                    label="Title (optional)"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    maxLength={100}
                    disabled={broadcasting}
                  />
                  <FloatingLabelTextarea
                    label="Message"
                    inputClassName="min-h-[110px] resize-y"
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
                        <Spinner size={16} className="mr-1.5 text-primary-foreground" />
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
          )}

          {activeTab === "feedback" && (
            <section className="space-y-4">
              <SectionHeader
                icon={MessageSquare}
                title="User Feedback"
                description="What users are saying — send a thank-you to acknowledge their input"
              />

              {/* Search + Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search feedback..."
                    value={feedbackQuery}
                    onChange={(e) => setFeedbackQuery(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/60 bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex gap-1">
                  {(["all", "bug", "feedback", "question"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeedbackType(t)}
                      className={cn(
                        "h-9 rounded-lg px-3 text-xs font-medium transition-colors capitalize",
                        feedbackType === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {t} {feedbackCounts[t] > 0 && `(${feedbackCounts[t]})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback list */}
              {feedbacksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border/40 bg-card/60 p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-3.5 w-36" />
                            <Skeleton className="h-4 w-16 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                        <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">No feedback found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feedbacks.length > 0 ? "Try adjusting your search or filter" : "Feedback will appear here when users submit it"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFeedbacks.map((fb) => (
                    <FeedbackRow
                      key={fb.id}
                      fb={fb}
                      thankingId={thankingId}
                      onThankYou={handleThankYou}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "users" && (
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
                <div className="max-h-[560px] overflow-y-auto pr-1">
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
          )}

          {activeTab === "service-limits" && (
            <section className="space-y-3">
              <SectionHeader
                icon={Gauge}
                title="Service Limits"
                description={`Daily usage caps for ${limitsDate || "today"} — auto-refreshes every 5 min · resets at midnight.`}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  LIVE
                </span>
                {lastUpdated && <span>Last updated {lastUpdated}</span>}
                <span className="tabular-nums">· now {now.toLocaleTimeString()}</span>
                {!limitsLoading && limitsStats && (
                  <span>{limitsStats.filter((s) => s.realtime?.remaining === 0).length} cap(s) exhausted</span>
                )}
              </div>

              {limitsError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                  {limitsError}
                </div>
              )}

              {limitsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                  ))}
                </div>
              ) : limitsStats ? (
                <div className="space-y-4">
                  {limitsStats.map((stat) => (
                    <LimitsStatBar key={stat.id} stat={stat} />
                  ))}
                </div>
              ) : !limitsError ? (
                <p className="text-sm text-muted-foreground">No data available yet.</p>
              ) : null}

              {!limitsLoading && limitsStats && (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Tips</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    <li>The OpenRouter card aggregates every configured key — it reads the provider&rsquo;s live rate-limit headers and sums them.</li>
                    <li>Once a key&rsquo;s reset time passes, the card automatically clears to a fresh window.</li>
                    <li>Gemini, QStash, and B2 counts come from local request counters.</li>
                    <li>B2 free tier: 1 GB/day download bandwidth + 2,500 Class B &amp; C transactions/day.</li>
                    <li>When a cap is at 90%+ it turns red — consider slowing down or adding a payment method.</li>
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      </BoneSkeleton>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Confirm your password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Re-enter your password to authorize this admin action.
            </p>
            <TextField
              label="Your password"
              type="password"
              autoFocus
              className="mt-4"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(""); }}
              onKeyDown={(e) => e.key === "Enter" && confirmToggle()}
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

const AVATAR_COLORS = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
];

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? AVATAR_COLORS[0]!;
}

const TYPE_CONFIG: Record<string, { label: string; variant: "destructive" | "default" | "outline"; icon?: string }> = {
  bug:       { label: "Bug",       variant: "destructive" },
  feedback:  { label: "Feedback",  variant: "default" },
  question:  { label: "Question",  variant: "outline" },
};

function FeedbackRow({
  fb,
  thankingId,
  onThankYou,
}: {
  fb: FeedbackWithUser;
  thankingId: string | null;
  onThankYou: (userId: string) => void;
}) {
  const typeCfg = TYPE_CONFIG[fb.type] ?? { label: fb.type, variant: "outline" as const };
  const colorClass = getAvatarColor(fb.user.id);
  const initials = (fb.user.firstName?.[0] || fb.user.username?.[0] || "?").toUpperCase();
  const displayName = fb.user.firstName || fb.user.lastName
    ? `${fb.user.firstName ?? ""} ${fb.user.lastName ?? ""}`.trim()
    : `@${fb.user.username}`;

  const date = new Date(fb.createdAt);
  const timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="group/single rounded-xl border border-border/40 bg-card/60 p-4 hover:bg-muted/20 transition-colors">
      {/* Top row: avatar + name + email + type + date + thank button */}
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", colorClass)}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground leading-tight">{displayName}</span>
            <span className="text-xs text-muted-foreground">{fb.user.email}</span>
            <Badge variant={typeCfg.variant} className="text-[10px] h-4 px-1.5 uppercase tracking-wide">
              {typeCfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeStr}</span>
          </div>

          {fb.subject && (
            <p className="mt-1 text-xs font-medium text-foreground">{fb.subject}</p>
          )}

          <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {fb.message}
          </p>

          {fb.page && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-medium">From:</span> {fb.page}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 opacity-0 group-hover/single:opacity-100 transition-opacity max-sm:opacity-100 max-sm:mt-2"
          disabled={thankingId === fb.userId}
          onClick={() => onThankYou(fb.userId)}
        >
          {thankingId === fb.userId ? (
            <Spinner size={10} className="mr-1" />
          ) : (
            <Send className="mr-1.5 h-3 w-3" />
          )}
          Thank you
        </Button>
      </div>
    </div>
  );
}

function renderSkeleton(activeTab: string) {
  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left nav rail */}
        <div className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible md:rounded-2xl md:border md:border-border/60 md:bg-card/80 md:p-2 md:sticky md:top-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-6">
          {activeTab === "overview" && (
            <>
              <SectionSkeleton titleWidth="w-20" descWidth="w-44" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="pt-5 pb-4 text-center">
                      <Skeleton className="h-7 w-14 mx-auto" />
                      <Skeleton className="h-3 w-16 mx-auto mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {activeTab === "feedback" && (
            <>
              <SectionSkeleton titleWidth="w-32" descWidth="w-96" />
              {/* Search + filter row */}
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 flex-1 min-w-[200px] rounded-lg" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 w-16 rounded-lg" />
                  ))}
                </div>
              </div>
              {/* Feedback list */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-border/40 bg-card/60 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Skeleton className="h-3.5 w-36" />
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "broadcast" && (
            <>
              <SectionSkeleton titleWidth="w-24" descWidth="w-80" />
              <Card className="border-border/50">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-full mt-1" />
                  <Skeleton className="h-3 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-[110px] w-full rounded-md" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-10 w-36 rounded-md" />
                    <Skeleton className="h-10 w-44 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "service-limits" && (
            <>
              <SectionSkeleton titleWidth="w-32" descWidth="w-48" />
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "users" && (
            <>
              <SectionSkeleton titleWidth="w-40" descWidth="w-56" />
              <Card className="border-border/50">
                <CardHeader>
                  <Skeleton className="h-5 w-12" />
                </CardHeader>
                <CardContent>
                  <div className="hidden sm:block space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
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
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SectionSkeleton({ titleWidth, descWidth }: { titleWidth: string; descWidth: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Skeleton className="h-6 w-6 rounded-md" />
      <div className="space-y-1">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className={`h-3 ${descWidth}`} />
      </div>
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
  const config: Record<string, { label: string; cls: string; Icon: LucideIcon }> = {
    web: { label: "Website", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400", Icon: Globe },
    "pwa-android": { label: "PWA · Android", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", Icon: Smartphone },
    "pwa-ios": { label: "PWA · iOS", cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", Icon: Apple },
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
          <c.Icon className="h-3 w-3" />
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1_024) return `${(n / 1_024).toFixed(1)} KB`;
  return `${n} B`;
}

function LimitsStatBar({ stat }: { stat: LimitsStat }) {
  const isBandwidth = stat.unit === "bandwidth";
  const usage = isBandwidth ? stat.bytesUsed ?? stat.usage : stat.usage;
  const limit = isBandwidth ? stat.bytesLimit ?? stat.limit : stat.limit;
  const pct = limit > 0 ? Math.min(100, (usage / limit) * 100) : 100;

  const colors = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    critical: "bg-red-500",
  } as const;

  const badge = {
    ok: {
      text: "OK",
      icon: CheckCircle,
      cls: "bg-emerald-500/10 text-emerald-600",
    },
    warn: {
      text: "70%+",
      icon: Gauge,
      cls: "bg-amber-500/10 text-amber-600",
    },
    critical: {
      text: "90%+",
      icon: AlertTriangle,
      cls: "bg-red-500/10 text-red-600",
    },
  } as const;

  const b = badge[stat.color];
  const usageLabel = isBandwidth ? formatBytes(usage) : formatNumber(usage);
  const limitLabel = isBandwidth ? formatBytes(limit) : formatNumber(limit);

  return (
    <Card className="border-border/50">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{stat.name}</h3>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", b.cls)}>
                <b.icon className="h-3 w-3" />
                {b.text}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-foreground">
              {usageLabel}
              <span className="text-muted-foreground"> / {limitLabel}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">{pct.toFixed(1)}%</div>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", colors[stat.color])}
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        </div>
        {stat.realtime && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {stat.realtime.isFreeTier && <span>Free tier — ~50 req/day per key</span>}
            {stat.realtime.limit != null && (
              <span>
                Provider: {formatNumber(stat.realtime.usage)}/{formatNumber(stat.realtime.limit)}
                {stat.realtime.reset ? ` · resets ${new Date(stat.realtime.reset).toLocaleTimeString()}` : ""}
                {stat.realtime.remaining === 0 && (
                  <span className="font-semibold text-red-600"> · EXHAUSTED</span>
                )}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
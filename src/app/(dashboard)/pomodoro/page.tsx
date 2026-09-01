"use client";

import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  TreePineIcon,
  TreePine,
  TreeDeciduous,
  Flower2,
  Leaf,
  Sprout,
  FlameIcon,
  ZapIcon,
} from "lucide-react";
import { AppNavPanel } from "@/components/app-nav-panel";
import { HeaderAvatar } from "@/components/header-avatar";
import { NotificationBell } from "@/components/notification-bell";
import { toast } from "sonner";
import { friendlyError } from "@/server/lib/friendly-error";
import {
  getGamificationProfile,
  logFocusSession,
} from "./gamification-actions";
import { cn } from "@/lib/utils";

const DEFAULTS = { focus: 5, break: 5 };
const MAX_FOCUS = 240;
const MAX_BREAK = 120;
const TICK_MS = 250;

// Growth thresholds are FRACTIONS of the current focus session's total duration.
// 0%→Seed, 20%→Sprout, 40%→Sapling, 60%→Tree, 80%→Full Tree, 100%→completion.
// These work for ANY focus duration (seconds, minutes, hours).
const GROWTH_THRESHOLDS = { sprout: 0.20, sapling: 0.40, tree: 0.60, full: 0.80 };

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, n));
}

function getTreeStage(progress: number): { label: string; icon: ComponentType<{ className?: string }>; color: string } {
  if (progress < GROWTH_THRESHOLDS.sprout) return { label: "Seed", icon: Sprout, color: "text-orange-400" };
  if (progress < GROWTH_THRESHOLDS.sapling) return { label: "Sprout", icon: Leaf, color: "text-green-400" };
  if (progress < GROWTH_THRESHOLDS.tree) return { label: "Sapling", icon: Flower2, color: "text-emerald-500" };
  if (progress < GROWTH_THRESHOLDS.full) return { label: "Tree", icon: TreeDeciduous, color: "text-green-600" };
  return { label: "Full Tree", icon: TreePine, color: "text-green-700" };
}

const XP_PER_LEVEL = [0, 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500];
function getLevelProgress(xp: number, level: number) {
  const current = XP_PER_LEVEL[level - 1] ?? 0;
  const next = XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1] ?? 0;
  if (next === current) return 1;
  return Math.min(1, (xp - current) / (next - current));
}

export default function PomodoroPage() {
  const [focusMin, setFocusMin] = useState(DEFAULTS.focus);
  const [breakMin, setBreakMin] = useState(DEFAULTS.break);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  const focusRef = useRef(focusMin);
  const breakRef = useRef(breakMin);
  const sessionStartRef = useRef<number | null>(null);
  const completionLockRef = useRef(false);
  const mountedRef = useRef(true);

  // Track the previous tree label so we can animate only on stage changes.
  const prevTreeRef = useRef<string>("");
  const [treePop, setTreePop] = useState(false);

  const [profile, setProfile] = useState<{
    xp: number;
    level: number;
    currentStreak: number;
    totalFocusMinutes: number;
  } | null>(null);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    const p = await getGamificationProfile();
    if (p && mountedRef.current) {
      setProfile({
        xp: p.xp,
        level: p.level,
        currentStreak: p.currentStreak,
        totalFocusMinutes: p.totalFocusMinutes,
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadProfile();
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    phaseRef.current = phase;
    focusRef.current = focusMin;
    breakRef.current = breakMin;
  }, [phase, focusMin, breakMin]);

  // Reset tree-pop tracker when a new focus session starts so the next stage
  // change animates fresh.
  useEffect(() => {
    if (phase === "focus" && !running) {
      prevTreeRef.current = "";
    }
  }, [phase, running]);

  // Single countdown loop. Cleanup guarantees only one interval is ever alive
  // at a time, so rapid start/pause clicks can't create duplicates.
  useEffect(() => {
    if (!running || deadline === null) return;

    const id = window.setInterval(() => {
      if (!mountedRef.current) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining > 0 || completionLockRef.current) return;

      // Natural completion. Lock immediately so duplicate interval ticks can't fire this again.
      completionLockRef.current = true;

      const wasFocus = phaseRef.current === "focus";
      const nextPhase: "focus" | "break" = wasFocus ? "break" : "focus";
      const nextDur = nextPhase === "focus" ? focusRef.current : breakRef.current;
      const start = sessionStartRef.current;

      if (wasFocus && start) {
        const mins = Math.max(1, Math.round((Date.now() - start) / 60000));
        logFocusSession(mins, true).then((res) => {
          if (!mountedRef.current) return;
          if (res.success && res.xpEarned && res.xpEarned > 0) {
            setXpPopup(res.xpEarned);
            window.setTimeout(() => {
              if (mountedRef.current) setXpPopup(null);
            }, 3000);
            loadProfile();
          } else if (!res.success && res.error) {
            toast.error(friendlyError(res.error, "gamification"));
          }
        });
        sessionStartRef.current = null;
      } else if (!wasFocus) {
        // Break completed naturally: clear start so the next focus session
        // begins timing fresh from its start.
        sessionStartRef.current = null;
      }

      // Transition to the next phase and arm a new deadline.
      setPhase(nextPhase);
      setSecondsLeft(nextDur * 60);
      setDeadline(Date.now() + nextDur * 60 * 1000);
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      completionLockRef.current = false;
    };
  }, [running, deadline, loadProfile]);

  // Total duration in seconds for the current phase. Used for both the SVG
  // ring and the per-session tree growth progress calculation.
  const phaseTotal = (phase === "focus" ? focusMin : breakMin) * 60;
  const phaseElapsed = phaseTotal - secondsLeft;
  const phaseProgress = phaseTotal > 0 ? Math.max(0, Math.min(1, phaseElapsed / phaseTotal)) : 0;

  // Tree stage is derived ONLY from the current focus session's progress.
  // During break, the icon isn't shown (showTree=false), so this only matters
  // for the visible state.
  const tree = getTreeStage(phase === "focus" ? phaseProgress : 1);
  const showTree = phase === "focus" && running;

  // Trigger pop animation when the visible tree stage changes.
  useEffect(() => {
    if (!showTree) return;
    if (!prevTreeRef.current) {
      prevTreeRef.current = tree.label;
      return;
    }
    if (prevTreeRef.current === tree.label || treePop) return;
    setTreePop(true);
    const id = window.setTimeout(() => {
      if (mountedRef.current) setTreePop(false);
    }, 500);
    return () => window.clearTimeout(id);
  }, [tree.label, showTree, treePop]);

  const timerProgress = phaseTotal > 0 ? (secondsLeft / phaseTotal) * 100 : 0;

  function applyFocus(value: number) {
    const next = clampInt(value, 1, MAX_FOCUS);
    setFocusMin(next);
    if (phase === "focus") {
      setSecondsLeft(next * 60);
      if (running) {
        setDeadline(Date.now() + next * 60 * 1000);
      } else {
        setDeadline(null);
      }
    }
  }

  function applyBreak(value: number) {
    const next = clampInt(value, 1, MAX_BREAK);
    setBreakMin(next);
    if (phase === "break") {
      setSecondsLeft(next * 60);
      if (running) {
        setDeadline(Date.now() + next * 60 * 1000);
      } else {
        setDeadline(null);
      }
    }
  }

  const toggle = () => {
    if (running) {
      // Pausing — preserve remaining time, no seed award.
      const remaining = secondsLeft;
      setRunning(false);
      setDeadline(null);
      // Clear the session-start ref so resuming doesn't double-count.
      if (phaseRef.current === "focus") {
        sessionStartRef.current = null;
      }
      setSecondsLeft(remaining);
    } else {
      // Starting / resuming. Re-arm deadline from current remaining time.
      if (phaseRef.current === "focus" && !sessionStartRef.current) {
        sessionStartRef.current = Date.now();
      }
      setDeadline(Date.now() + Math.max(0, secondsLeft) * 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setDeadline(null);
    sessionStartRef.current = null;
    completionLockRef.current = false;
    prevTreeRef.current = "";
    setSecondsLeft((phase === "focus" ? focusMin : breakMin) * 60);
  };

  const skip = () => {
    // Manual phase switch — never marks current phase as completed.
    sessionStartRef.current = null;
    const next: "focus" | "break" = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setRunning(false);
    setDeadline(null);
    completionLockRef.current = false;
    prevTreeRef.current = "";
    setSecondsLeft((next === "focus" ? focusMin : breakMin) * 60);
  };

  const switchPhase = (target: "focus" | "break") => {
    if (target === phase) return;
    sessionStartRef.current = null;
    setRunning(false);
    setDeadline(null);
    completionLockRef.current = false;
    prevTreeRef.current = "";
    setPhase(target);
    setSecondsLeft((target === "focus" ? focusMin : breakMin) * 60);
  };

  const levelProgress = profile ? getLevelProgress(profile.xp, profile.level) : 0;

  // Stage progress hint (only meaningful during focus).
  const nextStage =
    tree.label === "Seed" ? `Sprout` :
    tree.label === "Sprout" ? `Sapling` :
    tree.label === "Sapling" ? `Tree` :
    tree.label === "Tree" ? `Full Tree` :
    null;
  const nextThreshold =
    tree.label === "Seed" ? GROWTH_THRESHOLDS.sprout :
    tree.label === "Sprout" ? GROWTH_THRESHOLDS.sapling :
    tree.label === "Sapling" ? GROWTH_THRESHOLDS.tree :
    tree.label === "Tree" ? GROWTH_THRESHOLDS.full :
    1;
  const stagePct = Math.round(phaseProgress * 100);

  return (
    <div className="mx-auto w-full max-w-6xl pt-8 md:pt-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
        <div className="flex items-start gap-3">
          <HeaderAvatar />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Focus Timer
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Stay focused, grow your tree, earn XP
            </p>
          </div>
        </div>
        <NotificationBell variant="inline" className="hidden md:flex" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AppNavPanel />

        <div className="min-w-0 flex-1 mx-auto w-full max-w-md md:mx-0">
          {profile && (
            <div className="mb-4 flex items-center gap-4 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-1.5">
                <ZapIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">{profile.xp} XP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TreePineIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Lv {profile.level}</span>
              </div>
              <div className="flex-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${levelProgress * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <FlameIcon className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{profile.currentStreak}d</span>
              </div>
            </div>
          )}

          <Card className="border-2 border-foreground/70 shadow-[6px_6px_0_0_#401f32] ring-2 ring-background">
            <CardContent className="flex flex-col items-center gap-6 py-8">
              <div className="flex gap-2">
                <button
                  onClick={() => switchPhase("focus")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    phase === "focus"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Focus
                </button>
                <button
                  onClick={() => switchPhase("break")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    phase === "break"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Break
                </button>
              </div>

              <div className="relative flex h-56 w-56 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none" stroke="currentColor"
                    className="text-muted/30" strokeWidth="6"
                  />
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none" stroke="currentColor"
                    className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={(2 * Math.PI * 46) * (1 - timerProgress / 100)}
                  />
                </svg>
                <div className="text-center">
                  {showTree && (
                    <div
                      className={cn(
                        "mb-1 flex items-center justify-center",
                        treePop
                          ? "animate-[grow-pop_500ms_ease-out]"
                          : "transition-all duration-500"
                      )}
                    >
                      <tree.icon className={cn("h-10 w-10", tree.color)} />
                    </div>
                  )}
                  <div className="text-5xl font-bold tabular-nums text-foreground">
                    {format(secondsLeft)}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {phase === "focus"
                      ? running ? tree.label : "Focus session"
                      : "Break time"}
                  </div>
                </div>
              </div>

              {xpPopup && (
                <div className="animate-bounce text-sm font-bold text-green-500">
                  +{xpPopup} XP earned!
                </div>
              )}

              {showTree && (
                <div className="w-full rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <tree.icon className={cn("h-3.5 w-3.5", tree.color)} />
                    {tree.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {nextStage
                      ? `${stagePct}% · ${Math.max(0, Math.round((nextThreshold - phaseProgress) * 100))}% to ${nextStage}`
                      : "Maximum grown!"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={reset} aria-label="Reset">
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button size="lg" onClick={toggle} className="w-32">
                  {running ? (
                    <><Pause className="mr-2 h-5 w-5" /> Pause</>
                  ) : (
                    <><Play className="mr-2 h-5 w-5" /> Start</>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={skip} aria-label="Skip">
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <TextField
                  label="Focus (min)"
                  inputClassName="text-center"
                  type="number" min={1} max={MAX_FOCUS} value={focusMin}
                  onChange={(e) => applyFocus(Number(e.target.value))}
                />
                <TextField
                  label="Break (min)"
                  inputClassName="text-center"
                  type="number" min={1} max={MAX_BREAK} value={breakMin}
                  onChange={(e) => applyBreak(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Spinner } from "@/components/ui/spinner";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  TreePineIcon,
  FlameIcon,
  ZapIcon,
} from "lucide-react";
import { AppNavPanel } from "@/components/app-nav-panel";
import { HeaderAvatar } from "@/components/header-avatar";
import { NotificationBell } from "@/components/notification-bell";
import {
  getGamificationProfile,
  logFocusSession,
} from "./gamification-actions";

const DEFAULTS = { focus: 25, break: 5 };
const MAX_FOCUS = 240;
const MAX_BREAK = 120;

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, n));
}

function getTreeStage(progress: number): { emoji: string; label: string } {
  if (progress < 0.2) return { emoji: "🌱", label: "Seed" };
  if (progress < 0.4) return { emoji: "🌿", label: "Sprout" };
  if (progress < 0.6) return { emoji: "🪴", label: "Sapling" };
  if (progress < 0.8) return { emoji: "🌳", label: "Tree" };
  return { emoji: "🌲", label: "Full Tree" };
}

const XP_PER_LEVEL = [0, 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500];
function getLevelProgress(xp: number, level: number) {
  const current = XP_PER_LEVEL[level - 1] ?? 0;
  const next = XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
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

  const [profile, setProfile] = useState<{
    xp: number;
    level: number;
    currentStreak: number;
    totalFocusMinutes: number;
  } | null>(null);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    const p = await getGamificationProfile();
    if (p) {
      setProfile({
        xp: p.xp,
        level: p.level,
        currentStreak: p.currentStreak,
        totalFocusMinutes: p.totalFocusMinutes,
      });
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    phaseRef.current = phase;
    focusRef.current = focusMin;
    breakRef.current = breakMin;
  });

  useEffect(() => {
    if (!running || deadline === null) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        const wasFocus = phaseRef.current === "focus";
        const next = wasFocus ? "break" : "focus";
        setPhase(next);
        const dur = next === "focus" ? focusRef.current : breakRef.current;
        const newDeadline = Date.now() + dur * 60 * 1000;
        setSecondsLeft(dur * 60);
        setDeadline(newDeadline);

        if (wasFocus && sessionStartRef.current) {
          const mins = Math.round(
            (Date.now() - sessionStartRef.current) / 60000
          );
          logFocusSession(mins, true).then((res) => {
            if (res.success && res.xpEarned && res.xpEarned > 0) {
              setXpPopup(res.xpEarned);
              setTimeout(() => setXpPopup(null), 3000);
              loadProfile();
            }
          });
          sessionStartRef.current = null;
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, deadline, loadProfile]);

  const total = (phase === "focus" ? focusMin : breakMin) * 60;
  const progress = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;
  const timerProgress = total > 0 ? (secondsLeft / total) * 100 : 0;
  const tree = getTreeStage(progress);

  function applyFocus(value: number) {
    const next = clampInt(value, 1, MAX_FOCUS);
    setFocusMin(next);
    if (phase === "focus") {
      setSecondsLeft(next * 60);
      setDeadline(running ? Date.now() + next * 60 * 1000 : null);
    }
  }

  function applyBreak(value: number) {
    const next = clampInt(value, 1, MAX_BREAK);
    setBreakMin(next);
    if (phase === "break") {
      setSecondsLeft(next * 60);
      setDeadline(running ? Date.now() + next * 60 * 1000 : null);
    }
  }

  const toggle = () => {
    if (running) {
      setRunning(false);
      setDeadline(null);
      if (phase === "focus" && sessionStartRef.current) {
        const mins = Math.round(
          (Date.now() - sessionStartRef.current) / 60000
        );
        if (mins >= 1) {
          logFocusSession(mins, false).then(() => loadProfile());
        }
        sessionStartRef.current = null;
      }
    } else {
      if (phase === "focus" && !sessionStartRef.current) {
        sessionStartRef.current = Date.now();
      }
      setDeadline(Date.now() + secondsLeft * 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setDeadline(null);
    sessionStartRef.current = null;
    setSecondsLeft((phase === "focus" ? focusMin : breakMin) * 60);
  };

  const skip = () => {
    if (phase === "focus" && sessionStartRef.current) {
      const mins = Math.round(
        (Date.now() - sessionStartRef.current) / 60000
      );
      if (mins >= 1) {
        logFocusSession(mins, false).then(() => loadProfile());
      }
      sessionStartRef.current = null;
    }
    const next = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setRunning(false);
    setDeadline(null);
    setSecondsLeft((next === "focus" ? focusMin : breakMin) * 60);
  };

  const levelProgress = profile ? getLevelProgress(profile.xp, profile.level) : 0;

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
                <span className="text-sm font-medium">Lv.{profile.level}</span>
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

          <Card>
            <CardContent className="flex flex-col items-center gap-6 py-8">
              <div className="flex gap-2">
                <button
                  onClick={() => { setRunning(false); setDeadline(null); setPhase("focus"); setSecondsLeft(focusMin * 60); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    phase === "focus"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Focus
                </button>
                <button
                  onClick={() => { setRunning(false); setDeadline(null); setPhase("break"); setSecondsLeft(breakMin * 60); }}
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
                  {phase === "focus" && running && (
                    <div className="text-4xl mb-1 transition-all duration-500">
                      {tree.emoji}
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
                <FloatingLabelInput
                  label="Focus (min)"
                  inputClassName="text-center"
                  type="number" min={1} max={MAX_FOCUS} value={focusMin}
                  onChange={(e) => applyFocus(Number(e.target.value))}
                />
                <FloatingLabelInput
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

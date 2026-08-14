"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { AppNavPanel } from "@/components/app-nav-panel";
import { HeaderAvatar } from "@/components/header-avatar";
import { NotificationBell } from "@/components/notification-bell";

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

export default function PomodoroPage() {
  const [focusMin, setFocusMin] = useState(DEFAULTS.focus);
  const [breakMin, setBreakMin] = useState(DEFAULTS.break);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  // Epoch ms when the current phase ends. The countdown is computed from
  // this deadline (not a decrementing counter), so it stays accurate even
  // when the tab is throttled in the background.
  const [deadline, setDeadline] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  const focusRef = useRef(focusMin);
  const breakRef = useRef(breakMin);

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
        const next = phaseRef.current === "focus" ? "break" : "focus";
        setPhase(next);
        const dur = next === "focus" ? focusRef.current : breakRef.current;
        const newDeadline = Date.now() + dur * 60 * 1000;
        setSecondsLeft(dur * 60);
        setDeadline(newDeadline);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, deadline]);

  const total = (phase === "focus" ? focusMin : breakMin) * 60;
  const progress = total > 0 ? (secondsLeft / total) * 100 : 0;

  /** Apply a new focus duration. If the focus phase is active, the visible
   *  countdown resets to the new length — no stale numbers on screen. */
  function applyFocus(value: number) {
    const next = clampInt(value, 1, MAX_FOCUS);
    setFocusMin(next);
    if (phase === "focus") {
      setSecondsLeft(next * 60);
      setDeadline(running ? Date.now() + next * 60 * 1000 : null);
    }
  }

  /** Apply a new break duration — same rules as applyFocus. */
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
      // Pause: freeze the remaining time by dropping the deadline.
      setRunning(false);
      setDeadline(null);
    } else {
      // Resume (or start): schedule the phase end from the current remaining.
      setDeadline(Date.now() + secondsLeft * 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setDeadline(null);
    setSecondsLeft((phase === "focus" ? focusMin : breakMin) * 60);
  };

  const skip = () => {
    const next = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setRunning(false);
    setDeadline(null);
    setSecondsLeft((next === "focus" ? focusMin : breakMin) * 60);
  };

  return (
    <div className="mx-auto w-full max-w-6xl pt-8 md:pt-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
        <div className="flex items-start gap-3">
          <HeaderAvatar />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pomodoro Timer
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Focus in sprints, then take a break.
            </p>
          </div>
        </div>
        <NotificationBell variant="inline" className="hidden md:flex" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <AppNavPanel />

        <div className="min-w-0 flex-1 mx-auto w-full max-w-md md:mx-0">
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
                strokeDashoffset={(2 * Math.PI * 46) * (1 - progress / 100)}
              />
            </svg>
            <div className="text-center">
              <div className="text-5xl font-bold tabular-nums text-foreground">
                {format(secondsLeft)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {phase === "focus" ? "Focus session" : "Break time"}
              </div>
            </div>
          </div>

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
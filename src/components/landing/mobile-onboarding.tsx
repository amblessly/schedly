"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";

const LAST_SCREEN = 2;
const STEPS = ["01", "02", "03"];

type MascotVariant = "wave" | "timetable" | "celebrate";

export function MobileOnboarding() {
  const [screen, setScreen] = useState(0);
  const touchX = useRef<number | null>(null);

  // The onboarding is a fixed full-viewport app: nothing should scroll, so
  // lock the page scroll for the whole time it is mounted on mobile.
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const go = (next: number) => {
    setScreen(Math.max(0, Math.min(LAST_SCREEN, next)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchX.current;
    const dx = endX - touchX.current;
    if (dx < -48) go(screen + 1);
    else if (dx > 48) go(screen - 1);
    touchX.current = null;
  };

  return (
    <div
      className="relative h-dvh-fallback overflow-hidden"
      style={{
        backgroundImage: "var(--app-backdrop)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Screens carousel */}
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(-${screen * 100}%)` }}
      >
        <WelcomeScreen active={screen === 0} onNext={() => go(1)} onSkip={() => go(2)} />
        <FeaturesScreen active={screen === 1} onNext={() => go(2)} onBack={() => go(0)} />
        <AuthScreen active={screen === 2} onBack={() => go(1)} />
      </div>
    </div>
  );
}

/* ============ Shared ============ */

function ScreenContent({
  active,
  delay = 0,
  className = "",
  children,
}: {
  active: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${className} ${active ? "animate-fade-up" : "opacity-0"}`}
      style={active ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ============ Mascot — minimal mark, no decoration ============ */

function Mascot({ variant = "wave", size = "lg" }: { variant?: MascotVariant; size?: "lg" | "sm" }) {
  const big = size === "lg";
  const box = big
    ? "h-[clamp(7rem,22dvh,11rem)] w-[clamp(7rem,22dvh,11rem)]"
    : "h-[clamp(4rem,15dvh,7rem)] w-[clamp(4rem,15dvh,7rem)]";
  const anim = variant === "wave" || variant === "celebrate" ? "animate-float" : "";

  return (
    <div className={`relative flex items-center justify-center ${box}`}>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-[32%] bg-secondary ring-1 ring-border ${box} ${anim}`}
      >
        <img src="/images/logo.jpg" alt="" aria-hidden className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-center gap-1.5 pb-[env(safe-area-inset-bottom)]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-500 ease-out ${
            i === current ? "w-6 bg-primary" : "w-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function NavRow({ onBack, onSkip }: { onBack?: () => void; onSkip?: () => void }) {
  return (
    <div className="flex items-center justify-between pb-[clamp(0.5rem,1.5dvh,1rem)]">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-1 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      ) : (
        <span />
      )}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="px-1 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      )}
    </div>
  );
}

/* ============ Screen 1 — Welcome ============ */

type Cell = { name: string; color: string } | null;

/* Static grid data for the two timetable cards. Each is Mon–Sat × 3 rows.
 * A cell is null = empty, or { name, color } = subject block. */
const GRID_A: Cell[][] = [
  [null, { name: "Phys", color: "#0ea5e9" }, null, { name: "Hist", color: "#ef4444" }, { name: "Eng", color: "#8b5cf6" }, null],
  [{ name: "Math", color: "#3b82f6" }, null, { name: "Bio", color: "#f59e0b" }, null, { name: "CS", color: "#22c55e" }, { name: "Phys", color: "#0ea5e9" }],
  [null, { name: "Eng", color: "#8b5cf6" }, { name: "Math", color: "#3b82f6" }, { name: "CS", color: "#22c55e" }, null, { name: "Hist", color: "#ef4444" }],
];

const GRID_B: Cell[][] = [
  [{ name: "Bio", color: "#f59e0b" }, null, { name: "CS", color: "#22c55e" }, { name: "Phys", color: "#0ea5e9" }, null, { name: "Math", color: "#3b82f6" }],
  [null, { name: "Hist", color: "#ef4444" }, { name: "Eng", color: "#8b5cf6" }, null, { name: "Math", color: "#3b82f6" }, { name: "Bio", color: "#f59e0b" }],
  [{ name: "Eng", color: "#8b5cf6" }, { name: "Phys", color: "#0ea5e9" }, null, { name: "Hist", color: "#ef4444" }, { name: "Bio", color: "#f59e0b" }, null],
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MiniTimetable({ grid, label }: { grid: Cell[][]; label: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-border/60 bg-card p-1.5 shadow-xl shadow-primary/5 sm:p-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-destructive/60" />
        <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
        <div className="h-2 w-2 rounded-full bg-green-400/60" />
        <span className="ml-1 text-[9px] font-mono text-muted-foreground">{label}</span>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${DAY_LABELS.length}, minmax(0, 1fr))` }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="rounded bg-primary/10 p-0.5 text-center text-[9px] font-semibold text-primary">
            {d}
          </div>
        ))}
        {grid.map((row, ri) =>
          row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} className="min-h-[30px]">
              {cell ? (
                <div className="flex h-full min-h-[30px] items-center justify-center rounded bg-muted/5 p-0.5 text-center" style={{ backgroundColor: cell.color + "1f", color: cell.color }}>
                  <span className="text-[9px] font-semibold leading-tight">{cell.name}</span>
                </div>
              ) : (
                <div className="flex h-full min-h-[30px] items-center justify-center rounded bg-muted/30" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* Two timetable cards stacked, both equal in size. */
function TimetableVisual({ active }: { active: boolean }) {
  return (
    <div
      className={`relative mx-auto h-[clamp(8rem,25dvh,12rem)] w-[clamp(20rem,96vw,28rem)] transition-all duration-500 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Back timetable */}
      <div
        className={`absolute left-0 top-1 w-[92%] -rotate-2 transition-all duration-500 ease-out ${
          active ? "translate-x-0 opacity-80" : "-translate-x-3 opacity-40"
        }`}
      >
        <MiniTimetable grid={GRID_B} label="Next Week" />
      </div>

      {/* Front timetable */}
      <div
        className={`absolute right-0 bottom-0 w-[92%] rotate-[1.5deg] transition-all duration-500 ease-out ${
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <MiniTimetable grid={GRID_A} label="This Week" />
      </div>
    </div>
  );
}

function WelcomeScreen({
  active,
  onNext,
  onSkip,
}: {
  active: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col px-8 pb-[clamp(1.5rem,4dvh,2rem)] pt-[clamp(1rem,2dvh,1.5rem)]">
      <NavRow onSkip={onSkip} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} className="mb-[clamp(1.75rem,5dvh,2.75rem)]">
          <TimetableVisual active={active} />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <h1 className="text-[clamp(2rem,9.5vw,2.625rem)] font-semibold leading-[1.08] tracking-tight text-foreground">
            Stay
            <br />
            organized.
          </h1>
          <p className="mt-4 max-w-[280px] text-[clamp(0.9375rem,4vw,1rem)] leading-relaxed text-muted-foreground">
            Snap your timetable. We&apos;ll handle the rest.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent active={active} delay={220}>
        <PrimaryButton onClick={onNext}>
          Get Started
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
      </ScreenContent>
      <ProgressDots current={0} />
    </div>
  );
}

/* ============ Screen 2 — How it works ============ */

const FEATURES = [
  {
    icon: Camera,
    title: "Snap",
    description: "Take a photo of your timetable.",
  },
  {
    icon: CalendarDays,
    title: "Organize",
    description: "Schedly turns it into a clean, editable schedule.",
  },
  {
    icon: Bell,
    title: "Remember",
    description: "Get reminded before your class starts.",
  },
];

function FeaturesScreen({
  active,
  onNext,
  onBack,
}: {
  active: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col px-8 pb-[clamp(1.5rem,4dvh,2rem)] pt-[clamp(1rem,2dvh,1.5rem)]">
      <NavRow onBack={onBack} onSkip={onNext} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} delay={100} className="flex flex-col items-center text-center">
          <h2 className="text-[clamp(1.75rem,8vw,2.125rem)] font-semibold leading-[1.1] tracking-tight text-foreground">
            Your schedule,
            <br />
            handled.
          </h2>
          <p className="mt-3 text-[clamp(0.9375rem,4vw,1rem)] text-muted-foreground">Three simple steps. No stress.</p>
        </ScreenContent>

        <div className="mt-[clamp(1.75rem,5dvh,2.5rem)] w-full space-y-3">
          {FEATURES.map((f, i) => (
            <ScreenContent key={f.title} active={active} delay={180 + i * 120}>
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-baseline gap-2 text-[0.9375rem] font-medium text-foreground">
                    <span className="text-xs font-bold tracking-widest text-primary/50">{STEPS[i]}</span>
                    {f.title}
                  </h3>
                  <p className="mt-0.5 text-[0.875rem] leading-snug text-muted-foreground">{f.description}</p>
                </div>
              </div>
            </ScreenContent>
          ))}
        </div>
      </div>

      <ScreenContent active={active} delay={540}>
        <PrimaryButton onClick={onNext}>
          Continue
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
      </ScreenContent>
      <ProgressDots current={1} />
    </div>
  );
}

/* ============ Screen 3 — Get started ============ */

function AuthScreen({ active, onBack }: { active: boolean; onBack: () => void }) {
  return (
    <div className="flex w-full shrink-0 flex-col px-8 pb-[clamp(1.5rem,4dvh,2rem)] pt-[clamp(1rem,2dvh,1.5rem)]">
      <NavRow onBack={onBack} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} className="mb-[clamp(1.75rem,5dvh,2.5rem)]">
          <Mascot variant="celebrate" size="sm" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="text-[clamp(1.875rem,8.5vw,2.25rem)] font-semibold leading-[1.1] tracking-tight text-foreground">
            You&apos;re all set.
          </h2>
          <p className="mt-3 max-w-[260px] text-[clamp(0.9375rem,4vw,1rem)] leading-relaxed text-muted-foreground">
            Sign in to start organizing your schedule.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent
        active={active}
        delay={220}
        className="flex flex-col gap-[clamp(0.75rem,2.5dvh,1rem)]"
      >
        <a
          href="/login"
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[15px] font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
        >
          <Mail className="h-5 w-5" />
          Continue with Email
        </a>

        <div className="mt-1 flex flex-col items-center gap-1.5">
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log In
            </Link>
          </p>
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </ScreenContent>
      <ProgressDots current={2} />
    </div>
  );
}
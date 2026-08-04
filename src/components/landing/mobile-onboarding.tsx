"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";

const LAST_SCREEN = 2;

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
    ? "h-[clamp(8rem,26dvh,13rem)] w-[clamp(8rem,26dvh,13rem)]"
    : "h-[clamp(4.25rem,16dvh,8rem)] w-[clamp(4.25rem,16dvh,8rem)]";
  const anim = variant === "wave" || variant === "celebrate" ? "animate-float" : "";

  return (
    <div className={`relative flex items-center justify-center ${box}`}>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-[32%] bg-neutral-100 ring-1 ring-neutral-200 ${box} ${anim}`}
      >
        <img src="/images/logo.jpg" alt="Schedly" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 text-[15px] font-medium text-white transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="mt-[clamp(0.75rem,2dvh,1.25rem)] flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            i === current ? "w-5 bg-neutral-950" : "h-1.5 w-1.5 bg-neutral-300"
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
          className="flex items-center gap-1 px-1 py-2 text-[15px] font-medium text-neutral-500"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      ) : (
        <span />
      )}
      {onSkip && (
        <button type="button" onClick={onSkip} className="px-1 py-2 text-[15px] font-medium text-neutral-500">
          Skip
        </button>
      )}
    </div>
  );
}

/* ============ Screen 1 — Welcome ============ */

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
        <ScreenContent active={active} className="mb-[clamp(2.25rem,6dvh,3.5rem)]">
          <Mascot variant="wave" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <h1 className="text-[clamp(2rem,9.5vw,2.625rem)] font-semibold leading-[1.08] tracking-tight text-neutral-950">
            Stay
            <br />
            organized.
          </h1>
          <p className="mt-4 max-w-[260px] text-[clamp(0.9375rem,4vw,1rem)] leading-relaxed text-neutral-500">
            Snap your timetable. We&apos;ll handle the rest.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent active={active} delay={220} className="pb-[env(safe-area-inset-bottom)]">
        <PrimaryButton onClick={onNext}>
          Get Started
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
        <ProgressDots current={0} />
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 2 — Features ============ */

const FEATURES = [
  {
    icon: Camera,
    title: "Snap",
    description: "Take a photo of your timetable.",
  },
  {
    icon: CalendarDays,
    title: "Organize",
    description: "The AI organizes it all — quietly.",
  },
  {
    icon: Bell,
    title: "Remember",
    description: "We remind you before class starts.",
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
          <h2 className="text-[clamp(1.75rem,8vw,2.125rem)] font-semibold leading-[1.1] tracking-tight text-neutral-950">
            Your schedule,
            <br />
            handled.
          </h2>
          <p className="mt-3 text-[clamp(0.9375rem,4vw,1rem)] text-neutral-500">Three simple steps. No stress.</p>
        </ScreenContent>

        <div className="mt-[clamp(2rem,6dvh,3rem)] w-full">
          {FEATURES.map((f, i) => (
            <ScreenContent key={f.title} active={active} delay={180 + i * 120}>
              <div className={`flex items-center gap-4 py-[clamp(0.875rem,2.5dvh,1.125rem)] ${i < FEATURES.length - 1 ? "border-b border-neutral-200" : ""}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 ring-1 ring-neutral-200/70">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[0.9375rem] font-medium text-neutral-950">{f.title}</h3>
                  <p className="mt-0.5 text-[0.875rem] leading-snug text-neutral-500">{f.description}</p>
                </div>
              </div>
            </ScreenContent>
          ))}
        </div>
      </div>

      <ScreenContent active={active} delay={540} className="pb-[env(safe-area-inset-bottom)]">
        <PrimaryButton onClick={onNext}>
          Continue
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
        <ProgressDots current={1} />
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 3 — Auth ============ */

function AuthScreen({ active, onBack }: { active: boolean; onBack: () => void }) {
  return (
    <div className="flex w-full shrink-0 flex-col px-8 pb-[clamp(1.5rem,4dvh,2rem)] pt-[clamp(1rem,2dvh,1.5rem)]">
      <NavRow onBack={onBack} onSkip={() => undefined} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} className="mb-[clamp(2.25rem,6dvh,3rem)]">
          <Mascot variant="celebrate" size="sm" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <h2 className="text-[clamp(1.875rem,8.5vw,2.25rem)] font-semibold leading-[1.1] tracking-tight text-neutral-950">
            You&apos;re all set.
          </h2>
          <p className="mt-3 max-w-[260px] text-[clamp(0.9375rem,4vw,1rem)] leading-relaxed text-neutral-500">
            Sign in to start organizing your schedule.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent
        active={active}
        delay={220}
        className="flex flex-col gap-[clamp(1rem,3.5dvh,1.25rem)] pb-[env(safe-area-inset-bottom)]"
      >
        <a
          href="/login"
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-neutral-950 text-[15px] font-medium text-white transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
        >
          <Mail className="h-5 w-5" />
          Continue with Email
        </a>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-neutral-950 underline underline-offset-4">
              Log In
            </Link>
          </p>
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-neutral-500">
            New here?{" "}
            <Link href="/register" className="font-medium text-neutral-950 underline underline-offset-4">
              Create Account
            </Link>
          </p>
        </div>
        <ProgressDots current={2} />
      </ScreenContent>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
  Wand2,
} from "lucide-react";

const LAST_SCREEN = 2;

type MascotVariant = "wave" | "timetable" | "celebrate";

export function MobileOnboarding() {
  const [screen, setScreen] = useState(0);
  const touchX = useRef<number | null>(null);

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
      className="relative h-[100dvh] overflow-hidden bg-[#FAF8F7]"
      style={{
        backgroundImage:
          "radial-gradient(90% 55% at 50% 0%, rgba(252,231,243,0.5), rgba(252,231,243,0) 70%)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Soft blurred background shapes */}
      <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-[#FCE7F3]/45 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-24 h-72 w-72 rounded-full bg-[#FCE9F1]/40 blur-3xl" />

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

/* ============ Mascot — hero, reacts to each screen ============ */

function Mascot({ variant = "wave", size = "lg" }: { variant?: MascotVariant; size?: "lg" | "sm" }) {
  const big = size === "lg";
  const box = big
    ? "h-[clamp(8rem,26dvh,13rem)] w-[clamp(8rem,26dvh,13rem)]"
    : "h-[clamp(4.25rem,16dvh,8rem)] w-[clamp(4.25rem,16dvh,8rem)]";
  const core = big
    ? "h-[clamp(6.5rem,20dvh,10rem)] w-[clamp(6.5rem,20dvh,10rem)] rounded-[24%]"
    : "h-[clamp(3.25rem,12dvh,6rem)] w-[clamp(3.25rem,12dvh,6rem)] rounded-[24%]";
  const shadow = big ? "shadow-[0_28px_60px_rgba(236,72,153,0.3)]" : "shadow-[0_18px_40px_rgba(236,72,153,0.28)]";
  const anim =
    variant === "wave"
      ? "animate-wave-sway"
      : variant === "celebrate"
        ? "animate-bounce-soft"
        : "animate-float";

  return (
    <div className={`relative flex items-center justify-center ${box}`}>
      <div className={`absolute rounded-full bg-gradient-to-b from-[#FCE7F3] to-[#FDE6EE] blur-2xl ${box} ${big ? "opacity-60" : "opacity-50"}`} />

      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#EC4899] to-[#F472B6] ${core} ${shadow} ${anim}`}
      >
        <img src="/images/logo.jpg" alt="Schedly" className="h-full w-full object-cover" />
      </div>

      {variant === "wave" && (
        <div className="animate-float absolute -right-4 -top-3 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#EC4899] shadow-[0_10px_24px_rgba(17,24,39,0.12)] ring-1 ring-black/[0.04] [animation-delay:0.8s]">
          <Sparkles className="h-3 w-3" />
          Welcome!
        </div>
      )}

      {variant === "timetable" && (
        <div className="absolute -bottom-4 -right-5 w-24 rounded-2xl bg-white p-2.5 shadow-[0_14px_30px_rgba(17,24,39,0.16)] ring-1 ring-black/[0.04]">
          <div className="space-y-1.5">
            <div className="h-1.5 w-14 rounded-full bg-[#F472B6]" />
            <div className="h-1.5 w-10 rounded-full bg-[#A5B4FC]" />
            <div className="h-1.5 w-12 rounded-full bg-[#FCD34D]" />
          </div>
        </div>
      )}

      {variant === "celebrate" && (
        <>
          <span className="animate-twinkle absolute -top-1 right-3 h-2.5 w-2.5 rounded-full bg-[#F472B6]" />
          <span className="animate-twinkle absolute -top-4 left-5 h-2 w-2 rounded-full bg-[#818CF8] [animation-delay:0.5s]" />
          <span className="animate-twinkle absolute -left-4 top-4 h-2 w-2 rounded-full bg-[#FBBF24] [animation-delay:1s]" />
          <span className="animate-twinkle absolute -right-5 top-1 h-1.5 w-1.5 rounded-full bg-[#34D399] [animation-delay:1.4s]" />
          <Sparkles className="animate-twinkle absolute -right-2 top-8 h-5 w-5 text-[#F472B6] [animation-delay:0.3s]" />
        </>
      )}
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(236,72,153,0.28)] transition-all duration-200 hover:shadow-[0_16px_36px_rgba(236,72,153,0.36)] active:scale-[0.97]"
    >
      {children}
    </button>
  );
}

function ProgressCapsules({ current }: { current: number }) {
  return (
    <div className="mt-[clamp(0.75rem,2dvh,1.25rem)] flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ease-out ${
            i === current ? "w-7 bg-[#EC4899]" : "w-1.5 bg-[#F3C9D9]"
          }`}
        />
      ))}
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
    <div className="flex w-full shrink-0 flex-col px-6 pb-[clamp(1.25rem,4dvh,2rem)] pt-[clamp(0.75rem,2dvh,1.5rem)]">
      <div className="flex items-center justify-end pb-[clamp(0.5rem,1.5dvh,1rem)]">
        <button type="button" onClick={onSkip} className="px-1 py-2 text-[15px] font-medium text-[#9CA3AF]">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} className="mb-[clamp(1.25rem,5dvh,3rem)]">
          <Mascot variant="wave" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <h1 className="text-[clamp(1.875rem,9.5vw,2.5rem)] font-bold leading-[1.05] tracking-tight text-[#111827]">
            Stay
            <br />
            organized.
          </h1>
          <p className="mt-4 max-w-[260px] text-[clamp(0.875rem,4vw,0.9375rem)] leading-relaxed text-[#6B7280]">
            Snap your timetable. We&apos;ll handle the rest.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent active={active} delay={220} className="pb-[env(safe-area-inset-bottom)]">
        <PrimaryButton onClick={onNext}>
          Get Started
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
        <ProgressCapsules current={0} />
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 2 — Features ============ */

const FEATURE_TILES = [
  {
    icon: Camera,
    title: "Snap",
    description: "Take a photo of your timetable.",
    bg: "bg-[#FCE7F3]",
    color: "text-[#EC4899]",
  },
  {
    icon: Wand2,
    title: "Organize",
    description: "AI extracts every class automatically.",
    bg: "bg-[#EEF2FF]",
    color: "text-[#4F46E5]",
  },
  {
    icon: Bell,
    title: "Remember",
    description: "We remind you before class starts.",
    bg: "bg-[#FEF3C7]",
    color: "text-[#B45309]",
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
    <div className="flex w-full shrink-0 flex-col px-6 pb-[clamp(1.25rem,4dvh,2rem)] pt-[clamp(0.75rem,2dvh,1.5rem)]">
      <div className="flex items-center justify-between pb-[clamp(0.5rem,1.5dvh,1rem)]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-1 py-2 text-[15px] font-medium text-[#9CA3AF]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button type="button" onClick={onNext} className="px-1 py-2 text-[15px] font-medium text-[#9CA3AF]">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,3dvh,1.5rem)]">
        <ScreenContent active={active}>
          <Mascot variant="timetable" size="sm" />
        </ScreenContent>

        <ScreenContent active={active} delay={100} className="flex flex-col items-center text-center">
          <h2 className="text-[clamp(1.625rem,8vw,2rem)] font-bold leading-[1.08] tracking-tight text-[#111827]">
            Your schedule,
            <br />
            handled.
          </h2>
          <p className="mt-3 text-[clamp(0.875rem,4vw,0.9375rem)] text-[#6B7280]">Three simple tools. Zero stress.</p>
        </ScreenContent>

        <div className="flex w-full flex-col gap-[clamp(0.5rem,2dvh,0.75rem)]">
          {FEATURE_TILES.map((f, i) => (
            <ScreenContent key={f.title} active={active} delay={180 + i * 120}>
              <div className="active:scale-touch flex items-center gap-[clamp(0.75rem,2.5vw,1rem)] rounded-[clamp(1.125rem,4dvh,1.375rem)] border border-black/[0.04] bg-white p-[clamp(0.625rem,2dvh,0.875rem)] shadow-[0_2px_12px_rgba(17,24,39,0.05)] transition-all duration-200">
                <div className={`flex h-[clamp(2.25rem,7dvh,3rem)] w-[clamp(2.25rem,7dvh,3rem)] shrink-0 items-center justify-center rounded-[clamp(0.875rem,2.8dvh,1.125rem)] ${f.bg} ${f.color}`}>
                  <f.icon className="h-[clamp(1.25rem,4dvh,1.5rem)] w-[clamp(1.25rem,4dvh,1.5rem)]" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[clamp(0.9375rem,4.5vw,1rem)] font-semibold text-[#111827]">{f.title}</h3>
                  <p className="mt-0.5 text-[clamp(0.8125rem,3.9vw,0.875rem)] leading-snug text-[#6B7280]">{f.description}</p>
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
        <ProgressCapsules current={1} />
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 3 — Auth ============ */

function AuthScreen({ active, onBack }: { active: boolean; onBack: () => void }) {
  return (
    <div className="flex w-full shrink-0 flex-col px-6 pb-[clamp(1.25rem,4dvh,2rem)] pt-[clamp(0.75rem,2dvh,1.5rem)]">
      <div className="flex items-center justify-between pb-[clamp(0.5rem,1.5dvh,1rem)]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-1 py-2 text-[15px] font-medium text-[#9CA3AF]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <Link href="/login" className="px-1 py-2 text-[15px] font-medium text-[#9CA3AF]">
          Skip
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <ScreenContent active={active} className="mb-[clamp(1.25rem,5dvh,2.5rem)]">
          <Mascot variant="celebrate" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center text-center">
          <h2 className="text-[clamp(1.75rem,8.5vw,2.125rem)] font-bold leading-[1.08] tracking-tight text-[#111827]">
            You&apos;re all set.
          </h2>
          <p className="mt-3 max-w-[260px] text-[clamp(0.875rem,4vw,0.9375rem)] leading-relaxed text-[#6B7280]">
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
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#111827] text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(17,24,39,0.2)] transition-all duration-200 hover:shadow-[0_16px_36px_rgba(17,24,39,0.28)] active:scale-[0.97]"
        >
          <Mail className="h-5 w-5" />
          Continue with Email
        </a>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-[#6B7280]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#EC4899]">
              Log In
            </Link>
          </p>
          <p className="text-[clamp(0.8125rem,3.9vw,0.875rem)] text-[#6B7280]">
            New here?{" "}
            <Link href="/register" className="font-semibold text-[#EC4899]">
              Create Account
            </Link>
          </p>
        </div>
        <ProgressCapsules current={2} />
      </ScreenContent>
    </div>
  );
}

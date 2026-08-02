"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
} from "lucide-react";

const LAST_SCREEN = 2;

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
      className="relative h-[100dvh] overflow-hidden bg-[#FFF7FB]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#FCE7F3] blur-3xl" />
        <div className="animate-blob absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-[#FFE4EF] blur-3xl [animation-delay:-5s]" />
        <div className="animate-blob absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-[#FDF2F8] blur-3xl [animation-delay:-10s]" />
      </div>

      {/* Screens carousel */}
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(-${screen * 100}%)` }}
      >
        <SplashScreen active={screen === 0} onNext={() => go(1)} onSkip={() => go(2)} />
        <FeaturesScreen active={screen === 1} onNext={() => go(2)} onBack={() => go(0)} />
        <AuthScreen active={screen === 2} />
      </div>

      {/* Progress dots */}
      <div className="pointer-events-none absolute bottom-7 left-0 right-0 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === screen ? "w-6 bg-[#EC4899]" : "w-2 bg-[#FDA4AF]/50"
            }`}
          />
        ))}
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

function Mascot({ size = "lg" }: { size?: "lg" | "sm" }) {
  const big = size === "lg";
  return (
    <div className={`animate-float relative ${big ? "h-32 w-32" : "h-20 w-20"}`}>
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-b from-[#FCE7F3] to-[#FFD6E7] blur-2xl ${
          big ? "opacity-80" : "opacity-60"
        }`}
      />
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#EC4899] to-[#F472B6] shadow-[0_24px_60px_rgba(236,72,153,0.35)] ${
          big ? "h-32 w-32 rounded-[36px]" : "h-20 w-20 rounded-[22px]"
        }`}
      >
        <img
          src="/images/logo.jpg"
          alt="Schedly"
          className={
            big
              ? "h-[86px] w-[86px] rounded-[28px] object-cover"
              : "h-[54px] w-[54px] rounded-2xl object-cover"
          }
        />
      </div>
      <Sparkles className={`animate-twinkle absolute -right-4 -top-3 text-[#F472B6] ${big ? "h-6 w-6" : "h-4 w-4"}`} />
      <span className="animate-twinkle absolute -left-5 bottom-1 h-2.5 w-2.5 rounded-full bg-[#FDA4AF] [animation-delay:0.9s]" />
      <span className="animate-twinkle absolute -bottom-2 right-6 h-1.5 w-1.5 rounded-full bg-[#F472B6]/70 [animation-delay:1.6s]" />
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_16px_40px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_20px_50px_rgba(236,72,153,0.45)] active:scale-[0.97]"
    >
      {children}
    </button>
  );
}

/* ============ Screen 1 — Splash / Welcome ============ */

function SplashScreen({
  active,
  onNext,
  onSkip,
}: {
  active: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col px-7 pb-14 pt-5">
      <div className="flex justify-end">
        <button type="button" onClick={onSkip} className="px-1 py-2 text-sm font-medium text-[#6B7280]">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-9">
        <ScreenContent active={active}>
          <Mascot />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[36px] font-bold leading-[1.12] tracking-tight text-[#111827]">
            Your classes,{" "}
            <span className="bg-gradient-to-r from-[#EC4899] to-[#FDA4AF] bg-clip-text text-transparent">
              automatically organized.
            </span>
          </h1>
          <p className="max-w-[300px] text-[15px] leading-relaxed text-[#6B7280]">
            Snap a photo of your class schedule. Schedly extracts, organizes, and reminds you automatically.
          </p>
        </ScreenContent>
      </div>

      <ScreenContent active={active} delay={240} className="pb-[env(safe-area-inset-bottom)]">
        <PrimaryButton onClick={onNext}>
          Get Started
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 2 — Features ============ */

const MOBILE_FEATURES = [
  {
    icon: Camera,
    title: "Snap & Extract",
    description: "Upload your timetable and let AI read everything automatically.",
    bg: "bg-[#FCE7F3]",
    color: "text-[#EC4899]",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Receive reminders before every class.",
    bg: "bg-[#EEF2FF]",
    color: "text-[#4F46E5]",
  },
  {
    icon: CalendarDays,
    title: "Weekly Schedule",
    description: "View your timetable in a beautiful organized layout.",
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
    <div className="flex w-full shrink-0 flex-col px-7 pb-14 pt-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full px-1 py-2 text-sm font-medium text-[#6B7280]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button type="button" onClick={onNext} className="px-1 py-2 text-sm font-medium text-[#6B7280]">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <ScreenContent active={active} className="flex flex-col items-center gap-5">
          <Mascot size="sm" />
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">
              Everything you need.
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Three simple tools. Zero stress.
            </p>
          </div>
        </ScreenContent>

        <div className="flex w-full flex-col gap-3.5">
          {MOBILE_FEATURES.map((f, i) => (
            <ScreenContent key={f.title} active={active} delay={120 + i * 130}>
              <div className="flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.06)]">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${f.bg} ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#111827]">{f.title}</h3>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#6B7280]">{f.description}</p>
                </div>
              </div>
            </ScreenContent>
          ))}
        </div>
      </div>

      <ScreenContent active={active} delay={520} className="pb-[env(safe-area-inset-bottom)]">
        <PrimaryButton onClick={onNext}>
          Continue
          <ChevronRight className="h-5 w-5" />
        </PrimaryButton>
      </ScreenContent>
    </div>
  );
}

/* ============ Screen 3 — Authentication ============ */

function AuthScreen({ active }: { active: boolean }) {
  return (
    <div className="flex w-full shrink-0 flex-col px-7 pb-14 pt-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <ScreenContent active={active}>
          <Mascot size="sm" />
        </ScreenContent>

        <ScreenContent active={active} delay={120} className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">
            Join Schedly
          </h2>
          <p className="max-w-[280px] text-sm leading-relaxed text-[#6B7280]">
            Sign in to start organizing your class schedule.
          </p>
        </ScreenContent>

        <ScreenContent active={active} delay={220} className="flex w-full flex-col gap-3.5">
          <a
            href="/login"
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-[15px] font-semibold text-white shadow-[0_16px_40px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_20px_50px_rgba(236,72,153,0.45)] active:scale-[0.97]"
          >
            <Mail className="h-5 w-5" />
            Continue with Email
          </a>
        </ScreenContent>

        <ScreenContent active={active} delay={320} className="flex flex-col items-center gap-2.5 pb-[env(safe-area-inset-bottom)]">
          <p className="text-sm text-[#6B7280]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#EC4899]">
              Login
            </Link>
          </p>
          <p className="text-sm text-[#6B7280]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#EC4899]">
              Create Account
            </Link>
          </p>
        </ScreenContent>
      </div>
    </div>
  );
}


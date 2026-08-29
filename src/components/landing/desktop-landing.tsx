import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DesktopLanding() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#09090b", color: "#fff" }}>

      {/* FLOATING NAV — centered pill */}
      <div className="sticky top-0 z-50 pt-4 pointer-events-none">
        <div className="container mx-auto max-w-6xl px-6">
          <header
            className="pointer-events-auto flex h-14 items-center justify-between rounded-full border px-4 md:px-6"
            style={{
              background: "rgba(9,9,11,0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.jpg" alt="" aria-hidden width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
              <span className="text-base font-bold tracking-tight text-white">Schedly</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full text-white/80 hover:bg-white/10 hover:text-white">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full font-semibold px-4" style={{ background: "#fff", color: "#09090b" }}>
                  Get started
                </Button>
              </Link>
            </div>
          </header>
        </div>
      </div>

      <main className="flex-1">

        {/* ── BENTO HERO ── */}
        <section className="container mx-auto max-w-6xl px-6 pt-16 pb-12">
          {/* BENTO GRID */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>

            {/* ── HERO TEXT — spans 7 cols ── */}
            <div style={{ gridColumn: "span 7" }}>
              <div className="rounded-3xl border p-8 md:p-10 h-full" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h1 className="font-bold tracking-tight leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                  Your class schedule,<br />made{" "}
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>simple.</span>
                </h1>
                <p className="mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>
                  Upload a photo of your schedule. Schedly turns it into an interactive timetable &mdash; with your classes, times, rooms, and reminders.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/register">
                    <Button size="lg" className="rounded-full px-8 font-semibold" style={{ background: "#fff", color: "#09090b" }}>
                      Get started free
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="ghost" className="rounded-full px-6 text-white/60 hover:text-white hover:bg-white/5">
                      See how it works &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN — 5 cols: stats stacked, then schedule ── */}
            <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="rounded-3xl border p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl font-bold" style={{ color: "#fff" }}>10s</div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Average extraction</div>
                </div>
                <div className="rounded-3xl border p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl font-bold" style={{ color: "#fff" }}>100%</div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Free, no card</div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="rounded-3xl border px-4 py-2 text-center text-xs font-medium" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.45)" }}>
                Free forever. No credit card required.
              </div>

              {/* Schedule mockup */}
              <div className="rounded-3xl border p-6" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-white/30" />
                    <div className="h-2 w-2 rounded-full bg-white/30" />
                    <div className="h-2 w-2 rounded-full bg-white/30" />
                    <span className="ml-2 text-[11px] font-mono text-white/40">schedule.pdf</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">Live</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-[11px]">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div key={d} className="py-2 text-center font-medium text-white/30">{d}</div>
                  ))}
                  {[
                    { label: "Math 101", time: "9:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                    { label: "Math 101", time: "9:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                    { label: "Math 101", time: "9:00", c: "bg-white/10 text-white/70" },
                  ].map((c, i) => (
                    <div key={`r0-${i}`} className={`min-h-[48px] rounded-xl px-2 py-1.5 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[10px]">{c.label}</span>}
                      {c.time && <span className="block text-[9px] text-white/40">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "CS 201", time: "11:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                    { label: "CS 201", time: "11:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                  ].map((c, i) => (
                    <div key={`r1-${i}`} className={`min-h-[48px] rounded-xl px-2 py-1.5 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[10px]">{c.label}</span>}
                      {c.time && <span className="block text-[9px] text-white/40">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "Phys 301", time: "14:00", c: "bg-white/10 text-white/70" },
                    { label: "Phys 301", time: "14:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                    { label: "Phys 301", time: "14:00", c: "bg-white/10 text-white/70" },
                  ].map((c, i) => (
                    <div key={`r2-${i}`} className={`min-h-[48px] rounded-xl px-2 py-1.5 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[10px]">{c.label}</span>}
                      {c.time && <span className="block text-[9px] text-white/40">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "", c: "bg-transparent" },
                    { label: "Eng 102", time: "16:00", c: "bg-white/10 text-white/70" },
                    { label: "Eng 102", time: "16:00", c: "bg-white/10 text-white/70" },
                    { label: "", c: "bg-transparent" },
                  ].map((c, i) => (
                    <div key={`r3-${i}`} className={`min-h-[48px] rounded-xl px-2 py-1.5 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[10px]">{c.label}</span>}
                      {c.time && <span className="block text-[9px] text-white/40">{c.time}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="rounded-3xl border p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl font-bold" style={{ color: "#fff" }}>24/7</div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Smart reminders</div>
                </div>
                <div className="rounded-3xl border p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-4xl font-bold" style={{ color: "#fff" }}>0</div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Tools to juggle</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── PROBLEM → PROMISE ── */}
        <section className="container mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-3xl border p-8 md:p-10" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Problem &rarr; Promise
            </p>
            <h2 className="font-bold tracking-tight leading-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
              Outbound is broken when tools don&apos;t work together.
            </h2>
            <p className="mt-4 leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.5)" }}>
              Your team shouldn&apos;t stitch together lead lists, enrichment, copy, video, sequences, and tracking. Schedly replaces the messy stack with one simple workflow.
            </p>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="container mx-auto max-w-6xl px-6 py-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Features</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Built for student life.
            </h2>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              Everything you need to stay on top of your classes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="container mx-auto max-w-6xl px-6 py-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>How it works</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              From photo to timetable.
            </h2>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              Three steps. Five seconds. Your whole week sorted.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-8 -right-2 z-10 hidden h-px w-8 md:block" style={{ background: "rgba(255,255,255,0.15)" }} />
                )}
                <div className="rounded-3xl border p-8 h-full" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                    {step.n}
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="container mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-3xl border p-10 md:p-14 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Stop checking your schedule manually.
            </h2>
            <p className="mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
              Let Schedly organize your classes so you always know what&apos;s next.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-10 font-semibold" style={{ background: "#fff", color: "#09090b" }}>
                  Get started free &rarr;
                </Button>
              </Link>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No credit card. No catch. Just your schedule, sorted.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-semibold text-white">Schedly</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            &copy; {new Date().getFullYear()} Schedly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="rounded-3xl border p-7 transition-all duration-200 hover:bg-white/5"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
        {icon}
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Schedule Scanner",
    desc: "Upload a photo of your class schedule and let AI turn it into an interactive timetable.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Class Reminders",
    desc: "Get reminded when your next class is coming up so you know what's next.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: "Weekly Schedule",
    desc: "See your classes from Monday to Saturday in one clean, organized view.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Easy to Edit",
    desc: "Review your extracted schedule and make changes whenever something needs updating.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Works Anywhere",
    desc: "Check your schedule from your phone, laptop, or installed PWA.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Your Schedule, Your Data",
    desc: "Keep your schedule private and securely connected to your account.",
  },
];

const STEPS = [
  { n: "1", title: "Upload", desc: "Take a photo or upload your class schedule." },
  { n: "2", title: "Schedly Scans", desc: "AI extracts your subjects, times, rooms, and details." },
  { n: "3", title: "Check & Save", desc: "Review results, make changes, and save your timetable." },
];

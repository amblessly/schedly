import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DesktopLanding() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">

      {/* FLOATING NAV — centered pill */}
      <div className="sticky top-0 z-50 pt-4 pointer-events-none">
        <div className="container mx-auto max-w-6xl px-6">
          <header
            className="pointer-events-auto flex h-14 items-center justify-between rounded-full border bg-card px-4 md:px-6 shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/logo.jpg" alt="" aria-hidden width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
              <span className="text-base font-bold tracking-tight text-foreground">Schedly</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full font-semibold px-4">
                  Get started
                </Button>
              </Link>
            </div>
          </header>
        </div>
      </div>

      <main className="flex-1">

        {/* ── BENTO HERO ── */}
        <section className="container mx-auto max-w-6xl px-6 pt-10 pb-8">
          <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>

            {/* ── HERO TEXT — 7 cols ── */}
            <div style={{ gridColumn: "span 7" }}>
              <div className="rounded-3xl border p-7 md:p-8" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <h1 className="font-bold tracking-tight leading-[1.05]" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "var(--foreground)" }}>
                  Your class schedule,<br />made simple.
                </h1>
                <p className="mt-3 leading-relaxed" style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                  Upload a photo of your schedule. Schedly turns it into an interactive timetable.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link href="/register">
                    <Button size="default" className="rounded-full px-6 font-semibold shadow-sm">
                      Get started free
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="default" variant="ghost" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
                      See how it works &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN — 5 cols: stacked ── */}
            <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="rounded-2xl border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>10s</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>Average extraction</div>
                </div>
                <div className="rounded-2xl border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>100%</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>Free, no card</div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="rounded-2xl border px-3 py-1.5 text-center text-[11px] font-medium" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--muted-foreground)" }}>
                Free forever. No credit card required.
              </div>

              {/* Schedule mockup */}
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                    <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">schedule.pdf</span>
                  </div>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] text-muted-foreground border" style={{ borderColor: "var(--border)" }}>Live</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div key={d} className="py-1.5 text-center font-medium text-muted-foreground">{d}</div>
                  ))}
                  {[
                    { label: "Math 101", time: "9:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                    { label: "Math 101", time: "9:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                    { label: "Math 101", time: "9:00", c: "bg-primary/10 text-foreground" },
                  ].map((c, i) => (
                    <div key={`r0-${i}`} className={`min-h-[40px] rounded-lg px-1.5 py-1 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[9px]">{c.label}</span>}
                      {c.time && <span className="block text-[8px] text-muted-foreground">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "CS 201", time: "11:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                    { label: "CS 201", time: "11:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                  ].map((c, i) => (
                    <div key={`r1-${i}`} className={`min-h-[40px] rounded-lg px-1.5 py-1 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[9px]">{c.label}</span>}
                      {c.time && <span className="block text-[8px] text-muted-foreground">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "Phys 301", time: "14:00", c: "bg-primary/10 text-foreground" },
                    { label: "Phys 301", time: "14:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                    { label: "Phys 301", time: "14:00", c: "bg-primary/10 text-foreground" },
                  ].map((c, i) => (
                    <div key={`r2-${i}`} className={`min-h-[40px] rounded-lg px-1.5 py-1 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[9px]">{c.label}</span>}
                      {c.time && <span className="block text-[8px] text-muted-foreground">{c.time}</span>}
                    </div>
                  ))}
                  {[
                    { label: "", c: "bg-transparent" },
                    { label: "", c: "bg-transparent" },
                    { label: "Eng 102", time: "16:00", c: "bg-primary/10 text-foreground" },
                    { label: "Eng 102", time: "16:00", c: "bg-primary/10 text-foreground" },
                    { label: "", c: "bg-transparent" },
                  ].map((c, i) => (
                    <div key={`r3-${i}`} className={`min-h-[40px] rounded-lg px-1.5 py-1 ${c.c}`}>
                      {c.label && <span className="block font-semibold text-[9px]">{c.label}</span>}
                      {c.time && <span className="block text-[8px] text-muted-foreground">{c.time}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="rounded-2xl border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>24/7</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>Smart reminders</div>
                </div>
                <div className="rounded-2xl border p-4 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>0</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>Tools to juggle</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── PROBLEM → PROMISE ── */}
        <section className="container mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-3xl border p-8 md:p-10" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">
              Problem &rarr; Promise
            </p>
            <h2 className="font-bold tracking-tight leading-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", color: "var(--foreground)" }}>
              Outbound is broken when tools don&apos;t work together.
            </h2>
            <p className="mt-4 leading-relaxed max-w-2xl" style={{ color: "var(--muted-foreground)" }}>
              Your team shouldn&apos;t stitch together lead lists, enrichment, copy, video, sequences, and tracking. Schedly replaces the messy stack with one simple workflow.
            </p>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="container mx-auto max-w-6xl px-6 py-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-muted-foreground">Features</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--foreground)" }}>
              Built for student life.
            </h2>
            <p className="mt-2 text-muted-foreground">
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
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-muted-foreground">How it works</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--foreground)" }}>
              From photo to timetable.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Three steps. Five seconds. Your whole week sorted.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-8 -right-2 z-10 hidden h-px w-8 md:block" style={{ background: "var(--border)" }} />
                )}
                <div className="rounded-3xl border p-8 h-full" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold bg-primary/10 text-foreground">
                    {step.n}
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="container mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-3xl border p-10 md:p-14 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--foreground)" }}>
              Stop checking your schedule manually.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Let Schedly organize your classes so you always know what&apos;s next.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-10 font-semibold shadow-sm">
                  Get started free &rarr;
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                No credit card. No catch. Just your schedule, sorted.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-semibold text-foreground">Schedly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="text-sm text-muted-foreground">
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
      className="rounded-3xl border p-7 transition-all duration-200 hover:shadow-md"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Schedule Scanner",
    desc: "Upload a photo of your class schedule and let AI turn it into an interactive timetable.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Class Reminders",
    desc: "Get reminded when your next class is coming up so you know what&apos;s next.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: "Weekly Schedule",
    desc: "See your classes from Monday to Saturday in one clean, organized view.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Easy to Edit",
    desc: "Review your extracted schedule and make changes whenever something needs updating.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Works Anywhere",
    desc: "Check your schedule from your phone, laptop, or installed PWA.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--foreground)" }}>
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

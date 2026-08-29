import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DesktopLanding() {
  return (
    <div className="flex flex-col min-h-screen font-sans" style={{ background: "#0A0A0A" }}>

      {/* NAV — glass bar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/logo.jpg"
              alt=""
              aria-hidden
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="text-lg font-bold tracking-tight text-white">Schedly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="rounded-full font-semibold px-4 active:scale-95 transition-transform"
                style={{ background: "#FDE047", color: "#0A0A0A" }}
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── HERO — cyber yellow liquid section ── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "#FDE047",
            borderBottomRightRadius: "120px",
            borderBottomLeftRadius: "40px",
          }}
        >
          {/* subtle wave clip at the bottom edge */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 40% at 50% 110%, #0A0A0A 60%, transparent 100%)",
            }}
          />
          <div className="relative container mx-auto max-w-6xl px-6 pt-20 pb-40">
            {/* trust pill */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/5 px-4 py-1.5 text-sm font-semibold text-black/80">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: "#0A0A0A" }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#0A0A0A" }} />
              </span>
              Free forever &mdash; no credit card
            </div>

            {/* massive headline */}
            <h1
              className="text-left font-bold tracking-tight leading-[1.03]"
              style={{ fontSize: "clamp(3rem, 8vw, 6rem)", color: "#0A0A0A" }}
            >
              Your class schedule,{" "}
              <br className="hidden md:block" />
              made{" "}
              <span
                style={{
                  WebkitTextStroke: "2px #0A0A0A",
                  color: "transparent",
                }}
              >
                simple.
              </span>
            </h1>

            <p
              className="mt-6 max-w-xl text-left leading-relaxed"
              style={{
                fontSize: "clamp(0.95rem, 1.4vw, 1.125rem)",
                color: "rgba(10,10,10,0.65)",
              }}
            >
              Upload a photo of your class schedule. Schedly turns it into an interactive
              timetable &mdash; subjects, times, rooms, reminders. All in under ten seconds.
            </p>

            {/* pill CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="rounded-full px-8 font-semibold shadow-2xl active:scale-95 transition-transform"
                  style={{ background: "#0A0A0A", color: "#FFFFFF" }}
                >
                  Get started free
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-2 border-black/20 px-8 font-semibold text-black active:scale-95 transition-transform hover:bg-black/5"
                  style={{ background: "transparent" }}
                >
                  See how it works
                </Button>
              </Link>
            </div>

            {/* social proof micro-line */}
            <p
              className="mt-6 text-left text-xs uppercase tracking-widest"
              style={{ color: "rgba(10,10,10,0.5)" }}
            >
              Built for students &middot; No app install &middot; Works on any device
            </p>

            {/* glassmorphic timetable mockup */}
            <div
              className="mt-12 max-w-3xl rounded-[32px] p-6 text-left"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(28px) saturate(160%)",
                WebkitBackdropFilter: "blur(28px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 32px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {/* glass header bar */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/55" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/55" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/55" />
                  <span className="ml-2 rounded-md px-2 py-0.5 text-[11px] font-mono text-black/50">
                    schedule.pdf
                  </span>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: "#FDE047", color: "#0A0A0A" }}
                >
                  Live
                </span>
              </div>

              {/* weekly grid */}
              <div className="grid grid-cols-5 gap-3 text-xs">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                  <div
                    key={day}
                    className="rounded-2xl py-2 text-center font-bold text-black/55"
                  >
                    {day}
                  </div>
                ))}

                {/* Row 1 */}
                {[
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.45)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.45)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.45)" },
                ].map((c, i) => (
                  <ClassCell key={`r1-${i}`} {...c} />
                ))}

                {/* Row 2 */}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "CS 201", time: "11:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "CS 201", time: "11:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                ].map((c, i) => (
                  <ClassCell key={`r2-${i}`} {...c} dark />
                ))}

                {/* Row 3 */}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(10,10,10,0.85)" },
                ].map((c, i) => (
                  <ClassCell key={`r3-${i}`} {...c} dark />
                ))}

                {/* Row 4 */}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Eng 102", time: "16:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "Eng 102", time: "16:00", bg: "rgba(10,10,10,0.85)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                ].map((c, i) => (
                  <ClassCell key={`r4-${i}`} {...c} dark />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS — dark void ── */}
        <section>
          <div className="container mx-auto max-w-6xl px-6">
            <div
              className="grid grid-cols-2 md:grid-cols-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              {[
                { value: "10s", label: "Average extraction time" },
                { value: "100%", label: "Free forever, no card" },
                { value: "24/7", label: "Smart class reminders" },
                { value: "0", label: "Tools to juggle" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`px-6 py-10 text-center ${i !== 3 ? "md:border-r" : ""} border-b md:border-b-0`}
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="font-bold tracking-tight"
                    style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", color: "#FDE047" }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="mt-1 text-[11px] uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES — charcoal ── */}
        <section id="features" style={{ background: "#171717" }}>
          <div className="container mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="mb-16 text-left">
              <p
                className="mb-3 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#FDE047" }}
              >
                Features
              </p>
              <h2
                className="font-bold tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#FFFFFF" }}
              >
                Built for<br />student life.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — onyx with yellow accent ── */}
        <section id="how-it-works" style={{ background: "#0A0A0A" }}>
          <div className="container mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="mb-16 text-left">
              <p
                className="mb-3 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#FDE047" }}
              >
                How it works
              </p>
              <h2
                className="font-bold tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#FFFFFF" }}
              >
                From photo<br />to timetable.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.n} className="relative">
                  {/* connector line between cards */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="absolute top-1/2 hidden h-0.5 -translate-y-1/2 md:block"
                      aria-hidden
                      style={{
                        left: "calc(100% + 12px)",
                        width: "calc(100% - 24px)",
                        maxWidth: "12px",
                        background: "rgba(253,224,71,0.35)",
                      }}
                    />
                  )}
                  <div
                    className="rounded-[32px] p-8"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(20px) saturate(160%)",
                      WebkitBackdropFilter: "blur(20px) saturate(160%)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full font-bold"
                      style={{ background: "#FDE047", color: "#0A0A0A" }}
                    >
                      {step.n}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA — yellow liquid ── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "#FDE047",
            borderTopRightRadius: "40px",
            borderTopLeftRadius: "120px",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,0,0,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="relative container mx-auto max-w-3xl px-6 py-24 text-center md:py-36">
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#0A0A0A" }}
            >
              Stop checking your schedule manually.
            </h2>
            <p
              className="mx-auto mt-4 max-w-md text-base"
              style={{ color: "rgba(10,10,10,0.6)" }}
            >
              Let Schedly organize your classes so you always know what&apos;s next.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href="/register">
                <Button
                  size="lg"
                  className="rounded-full px-12 font-bold shadow-2xl active:scale-95 transition-transform"
                  style={{ fontSize: "1rem", background: "#0A0A0A", color: "#FFFFFF" }}
                >
                  Get started free &rarr;
                </Button>
              </Link>
              <p className="text-sm" style={{ color: "rgba(10,10,10,0.5)" }}>
                No credit card. No catch. Just your schedule, sorted.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER — deep void ── */}
      <footer style={{ background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.jpg"
              alt=""
              aria-hidden
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="text-sm font-semibold text-white">Schedly</span>
          </div>
          <div
            className="flex items-center gap-6 text-sm"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            &copy; {new Date().getFullYear()} Schedly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ClassCell({
  label,
  time,
  bg,
  dark = false,
}: {
  label: string;
  time?: string;
  bg: string;
  dark?: boolean;
}) {
  return (
    <div
      className="min-h-[56px] rounded-2xl px-3 py-2 text-center"
      style={{ background: bg }}
    >
      {label && (
        <span
          className="block font-bold text-[11px]"
          style={{ color: dark ? "#FDE047" : "#0A0A0A" }}
        >
          {label}
        </span>
      )}
      {time && (
        <span
          className="block text-[10px]"
          style={{ color: dark ? "rgba(253,224,71,0.6)" : "rgba(10,10,10,0.5)" }}
        >
          {time}
        </span>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="group rounded-[32px] p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "#FDE047", color: "#0A0A0A" }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {desc}
      </p>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Schedule Scanner",
    desc: "Upload a photo of your class schedule and let AI turn it into an interactive timetable.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Class Reminders",
    desc: "Get reminded when your next class is coming up so you know what's next.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: "Weekly Schedule",
    desc: "See your classes from Monday to Saturday in one clean, organized view.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Easy to Edit",
    desc: "Review your extracted schedule and make changes whenever something needs updating.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Works Anywhere",
    desc: "Check your schedule from your phone, laptop, or installed PWA.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Your Schedule, Your Data",
    desc: "Keep your schedule private and securely connected to your account.",
  },
];

const STEPS = [
  { n: "01", title: "Upload", desc: "Take a photo or upload your class schedule." },
  { n: "02", title: "Schedly Scans", desc: "AI extracts your subjects, times, rooms, and details." },
  { n: "03", title: "Check & Save", desc: "Review results, make changes, and save your timetable." },
];

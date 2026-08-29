import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DesktopLanding() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0A0A0A" }}>

      {/* NAV — glass bar */}
      <header className="sticky top-0 z-50 border-b border-white/10" style={{ background: "rgba(10,10,10,0.8)", backdropFilter: "blur(20px)" }}>
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-white">Schedly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold" style={{ background: "#FDE047", color: "#0A0A0A" }}>
                Get started free
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
          {/* wave clip at bottom */}
          <div className="pointer-events-none absolute inset-0" aria-hidden
            style={{
              background: "radial-gradient(ellipse 80% 40% at 50% 110%, #0A0A0A 60%, transparent 100%)",
            }}
          />
          <div className="relative container mx-auto max-w-5xl px-6 pt-20 pb-40">
            {/* pill badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold text-black/70">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#0A0A0A" }} />
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
              <span style={{ WebkitTextStroke: "2px #0A0A0A", color: "transparent" }}>simple.</span>
            </h1>

            <p
              className="mt-6 max-w-lg text-left leading-relaxed"
              style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)", color: "rgba(10,10,10,0.6)" }}
            >
              Upload a photo of your schedule. Schedly turns it into an
              interactive timetable &mdash; classes, times, rooms, reminders.
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
                  className="rounded-full border-2 border-black/20 px-8 font-semibold text-black active:scale-95 transition-transform"
                  style={{ background: "transparent" }}
                >
                  See how it works
                </Button>
              </Link>
            </div>

            {/* glassmorphic timetable mockup */}
            <div
              className="mt-14 max-w-3xl rounded-[32px] border p-6 text-left"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderColor: "rgba(255,255,255,0.3)",
                borderWidth: "1px",
                boxShadow: "0 32px 64px rgba(0,0,0,0.2)",
              }}
            >
              <div className="mb-5 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
                <span className="ml-2 rounded-md px-2 py-0.5 text-xs font-mono text-white/50">schedule.pdf</span>
              </div>
              <div className="grid grid-cols-5 gap-3 text-xs">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                  <div key={day} className="rounded-2xl p-3 text-center font-bold text-black/60">{day}</div>
                ))}

                {[
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.4)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.4)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Math 101", time: "9:00", bg: "rgba(255,255,255,0.4)" },
                ].map((item, i) => (
                  <div key={`r0-${i}`} className="min-h-[56px] rounded-2xl p-3 text-center" style={{ background: item.bg }}>
                    {item.label && <span className="block font-bold text-black/80 text-[11px]">{item.label}</span>}
                    {item.time && <span className="block text-[10px] text-black/50">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "CS 201", time: "11:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "CS 201", time: "11:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                ].map((item, i) => (
                  <div key={`r1-${i}`} className="min-h-[56px] rounded-2xl p-3 text-center" style={{ background: item.bg }}>
                    {item.label && <span className="block font-bold text-black/80 text-[11px]">{item.label}</span>}
                    {item.time && <span className="block text-[10px] text-black/50">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Phys 301", time: "14:00", bg: "rgba(0,0,0,0.12)" },
                ].map((item, i) => (
                  <div key={`r2-${i}`} className="min-h-[56px] rounded-2xl p-3 text-center" style={{ background: item.bg }}>
                    {item.label && <span className="block font-bold text-black/80 text-[11px]">{item.label}</span>}
                    {item.time && <span className="block text-[10px] text-black/50">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                  { label: "Eng 102", time: "16:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "Eng 102", time: "16:00", bg: "rgba(0,0,0,0.12)" },
                  { label: "", bg: "rgba(0,0,0,0.05)" },
                ].map((item, i) => (
                  <div key={`r3-${i}`} className="min-h-[56px] rounded-2xl p-3 text-center" style={{ background: item.bg }}>
                    {item.label && <span className="block font-bold text-black/80 text-[11px]">{item.label}</span>}
                    {item.time && <span className="block text-[10px] text-black/50">{item.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS — dark void ── */}
        <section>
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                { value: "10s", label: "Average extraction time" },
                { value: "100%", label: "Free forever, no card" },
                { value: "24/7", label: "Smart class reminders" },
                { value: "0", label: "Tools to juggle" },
              ].map((stat) => (
                <div key={stat.label} className="border-r border-b px-6 py-8 text-center last:border-r-0 md:border-r" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="font-bold" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "#FDE047" }}>{stat.value}</div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES — charcoal ── */}
        <section id="features" style={{ background: "#171717" }}>
          <div className="container mx-auto max-w-5xl px-6 py-24 md:py-32">
            {/* section label */}
            <div className="mb-12 text-left">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#FDE047" }}>Features</p>
              <h2
                className="font-bold tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#FFFFFF" }}
              >
                Built for<br />student life
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
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
                  desc: "Get reminded when your next class is coming up so you know what&apos;s next.",
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
              ].map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — onyx with yellow accent ── */}
        <section id="how-it-works" style={{ background: "#0A0A0A" }}>
          <div className="container mx-auto max-w-5xl px-6 py-24 md:py-32">
            <div className="mb-16 text-left">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#FDE047" }}>How it works</p>
              <h2
                className="font-bold tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#FFFFFF" }}
              >
                From photo<br />to timetable
              </h2>
            </div>

            {/* glassmorphic step cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { n: "01", title: "Upload", desc: "Take a photo or upload your class schedule." },
                { n: "02", title: "Schedly Scans", desc: "AI extracts your subjects, times, rooms, and details." },
                { n: "03", title: "Check & Save", desc: "Review results, make changes, and save your timetable." },
              ].map((step, i, arr) => (
                <div key={step.n} className="relative">
                  {/* connector line */}
                  {i < arr.length - 1 && (
                    <div
                      className="absolute -right-3 top-8 z-10 hidden w-6 md:block"
                      style={{ left: "calc(100% + 8px)", width: "calc(100% - 16px)" }}
                    >
                      <div className="h-0.5 w-full" style={{ background: "rgba(253,224,71,0.3)" }} />
                    </div>
                  )}
                  <div
                    className="rounded-[32px] border p-8"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderWidth: "1px",
                    }}
                  >
                    <div
                      className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full font-bold"
                      style={{ fontSize: "1.125rem", color: "#0A0A0A", background: "#FDE047" }}
                    >
                      {step.n}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA — yellow liquid ── */}
        <section
          className="relative overflow-hidden"
          style={{ background: "#FDE047", borderTopRightRadius: "40px", borderTopLeftRadius: "120px" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,0,0,0.08) 0%, transparent 70%)" }}
          />
          <div className="relative container mx-auto max-w-3xl px-6 py-24 text-center md:py-36">
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "#0A0A0A" }}
            >
              Stop checking your schedule manually.
            </h2>
            <p className="mt-4 text-base" style={{ color: "rgba(10,10,10,0.6)" }}>
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
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-semibold text-white">Schedly</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
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

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="group rounded-[32px] border p-7 transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: "1px",
      }}
    >
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-black transition-colors"
        style={{ background: "#FDE047" }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
    </div>
  );
}

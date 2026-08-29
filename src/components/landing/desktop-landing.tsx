import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DesktopLanding() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-foreground">Schedly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute left-1/2 top-[-20rem] h-[700px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_28%,transparent),transparent)]" />
            <div className="animate-blob absolute left-[8%] top-[35%] h-72 w-72 rounded-full bg-primary/[0.06] blur-[80px]" />
            <div className="animate-blob absolute right-[6%] top-[60%] h-56 w-56 rounded-full bg-primary/[0.05] blur-[70px] [animation-delay:-7s]" />
            <div className="animate-blob absolute bottom-[8%] left-[40%] h-64 w-64 rounded-full bg-primary/[0.04] blur-[90px] [animation-delay:-11s]" />
          </div>
          <div className="relative container mx-auto flex flex-col items-center gap-8 px-4 pt-24 pb-20 text-center md:pt-36 md:pb-32">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary [animation-delay:0ms]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              AI-powered schedule extraction
            </div>
            <h1 className="animate-fade-up max-w-4xl text-5xl font-bold tracking-tight text-foreground leading-[1.08] sm:text-6xl md:text-7xl [animation-delay:60ms]">
              Your class schedule,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                made simple.
              </span>
            </h1>
            <p className="animate-fade-up max-w-xl text-lg text-muted-foreground leading-relaxed md:text-xl [animation-delay:120ms]">
              Upload a photo of your schedule and let Schedly turn it into an
              interactive timetable &mdash; complete with your classes, times,
              rooms, and reminders.
            </p>
            <div className="animate-fade-up flex flex-col gap-3 [animation-delay:200ms] sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30">
                  Get started free
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="px-8 transition-transform hover:-translate-y-0.5">
                  See how it works &darr;
                </Button>
              </Link>
            </div>

            {/* Mock timetable preview */}
            <div className="animate-fade-up mt-8 w-full max-w-3xl rounded-2xl border-2 border-border bg-card/80 p-8 shadow-[0_8px_0_0_hsl(var(--border)) backdrop-blur-sm [animation-delay:400ms]">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-green-400/70" />
                <span className="ml-2 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">schedule.pdf</span>
              </div>
              <div className="grid grid-cols-5 gap-3 text-xs">
                <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">Mon</div>
                <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">Tue</div>
                <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">Wed</div>
                <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">Thu</div>
                <div className="rounded-xl bg-primary/10 p-3 text-center font-bold text-primary">Fri</div>

                {[
                  { label: "Math 101", time: "9:00", bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400", col: 0 },
                  { label: "", time: "", bg: "bg-muted/20", col: 1 },
                  { label: "Math 101", time: "9:00", bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400", col: 2 },
                  { label: "", time: "", bg: "bg-muted/20", col: 3 },
                  { label: "Math 101", time: "9:00", bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400", col: 4 },
                ].map((item, i) => (
                  <div
                    key={`r0-${i}`}
                    className={`rounded-xl p-3 text-center min-h-[52px] flex flex-col items-center justify-center ${item.bg}`}
                  >
                    {item.label && <span className="font-semibold leading-tight text-xs">{item.label}</span>}
                    {item.time && <span className="text-[10px] opacity-70">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", time: "", bg: "bg-muted/20", col: 0 },
                  { label: "CS 201", time: "11:00", bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400", col: 1 },
                  { label: "", time: "", bg: "bg-muted/20", col: 2 },
                  { label: "CS 201", time: "11:00", bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400", col: 3 },
                  { label: "", time: "", bg: "bg-muted/20", col: 4 },
                ].map((item, i) => (
                  <div
                    key={`r1-${i}`}
                    className={`rounded-xl p-3 text-center min-h-[52px] flex flex-col items-center justify-center ${item.bg}`}
                  >
                    {item.label && <span className="font-semibold leading-tight text-xs">{item.label}</span>}
                    {item.time && <span className="text-[10px] opacity-70">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", time: "", bg: "bg-muted/20", col: 0 },
                  { label: "Phys 301", time: "14:00", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", col: 1 },
                  { label: "Phys 301", time: "14:00", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", col: 2 },
                  { label: "", time: "", bg: "bg-muted/20", col: 3 },
                  { label: "Phys 301", time: "14:00", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", col: 4 },
                ].map((item, i) => (
                  <div
                    key={`r2-${i}`}
                    className={`rounded-xl p-3 text-center min-h-[52px] flex flex-col items-center justify-center ${item.bg}`}
                  >
                    {item.label && <span className="font-semibold leading-tight text-xs">{item.label}</span>}
                    {item.time && <span className="text-[10px] opacity-70">{item.time}</span>}
                  </div>
                ))}
                {[
                  { label: "", time: "", bg: "bg-muted/20", col: 0 },
                  { label: "", time: "", bg: "bg-muted/20", col: 1 },
                  { label: "Eng 102", time: "16:00", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400", col: 2 },
                  { label: "Eng 102", time: "16:00", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400", col: 3 },
                  { label: "", time: "", bg: "bg-muted/20", col: 4 },
                ].map((item, i) => (
                  <div
                    key={`r3-${i}`}
                    className={`rounded-xl p-3 text-center min-h-[52px] flex flex-col items-center justify-center ${item.bg}`}
                  >
                    {item.label && <span className="font-semibold leading-tight text-xs">{item.label}</span>}
                    {item.time && <span className="text-[10px] opacity-70">{item.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border/40 bg-secondary/10">
          <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                Features
              </span>
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Built for student life
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to stay on top of your classes.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="Schedule Scanner"
                description="Upload a photo of your class schedule and let AI turn it into an interactive timetable."
              />
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                }
                title="Class Reminders"
                description="Get reminded when your next class is coming up so you know what&apos;s next."
              />
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                title="Weekly Schedule"
                description="See your classes from Monday to Saturday in one clean, organized view."
              />
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                title="Easy to Edit"
                description="Review your extracted schedule and make changes whenever something needs updating."
              />
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
                title="Works Anywhere"
                description="Check your schedule from your phone, laptop, or installed PWA."
              />
              <FeatureCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                title="Your Schedule, Your Data"
                description="Keep your schedule private and securely connected to your account."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border/40">
          <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                How it works
              </span>
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                From photo to timetable.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Three simple steps and your classes are sorted.
              </p>
            </div>
            <div className="relative mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
              <div className="absolute left-[calc(33.33%-40px)] top-[40px] h-[calc(50%-40px)] w-[80px] border-r-2 border-dashed border-border/50 md:block hidden" />
              <div className="absolute left-[calc(66.66%-40px)] top-[40px] h-[calc(50%-40px)] w-[80px] border-r-2 border-dashed border-border/50 md:block hidden" />
              <StepCard
                number={1}
                title="Upload"
                description="Take a photo or upload your class schedule."
                badge="Capture"
              />
              <StepCard
                number={2}
                title="Let Schedly Scan"
                description="AI extracts your subjects, times, rooms, and other details."
                badge="Extract"
              />
              <StepCard
                number={3}
                title="Check & Save"
                description="Review results, make changes, and save your timetable."
                badge="Done"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/40 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-24 text-center md:py-36">
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Stop checking your schedule manually.
            </h2>
            <p className="max-w-md text-muted-foreground">
              Let Schedly organize your classes so you always know what&apos;s next.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 shadow-lg shadow-primary/25 text-base">
                Get started free &rarr;
              </Button>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">No credit card required. 100% free forever.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-5 px-4 md:flex-row md:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.jpg" alt="" aria-hidden width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-semibold text-foreground">Schedly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Schedly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border-2 border-border bg-card p-7 shadow-[0_4px_0_0_hsl(var(--border)) transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_0_0_hsl(var(--border))">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  badge,
}: {
  number: number;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-border bg-card text-lg font-bold text-foreground shadow-[0_4px_0_0_hsl(var(--border))">
        {number}
      </div>
      <span className="mb-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
        {badge}
      </span>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

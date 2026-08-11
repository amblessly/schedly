// Time-based greeting header. Uses clamp() typography so the headline scales
// with the viewport but never overflows the centered content column.
export function DashboardHeader({
  greeting,
  username,
}: {
  greeting: string;
  username: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-heading text-[clamp(1.5rem,1.25rem+1vw,1.875rem)] leading-tight font-bold tracking-tight text-foreground">
        {greeting}, {username}
      </h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        Here&apos;s your day at a glance.
      </p>
    </header>
  );
}
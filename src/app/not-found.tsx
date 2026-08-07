import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh-fallback flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/30">
        404
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on schedule.
      </p>
      <Link href="/">
        <Button className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 hover:from-primary hover:to-primary/80">
          Back to home
        </Button>
      </Link>
    </div>
  );
}
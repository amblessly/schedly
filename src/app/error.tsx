"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh-fallback flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-3xl font-bold text-primary-foreground shadow-lg shadow-primary/30">
        !
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        An unexpected error occurred. Try again, or head back to your schedule.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => unstable_retry()}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 hover:from-primary hover:to-primary/80"
        >
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
      {error?.digest && (
        <p className="text-xs text-muted-foreground/60">Error reference: {error.digest}</p>
      )}
    </div>
  );
}
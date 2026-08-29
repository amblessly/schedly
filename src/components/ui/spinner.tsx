"use client";

import { ChaoticOrbit } from "ldrs/react";
import { cn } from "@/lib/utils";

export function Spinner({
  size = 16,
  className,
  color,
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  const resolvedColor = color
    ?? (typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim() || "currentColor"
      : "currentColor");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center align-middle",
        className
      )}
      style={{ width: size, height: size, color: resolvedColor }}
    >
      <ChaoticOrbit
        size={String(size)}
        speed="1.5"
        color={resolvedColor}
      />
    </span>
  );
}

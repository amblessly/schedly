import { JellyTriangle } from "ldrs/react";
import { cn } from "@/lib/utils";

export function Spinner({
  size = 16,
  color = "var(--foreground)",
  className,
}: {
  size?: number | string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center align-middle",
        className
      )}
    >
      <JellyTriangle size={size} speed="1.75" color={color} />
    </span>
  );
}

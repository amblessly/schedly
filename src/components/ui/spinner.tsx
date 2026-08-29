import { cn } from "@/lib/utils";

export function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center align-middle",
        className
      )}
      style={{ width: size, height: size }}
    >
      <PulseDots />
    </span>
  );
}

function PulseDots() {
  return (
    <div className="flex space-x-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-current rounded-full animate-[pulse-dot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FloatingLabelInput({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const invalid = props["aria-invalid"];
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-transparent transition-colors duration-150 focus-within:border-primary",
        invalid ? "border-destructive" : "border-input",
        className
      )}
    >
      <Input
        placeholder=" "
        className="peer h-11 w-full rounded-none border-none bg-transparent px-3 pt-4 pb-1 text-base shadow-none outline-none ring-0 placeholder-transparent focus-visible:border-none focus-visible:ring-0 dark:bg-transparent"
        {...props}
      />
      <label className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 bg-background px-1 text-base text-muted-foreground transition-all duration-200 ease-out peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs">
        {label}
      </label>
    </div>
  );
}

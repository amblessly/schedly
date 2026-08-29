"use client";

import { cn } from "@/lib/utils";

export interface TextFieldAreaProps
  extends React.ComponentProps<"textarea"> {
  label: string;
  error?: boolean;
  helperText?: string;
}

export function TextFieldArea({
  label,
  className,
  error,
  helperText,
  ...props
}: TextFieldAreaProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={props.id}
        className={cn("text-sm font-medium", error ? "text-destructive" : "text-foreground")}
      >
        {label}
      </label>
      <textarea
        className={cn(
          "flex w-full min-h-[100px] resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        )}
        {...props}
      />
      {helperText && (
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {helperText}
        </p>
      )}
    </div>
  );
}

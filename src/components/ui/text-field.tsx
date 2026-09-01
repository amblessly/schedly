"use client";

import { cn } from "@/lib/utils";

export interface TextFieldProps extends React.ComponentProps<"input"> {
  label: string;
  inputClassName?: string;
  helperText?: string;
  error?: boolean;
}

export function TextField({
  label,
  className,
  inputClassName,
  helperText,
  error,
  ...props
}: TextFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={props.id}
        className={cn("text-sm font-medium", error ? "text-destructive" : "text-foreground")}
      >
        {label}
      </label>
      <input
        type={props.type}
        className={cn(
          "flex h-10 w-full min-w-0 rounded-lg border-2 border-foreground/70 bg-transparent px-3 py-2 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:shadow-[3px_3px_0_0_#401f32] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[3px_3px_0_0_#401f32] dark:bg-input/30 dark:disabled:bg-input/80",
          inputClassName
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

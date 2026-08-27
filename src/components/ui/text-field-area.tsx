"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextFieldAreaProps
  extends React.ComponentProps<"textarea"> {
  label: string;
  error?: boolean;
  helperText?: string;
}

const TextFieldArea = React.forwardRef<HTMLTextAreaElement, TextFieldAreaProps>(
  ({ label, className, error, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className={cn("relative mb-5", disabled && "opacity-50 pointer-events-none", className)}>
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          placeholder=" "
          className={cn(
            "peer w-full rounded-lg border-2 border-input bg-transparent px-4 pt-6 pb-2 text-base font-normal outline-none resize-y min-h-[140px] transition-colors duration-300",
            "focus:border-primary",
            error && "border-destructive focus:border-destructive",
            "disabled:cursor-not-allowed"
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-4 top-3 px-1 bg-background text-base text-muted-foreground font-normal transition-all duration-300 ease-out pointer-events-none z-[2]",
            "peer-focus:-top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-primary",
            error && "peer-focus:text-destructive peer-[:not(:placeholder-shown)]:text-destructive"
          )}
        >
          {label}
        </label>
        {helperText && (
          <p className={cn("mt-1 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextFieldArea.displayName = "TextFieldArea";

export { TextFieldArea };

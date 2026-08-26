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
  ({ label, className, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className={cn("relative", className)}>
        <textarea
          ref={ref}
          id={inputId}
          placeholder=" "
          className={cn(
            "peer w-full resize-y rounded-lg border border-input bg-transparent px-3 pb-2 pt-5 text-base outline-none transition-all duration-200 min-h-[120px]",
            "focus:border-2 focus:border-primary",
            error && "border-destructive focus:border-destructive"
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-3 top-2 origin-left text-[0.75rem] text-muted-foreground transition-all duration-200",
            "peer-focus:top-1 peer-focus:scale-[0.75]",
            "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:scale-[0.75]",
            "peer-focus:text-primary",
            error && "peer-focus:text-destructive"
          )}
        >
          {label}
        </label>
        {helperText && (
          <p className={cn("mt-1 ml-3 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextFieldArea.displayName = "TextFieldArea";

export { TextFieldArea };

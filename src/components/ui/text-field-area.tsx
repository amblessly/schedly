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
      <div className={cn("relative group", disabled && "opacity-50 pointer-events-none", className)}>
        <div
          className={cn(
            "relative rounded-xl border-[1.5px] border-input bg-transparent transition-colors duration-200",
            "group-focus-within:border-primary",
            error && "border-destructive group-focus-within:border-destructive",
            disabled && "bg-muted/50"
          )}
        >
          {/* Outlined border notch for floating label */}
          <div
            className={cn(
              "absolute -top-2.5 left-3 px-1 max-w-[calc(100%-24px)]",
              "bg-background text-xs font-normal text-muted-foreground",
              "transition-all duration-200 ease-out",
              "group-focus-within:text-primary",
              error && "text-destructive group-focus-within:text-destructive"
            )}
            aria-hidden
          >
            <span className="truncate block">{label}</span>
          </div>

          <textarea
            ref={ref}
            id={inputId}
            disabled={disabled}
            placeholder=" "
            className={cn(
              "peer w-full bg-transparent px-4 pt-4 pb-2 text-base font-normal outline-none resize-y min-h-[120px]",
              "placeholder:text-transparent",
              "disabled:cursor-not-allowed"
            )}
            aria-invalid={error || undefined}
            {...props}
          />
        </div>

        {helperText && (
          <p
            className={cn(
              "mt-1 ml-4 text-xs font-normal",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextFieldArea.displayName = "TextFieldArea";

export { TextFieldArea };

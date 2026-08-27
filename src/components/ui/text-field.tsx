"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends React.ComponentProps<"input"> {
  label: string;
  variant?: "outlined" | "filled";
  helperText?: string;
  error?: boolean;
  inputClassName?: string;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      variant = "outlined",
      className,
      helperText,
      error,
      id,
      type = "text",
      inputClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    if (variant === "filled") {
      return (
        <div className={cn("relative mb-5", disabled && "opacity-50 pointer-events-none", className)}>
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            placeholder=" "
            className={cn(
              "peer w-full rounded-t-lg border-0 border-b-[2px] border-b-input bg-muted/50 px-3 pt-5 pb-2 text-base font-normal outline-none transition-colors duration-300",
              "focus:border-b-primary",
              error && "border-b-destructive focus:border-b-destructive",
              "disabled:cursor-not-allowed",
              inputClassName
            )}
            aria-invalid={error || undefined}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 top-3 bg-transparent text-base text-muted-foreground font-normal transition-all duration-300 ease-out pointer-events-none origin-left",
              "peer-focus:top-1 peer-focus:text-xs peer-focus:font-medium",
              "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium",
              "peer-focus:text-primary",
              error && "text-destructive peer-focus:text-destructive"
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

    /* Outlined variant — Google MD1 style */
    return (
      <div className={cn("relative h-[52px] mb-5", disabled && "opacity-50 pointer-events-none", className)}>
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          placeholder=" "
          className={cn(
            "absolute inset-0 w-full h-full rounded-lg border-2 border-input bg-transparent px-4 text-base font-normal outline-none transition-colors duration-300 z-[1]",
            "focus:border-primary",
            error && "border-destructive focus:border-destructive",
            "disabled:cursor-not-allowed",
            inputClassName
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-4 top-3 px-1 bg-background text-base text-muted-foreground font-normal transition-all duration-300 ease-out pointer-events-none z-[2]",
            /* Float up on focus or when has value */
            "peer-focus:-top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-primary",
            error && "peer-focus:text-destructive peer-[:not(:placeholder-shown)]:text-destructive"
          )}
        >
          {label}
        </label>
        {helperText && (
          <p className={cn("absolute -bottom-4 left-0 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextField.displayName = "TextField";

export { TextField };

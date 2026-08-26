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

    return (
      <div className={cn("relative group", disabled && "opacity-50 pointer-events-none", className)}>
        {variant === "outlined" ? (
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

            <input
              ref={ref}
              id={inputId}
              type={type}
              disabled={disabled}
              placeholder=" "
              className={cn(
                "peer w-full bg-transparent px-4 pt-4 pb-2 text-base font-normal outline-none",
                "placeholder:text-transparent",
                "disabled:cursor-not-allowed",
                inputClassName
              )}
              aria-invalid={error || undefined}
              {...props}
            />
          </div>
        ) : (
          /* Filled variant — M3 filled style */
          <div
            className={cn(
              "relative rounded-t-xl bg-muted transition-colors duration-200",
              "border-b-[1.5px] border-b-input",
              "group-focus-within:border-b-primary group-focus-within:border-b-2",
              error && "border-b-destructive group-focus-within:border-b-destructive"
            )}
          >
            <label
              htmlFor={inputId}
              className={cn(
                "absolute left-4 text-base font-normal text-muted-foreground",
                "transition-all duration-200 ease-out origin-left pointer-events-none",
                /* Default: centered vertically */
                "top-1/2 -translate-y-1/2 scale-100",
                /* Floating: moves up and shrinks */
                "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:scale-[0.72]",
                "peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.72]",
                /* Color */
                "peer-focus:text-primary peer-[:not(:placeholder-shown)]:text-primary",
                error && "text-destructive peer-focus:text-destructive peer-[:not(:placeholder-shown)]:text-destructive",
                disabled && "text-muted-foreground/50"
              )}
            >
              {label}
            </label>

            <input
              ref={ref}
              id={inputId}
              type={type}
              disabled={disabled}
              placeholder=" "
              className={cn(
                "peer w-full bg-transparent px-4 pt-5 pb-2 text-base font-normal outline-none",
                "placeholder:text-transparent",
                "disabled:cursor-not-allowed",
                inputClassName
              )}
              aria-invalid={error || undefined}
              {...props}
            />
          </div>
        )}

        {/* Helper / error text */}
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
TextField.displayName = "TextField";

export { TextField };

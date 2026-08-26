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
  ({ label, variant = "outlined", className, helperText, error, id, type = "text", inputClassName, ...props }, ref) => {
    const inputId = id || React.useId();
    const hasValue = props.value !== undefined && props.value !== "";
    const hasPlaceholder = !!props.placeholder;

    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder=" "
          className={cn(
            "peer w-full rounded-lg border bg-transparent px-3 pb-2 pt-5 text-base outline-none transition-all duration-200",
            variant === "outlined" && [
              "border-input",
              "focus:border-2 focus:border-primary",
              error && "border-destructive focus:border-destructive",
            ],
            variant === "filled" && [
              "border-0 border-b-2 rounded-none",
              "border-b-input",
              "focus:border-b-primary",
              error && "border-b-destructive focus:border-b-destructive",
            ],
            inputClassName
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-3 origin-left text-muted-foreground transition-all duration-200",
            variant === "outlined" && [
              "top-1/2 -translate-y-1/2 text-base",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-[0.75]",
              "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.75]",
              "peer-focus:text-primary peer-[:not(:placeholder-shown)]:text-muted-foreground",
              error && "peer-focus:text-destructive",
            ],
            variant === "filled" && [
              "top-4 text-base",
              "peer-focus:top-1 peer-focus:scale-[0.75]",
              "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:scale-[0.75]",
              "peer-focus:text-primary",
              error && "peer-focus:text-destructive",
            ]
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
TextField.displayName = "TextField";

export { TextField };

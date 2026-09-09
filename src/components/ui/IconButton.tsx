"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-9 w-9 [&>svg]:h-4 [&>svg]:w-4",
  md: "h-11 w-11 [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-12 w-12 [&>svg]:h-6 [&>svg]:w-6",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-12 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

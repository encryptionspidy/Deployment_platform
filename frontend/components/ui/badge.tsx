import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center font-medium rounded-md border tracking-wide select-none";

  const variants = {
    success:
      "bg-status-success-bg text-status-success border-status-success/30",
    warning:
      "bg-status-warning-bg text-status-warning border-status-warning/30",
    error: "bg-status-error-bg text-status-error border-status-error/30",
    info: "bg-status-info-bg text-status-info border-status-info/30",
    neutral: "bg-dark-700 text-zinc-300 border-zinc-700",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}

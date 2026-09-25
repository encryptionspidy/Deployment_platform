import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-dark-700/80 rounded-md animate-skeleton select-none",
        className
      )}
      {...props}
    />
  );
}

import React from "react";
import { TrendingUp, Target, Zap, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SloStatCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  target?: string | number;
  subtitle?: string;
  type: "sli" | "target" | "budget" | "burn";
}

export function SloStatCard({
  title,
  value,
  unit = "%",
  target,
  subtitle,
  type,
}: SloStatCardProps) {
  let statusColor = "text-zinc-100";
  let icon = <ShieldCheck className="w-4 h-4 text-brand" />;

  const numVal = typeof value === "number" ? value : parseFloat(String(value));

  if (type === "sli") {
    icon = <TrendingUp className="w-4 h-4 text-brand" />;
    const targetNum = typeof target === "number" ? target : parseFloat(String(target || 99.0));
    if (!isNaN(numVal)) {
      if (numVal >= targetNum) {
        statusColor = "text-emerald-400";
      } else if (numVal >= targetNum - 2) {
        statusColor = "text-amber-400";
      } else {
        statusColor = "text-red-400";
      }
    }
  } else if (type === "target") {
    icon = <Target className="w-4 h-4 text-blue-400" />;
    statusColor = "text-blue-400";
  } else if (type === "budget") {
    icon = <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (!isNaN(numVal)) {
      if (numVal > 20) {
        statusColor = "text-emerald-400";
      } else if (numVal >= 0) {
        statusColor = "text-amber-400";
      } else {
        statusColor = "text-red-400";
      }
    }
  } else if (type === "burn") {
    icon = <Zap className="w-4 h-4 text-amber-400" />;
    if (!isNaN(numVal)) {
      if (numVal <= 1.0) {
        statusColor = "text-emerald-400";
      } else if (numVal <= 2.0) {
        statusColor = "text-amber-400";
      } else {
        statusColor = "text-red-400";
      }
    }
  }

  const displayValue =
    value === null || value === undefined
      ? "N/A"
      : typeof value === "number"
      ? value.toFixed(2)
      : value;

  return (
    <Card className="bg-dark-800 border-dark-700 hover:border-dark-600 relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0 mb-0">
        <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="w-7 h-7 rounded bg-dark-700 border border-dark-600 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>

      <div className="px-5 pb-4">
        <div className="flex items-baseline gap-1 mt-1">
          <span className={cn("text-2xl font-extrabold tracking-tight font-mono", statusColor)}>
            {displayValue}
          </span>
          {displayValue !== "N/A" && unit && (
            <span className="text-xs font-medium text-zinc-400">{unit}</span>
          )}
        </div>

        {subtitle && (
          <CardDescription className="mt-1.5 text-xs text-zinc-400">
            {subtitle}
          </CardDescription>
        )}
      </div>
    </Card>
  );
}

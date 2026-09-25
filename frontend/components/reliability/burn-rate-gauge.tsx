import React from "react";
import { Zap, AlertTriangle, ShieldCheck, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BurnRateGaugeProps {
  burnRate: number | null;
  errorBudgetRemaining: number | null;
}

export function BurnRateGauge({
  burnRate,
  errorBudgetRemaining,
}: BurnRateGaugeProps) {
  const rate = burnRate ?? 0.0;
  const budget = errorBudgetRemaining ?? 100.0;

  // Percentage cap for visual bar
  const fillPercentage = Math.min(Math.max(budget, 0), 100);

  let burnLevel = "Nominal";
  let burnBadgeVariant: "success" | "warning" | "error" = "success";
  let burnIcon = <ShieldCheck className="w-4 h-4" />;
  let barColor = "bg-emerald-500";

  if (rate > 2.0) {
    burnLevel = "Critical Exhaustion Rate (> 2x)";
    burnBadgeVariant = "error";
    burnIcon = <Flame className="w-4 h-4" />;
    barColor = "bg-red-500";
  } else if (rate > 1.0) {
    burnLevel = "Elevated Burn Rate (1-2x)";
    burnBadgeVariant = "warning";
    burnIcon = <AlertTriangle className="w-4 h-4" />;
    barColor = "bg-amber-500";
  }

  return (
    <Card className="bg-dark-800 border-dark-700">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-semibold text-zinc-100">
            Error Budget Health & Burn Rate
          </CardTitle>
          <CardDescription className="text-xs">
            Calculated over a 1-hour sliding deployment window
          </CardDescription>
        </div>

        <Badge variant={burnBadgeVariant} size="md">
          {burnIcon}
          <span>{burnLevel}</span>
        </Badge>
      </CardHeader>

      <div className="space-y-4 pt-2">
        {/* Error Budget Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-300 font-medium">
              Error Budget Capacity
            </span>
            <span className="font-mono text-zinc-200 font-bold">
              {budget.toFixed(1)}% remaining
            </span>
          </div>

          <div className="w-full h-3 bg-dark-900 rounded-full overflow-hidden border border-dark-700 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Burn Rate Details */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-dark-900/80 p-3 rounded-lg border border-dark-700/80">
            <span className="text-zinc-400 block text-[11px] mb-1">
              Current Burn Multiplier
            </span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-100 font-bold text-base">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{rate.toFixed(2)}x</span>
            </div>
          </div>

          <div className="bg-dark-900/80 p-3 rounded-lg border border-dark-700/80">
            <span className="text-zinc-400 block text-[11px] mb-1">
              SLO Exhaustion Projection
            </span>
            <span className="font-mono text-zinc-200 font-medium text-xs">
              {rate <= 1.0 ? "Budget Safe (> 30 days)" : "Exhaustion < 24h"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deployment, PendingDeployment } from "@/lib/types";
import { truncateSha, formatDate } from "@/lib/utils";

interface PipelineStep {
  id: number;
  key: string;
  name: string;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 1, key: "queued", name: "Queued", description: "Webhook received, job queued" },
  { id: 2, key: "building", name: "Building", description: "Container image building" },
  { id: 3, key: "packaging", name: "Packaging", description: "Image tagged for registry" },
  { id: 4, key: "scanning", name: "Security Scan", description: "Trivy vulnerability analysis" },
  { id: 5, key: "approval", name: "Approval Gate", description: "Manual review if CVEs detected" },
  { id: 6, key: "deploying", name: "Kubernetes Rollout", description: "K8s pod & NodePort deployment" },
  { id: 7, key: "live", name: "Live", description: "Deployment active & operational" },
];

interface DeploymentPipelineStepperProps {
  deployment: Deployment;
  onActionComplete?: () => void;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
}

export function DeploymentPipelineStepper({
  deployment,
  onActionComplete,
  onApprove,
  onReject,
}: DeploymentPipelineStepperProps) {
  const [actionLoading, setActionLoading] = React.useState<"approve" | "reject" | null>(null);

  // Map backend status to active step index (1..7)
  const getActiveStepIndex = (): number => {
    switch (deployment.status) {
      case "queued":
        return 1;
      case "building":
        return 2;
      case "packaging":
        return 3;
      case "scanning":
        return 4;
      case "pending_approval":
        return 5;
      case "deploying":
        return 6;
      case "success":
      case "deployed":
        return 7;
      case "failed":
      case "rejected":
        return 5; // Paused at approval or failed stage
      default:
        return 7;
    }
  };

  const activeIndex = getActiveStepIndex();
  const isFailed = deployment.status === "failed" || deployment.status === "rejected";
  const isPendingApproval = deployment.status === "pending_approval";
  const isLive = deployment.status === "success" || deployment.status === "deployed";

  const handleApprove = async () => {
    if (!onApprove) return;
    try {
      setActionLoading("approve");
      await onApprove(deployment.id);
      if (onActionComplete) onActionComplete();
    } catch {
      // Error handled by parent
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    try {
      setActionLoading("reject");
      await onReject(deployment.id);
      if (onActionComplete) onActionComplete();
    } catch {
      // Error handled by parent
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 space-y-5">
      {/* Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-zinc-100">
              {deployment.repo}
            </span>
            <span className="font-mono text-[11px] text-zinc-400 bg-dark-800 px-2 py-0.5 rounded border border-dark-700">
              commit: {truncateSha(deployment.commit_sha)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            Started {formatDate(deployment.started_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(deployment.critical_vulns ?? 0) > 0 ? (
            <Badge variant="error">
              <ShieldAlert className="w-3 h-3 mr-1 inline" />
              {deployment.critical_vulns} Critical CVEs
            </Badge>
          ) : (
            <Badge variant="success">0 Vulns (Passed)</Badge>
          )}

          {isLive && deployment.live_url && (
            <a
              href={deployment.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              <span>Live App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 7-Step Connected Pipeline Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 relative">
        {PIPELINE_STEPS.map((step) => {
          let stepState: "completed" | "active" | "pending" | "failed" | "held" = "pending";

          if (step.id < activeIndex) {
            stepState = "completed";
          } else if (step.id === activeIndex) {
            if (isLive && step.id === 7) {
              stepState = "completed";
            } else if (isFailed) {
              stepState = "failed";
            } else if (isPendingApproval && step.id === 5) {
              stepState = "held";
            } else {
              stepState = "active";
            }
          }

          return (
            <div
              key={step.id}
              className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2 rounded-lg bg-dark-850 border border-dark-750"
            >
              {/* Status Icon Indicator */}
              <div className="flex-shrink-0">
                {stepState === "completed" && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {stepState === "active" && (
                  <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/50 text-brand flex items-center justify-center animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {stepState === "held" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center animate-bounce">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {stepState === "failed" && (
                  <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
                {stepState === "pending" && (
                  <div className="w-7 h-7 rounded-full bg-dark-750 border border-dark-700 text-zinc-600 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Step Label & Subtext */}
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-zinc-200 block truncate">
                  {step.name}
                </span>
                <span className="text-[10px] text-zinc-500 hidden sm:block truncate">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Approval Gate Inline Panel (Stage 5 Review) */}
      {isPendingApproval && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Approval Gate Paused: Trivy Vulnerabilities Detected
            </h4>
          </div>

          <p className="text-xs text-zinc-300">
            Scan identified <span className="font-bold text-red-400">{deployment.critical_vulns} Critical</span> and{" "}
            <span className="font-bold text-amber-400">{deployment.high_vulns} High</span> vulnerabilities in image{" "}
            <span className="font-mono text-zinc-200">{deployment.image_tag}</span>. Explicit user authorization required to proceed.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              isLoading={actionLoading === "reject"}
              disabled={actionLoading !== null}
              className="text-zinc-300 hover:text-red-400 hover:border-red-500/40 text-xs"
            >
              Reject Deployment
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              isLoading={actionLoading === "approve"}
              disabled={actionLoading !== null}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Approve & Deploy to K8s
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

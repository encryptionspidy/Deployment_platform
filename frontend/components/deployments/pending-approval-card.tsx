"use client";

import React, { useState } from "react";
import { AlertOctagon, CheckCircle2, XCircle, ExternalLink, Calendar, GitCommit, Box } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VulnerabilityBadge } from "./vulnerability-badge";
import { PendingDeployment } from "@/lib/types";
import { formatDate, truncateSha } from "@/lib/utils";
import { api } from "@/lib/api";

interface PendingApprovalCardProps {
  deployment: PendingDeployment;
  onActionComplete?: () => void;
}

export function PendingApprovalCard({
  deployment,
  onActionComplete,
}: PendingApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setErrorMsg(null);
      const res = await api.approveDeployment(deployment.id);
      setStatusText("Approved and Deployed to Kubernetes");
      if (res.live_url) {
        setLiveUrl(res.live_url);
      }
      if (onActionComplete) {
        setTimeout(onActionComplete, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to approve deployment");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      setErrorMsg(null);
      await api.rejectDeployment(deployment.id);
      setStatusText("Deployment Rejected");
      if (onActionComplete) {
        setTimeout(onActionComplete, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject deployment");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-dark-800/90 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <CardTitle className="text-base font-semibold text-zinc-100">
              {deployment.repo}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-amber-400/90 mt-1 font-medium">
            Held for Manual Security Review
          </CardDescription>
        </div>

        <VulnerabilityBadge
          critical={deployment.critical_vulns}
          high={deployment.high_vulns}
        />
      </CardHeader>

      <div className="space-y-3 text-xs my-2">
        <div className="grid grid-cols-2 gap-2 bg-dark-900/80 p-3 rounded-lg border border-dark-700/80">
          <div className="flex items-center gap-2 text-zinc-400">
            <GitCommit className="w-3.5 h-3.5 text-zinc-500" />
            <span>Commit:</span>
            <code className="font-mono text-zinc-200 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
              {truncateSha(deployment.commit_sha)}
            </code>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <Box className="w-3.5 h-3.5 text-zinc-500" />
            <span>Image Tag:</span>
            <code className="font-mono text-zinc-200 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700 truncate max-w-[140px]">
              {deployment.image_tag}
            </code>
          </div>
        </div>

        {statusText && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">{statusText}</span>
            </div>
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/30 transition-colors font-mono"
              >
                <span>Live URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <CardFooter className="pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>Requested {formatDate(deployment.created_at)}</span>
        </div>

        {!statusText && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              isLoading={isRejecting}
              disabled={isApproving}
              className="text-zinc-400 hover:text-red-400 hover:border-red-500/40"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </Button>

            <Button
              variant="success"
              size="sm"
              onClick={handleApprove}
              isLoading={isApproving}
              disabled={isRejecting}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Deploy</span>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

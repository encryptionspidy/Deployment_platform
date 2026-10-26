"use client";

import React, { useState } from "react";
import { GitCommit, ExternalLink, Calendar, Box, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VulnerabilityBadge } from "./vulnerability-badge";
import { Deployment } from "@/lib/types";
import { formatDate, truncateSha, getStatusBadge } from "@/lib/utils";

interface DeploymentRowProps {
  deployment: Deployment;
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusBadge(deployment.status);

  return (
    <div className="bg-dark-800/90 border border-dark-700/80 rounded-xl overflow-hidden hover:border-dark-600 transition-all duration-150">
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status & Repo Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-dark-700/80 flex items-center justify-center text-brand font-mono text-xs font-bold border border-dark-600 flex-shrink-0 group-hover:border-brand/40 transition-colors">
            <GitCommit className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-brand transition-colors truncate">
                {deployment.repo}
              </h4>
              <Badge
                variant={
                  deployment.status === "success"
                    ? "success"
                    : deployment.status === "failed"
                    ? "error"
                    : deployment.status === "pending_approval"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {statusInfo.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap font-mono">
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">commit:</span>
                <code className="text-zinc-200 bg-dark-900 px-1.5 py-0.5 rounded border border-dark-700/80">
                  {truncateSha(deployment.commit_sha)}
                </code>
              </div>

              {deployment.image_tag && (
                <div className="flex items-center gap-1">
                  <Box className="w-3 h-3 text-zinc-500" />
                  <span className="truncate max-w-[150px] text-zinc-400">
                    {deployment.image_tag}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vulnerabilities, Time & Action Button */}
        <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 border-dark-700/60 pt-3 md:pt-0">
          {(deployment.critical_vulns !== undefined ||
            deployment.high_vulns !== undefined) && (
            <VulnerabilityBadge
              critical={deployment.critical_vulns || 0}
              high={deployment.high_vulns || 0}
            />
          )}

          <div className="flex items-center gap-3">
            <div className="text-right text-[11px] text-zinc-400 hidden sm:block">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>{formatDate(deployment.started_at)}</span>
              </div>
            </div>

            {deployment.logs && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-zinc-300 text-xs font-mono font-medium transition-colors"
              >
                <Terminal className="w-3 h-3 text-brand" />
                <span>Logs</span>
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}

            {deployment.live_url && (
              <a
                href={deployment.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-mono font-medium transition-all"
              >
                <span>Live App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Logs Terminal */}
      {expanded && deployment.logs && (
        <div className="bg-dark-950 border-t border-dark-700 p-3.5 font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
          {deployment.logs}
        </div>
      )}
    </div>
  );
}

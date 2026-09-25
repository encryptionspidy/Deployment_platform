"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Project, Deployment, ProjectSloMetrics } from "@/lib/types";
import { formatDate, formatDateRelative } from "@/lib/utils";
import { api } from "@/lib/api";

interface ProjectCardProps {
  project: Project;
  onRefresh?: () => void;
}

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const [lastDeploy, setLastDeploy] = useState<Deployment | null>(null);
  const [hasPendingApproval, setHasPendingApproval] = useState(false);
  const [sloMetrics, setSloMetrics] = useState<ProjectSloMetrics | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    async function loadProjectDetails() {
      try {
        const [deployments, pendingList, sloData] = await Promise.allSettled([
          api.getDeploymentHistory(project.repo_full_name),
          api.getPendingDeployments(),
          api.getProjectSlo(project.id),
        ]);

        if (deployments.status === "fulfilled" && deployments.value.length > 0) {
          setLastDeploy(deployments.value[0]);
        }

        if (pendingList.status === "fulfilled") {
          const isPending = pendingList.value.some(
            (p) => p.repo === project.repo_full_name
          );
          setHasPendingApproval(isPending);
        }

        if (sloData.status === "fulfilled") {
          setSloMetrics(sloData.value);
        }
      } catch {
        // Handled gracefully
      }
    }
    loadProjectDetails();
  }, [project]);

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${project.repo_full_name}?`)) {
      return;
    }
    try {
      setIsDisconnecting(true);
      await api.disconnectProject(project.id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to disconnect project");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const githubUrl = `https://github.com/${project.repo_full_name}`;

  return (
    <Card className="hover:border-dark-600 flex flex-col justify-between group bg-dark-900 border-dark-700/80">
      <div>
        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-brand shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-zinc-100 truncate">
                {project.repo_full_name}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Connected Repository
              </CardDescription>
            </div>
          </div>

          <Badge variant="success" size="sm" className="shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        </CardHeader>

        {/* Pending Approval Calm Amber Banner */}
        {hasPendingApproval && (
          <div className="mx-4 my-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Deployment pending approval</span>
            </div>
            <Link
              href="/dashboard/deployments"
              className="text-[11px] underline font-semibold hover:text-amber-200"
            >
              Review
            </Link>
          </div>
        )}

        {/* Metadata & Status Rows */}
        <div className="px-4 py-2 space-y-2 text-xs">
          {project.github_webhook_id && (
            <div className="flex items-center justify-between text-zinc-400 font-mono bg-dark-950 p-2 rounded border border-dark-800">
              <span className="text-[11px]">Webhook ID:</span>
              <span className="text-zinc-200">{project.github_webhook_id}</span>
            </div>
          )}

          {/* Last Deploy Status Row */}
          <div className="flex items-center justify-between text-zinc-400 font-mono bg-dark-950 p-2 rounded border border-dark-800">
            <span className="text-[11px]">Last Deploy:</span>
            <span className="text-zinc-200">
              {lastDeploy ? (
                <>
                  {formatDateRelative(lastDeploy.started_at || lastDeploy.finished_at || "")} •{" "}
                  <span
                    className={
                      lastDeploy.status === "success" || lastDeploy.status === "deployed"
                        ? "text-emerald-400 font-semibold"
                        : lastDeploy.status === "pending_approval"
                        ? "text-amber-400 font-semibold"
                        : "text-red-400 font-semibold"
                    }
                  >
                    {lastDeploy.status}
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">No deployments yet</span>
              )}
            </span>
          </div>

          {/* Per-Project SLI Health Indicator */}
          <div className="flex items-center justify-between text-zinc-400 font-mono bg-dark-950 p-2 rounded border border-dark-800">
            <span className="text-[11px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-brand" />
              Project SLI:
            </span>
            <span className="text-zinc-200">
              {sloMetrics && sloMetrics.sample_size > 0 && sloMetrics.sli_current_percent !== null ? (
                <span className="text-emerald-400 font-bold">{sloMetrics.sli_current_percent}%</span>
              ) : (
                <span className="text-zinc-500">No recent deployments</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <CardFooter className="pt-3 flex flex-col space-y-3">
        <div className="flex items-center justify-between w-full text-xs text-zinc-400 border-t border-dark-800 pt-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>{formatDate(project.connected_at)}</span>
          </div>

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Primary Action Buttons Row */}
        <div className="flex items-center gap-2 w-full pt-1">
          <Link
            href={`/dashboard/deployments?repo=${encodeURIComponent(project.repo_full_name)}`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full text-xs font-medium">
              <span>View Deployments</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            isLoading={isDisconnecting}
            className="text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-xs px-2.5"
            title="Disconnect repository"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  FolderGit2,
  Activity,
  AlertOctagon,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SloStatCard } from "@/components/reliability/slo-stat-card";
import { PendingApprovalCard } from "@/components/deployments/pending-approval-card";
import { ProjectCard } from "@/components/projects/project-card";
import { DeploymentRow } from "@/components/deployments/deployment-row";
import { api } from "@/lib/api";
import {
  Project,
  PendingDeployment,
  Deployment,
  SloMetrics,
} from "@/lib/types";

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pending, setPending] = useState<PendingDeployment[]>([]);
  const [history, setHistory] = useState<Deployment[]>([]);
  const [slo, setSlo] = useState<SloMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [projectsData, pendingData, sloData, historyData] =
        await Promise.allSettled([
          api.getConnectedProjects(),
          api.getPendingDeployments(),
          api.getSloMetrics(),
          api.getDeploymentHistory(),
        ]);

      if (projectsData.status === "fulfilled") setProjects(projectsData.value);
      if (pendingData.status === "fulfilled") setPending(pendingData.value);
      if (sloData.status === "fulfilled") setSlo(sloData.value);
      if (historyData.status === "fulfilled") setHistory(historyData.value);
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean, Left-Aligned Header Bar (No gradients/flourishes) */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
              Cluster Status: Operational
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Dashboard Overview
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            isLoading={refreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href="/dashboard/projects/connect">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Repository</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* SRE Reliability Summary Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Reliability Metrics
            </h2>
          </div>
          <Link
            href="/dashboard/reliability"
            className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
          >
            <span>Detailed View</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SloStatCard
            title="Current SLI"
            value={slo?.sli_current_percent ?? null}
            target={slo?.slo_target_percent ?? 99.0}
            subtitle="1-hour rolling success rate"
            type="sli"
          />
          <SloStatCard
            title="SLO Target"
            value={slo?.slo_target_percent ?? 99.0}
            subtitle="Configured objective target"
            type="target"
          />
          <SloStatCard
            title="Error Budget Left"
            value={slo?.error_budget_remaining_percent ?? null}
            subtitle="Capacity before alert breach"
            type="budget"
          />
          <SloStatCard
            title="Burn Rate"
            value={slo?.burn_rate ?? null}
            unit="x"
            subtitle="Budget consumption multiplier"
            type="burn"
          />
        </div>
      </section>

      {/* Pending Approvals Section (Trivy CVE Holds) */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertOctagon className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">
              Security Action Required ({pending.length} Pending Review)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((dep) => (
              <PendingApprovalCard
                key={dep.id}
                deployment={dep}
                onActionComplete={loadDashboardData}
              />
            ))}
          </div>
        </section>
      )}

      {/* Connected Projects Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Connected Repositories ({projects.length})
            </h2>
          </div>
          <Link
            href="/dashboard/projects"
            className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
          >
            <span>Manage All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-10 bg-dark-900 border-dark-700">
            <FolderGit2 className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">
              No connected repositories yet
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Connect a GitHub repository to enable automated push webhooks.
            </p>
            <Link href="/dashboard/projects/connect">
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Connect First Repo</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Deployments Activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Recent Deployment Activity
            </h2>
          </div>
          <Link
            href="/dashboard/deployments"
            className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
          >
            <span>View Full History</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {history.length === 0 ? (
          <Card className="text-center py-8 text-xs text-zinc-500 bg-dark-900 border-dark-700">
            No recent deployments recorded yet. Push a commit to trigger the pipeline!
          </Card>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 4).map((dep) => (
              <DeploymentRow key={dep.id} deployment={dep} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  FolderGit2,
  Activity,
  AlertOctagon,
  ArrowRight,
  Plus,
  RefreshCw,
  Zap,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SloStatCard } from "@/components/reliability/slo-stat-card";
import { PendingApprovalCard } from "@/components/deployments/pending-approval-card";
import { ProjectCard } from "@/components/projects/project-card";
import { DeploymentRow } from "@/components/deployments/deployment-row";
import { DeploymentPipelineStepper } from "@/components/deployments/deployment-pipeline-stepper";
import { api } from "@/lib/api";
import { Project, PendingDeployment, Deployment, SloMetrics } from "@/lib/types";

// ── Toast component ───────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-start gap-3 bg-dark-800 border border-red-500/30 text-red-400 text-xs rounded-xl px-4 py-3 shadow-xl max-w-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-300">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pending, setPending] = useState<PendingDeployment[]>([]);
  const [history, setHistory] = useState<Deployment[]>([]);
  const [slo, setSlo] = useState<SloMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Track the active abort controller so we can cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const loadDashboardData = useCallback(async (isManual = false) => {
    // Cancel any previous in-flight requests
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isManual) setRefreshing(true);

    try {
      const [projectsData, pendingData, sloData, historyData] =
        await Promise.allSettled([
          api.getConnectedProjects(),
          api.getPendingDeployments(),
          api.getSloMetrics(),
          api.getDeploymentHistory(),
        ]);

      // If request was aborted, bail out silently
      if (controller.signal.aborted) return;

      if (projectsData.status === "fulfilled") setProjects(projectsData.value);
      if (pendingData.status === "fulfilled") setPending(pendingData.value);
      if (sloData.status === "fulfilled") setSlo(sloData.value);
      if (historyData.status === "fulfilled") setHistory(historyData.value);

      // Show toast if all requests failed (likely auth or network issue)
      const allFailed = [projectsData, pendingData, sloData, historyData].every(
        (r) => r.status === "rejected"
      );
      if (allFailed) {
        setErrorToast("Unable to reach the backend API. Check your connection.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorToast("An unexpected error occurred while loading dashboard data.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Smart polling: pause when tab is hidden, resume when visible
    const POLL_INTERVAL = 2500;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          loadDashboardData(false);
        }
      }, POLL_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData(false); // Immediate refresh on tab focus
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboardData]);

  const activeDeployment = history.find((d) =>
    ["queued", "building", "packaging", "scanning", "deploying"].includes(d.status)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {errorToast && (
        <Toast message={errorToast} onDismiss={() => setErrorToast(null)} />
      )}

      {/* Header Bar */}
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
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync (2.5s)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboardData(true)}
            isLoading={refreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href="/dashboard/projects/connect">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Repo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Active Deployment Banner */}
      {activeDeployment && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-brand">
            <Zap className="w-4 h-4 animate-bounce text-brand" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand">
              Live Pipeline: {activeDeployment.repo}
            </h2>
            <span className="text-[10px] font-mono bg-brand/15 text-brand px-2 py-0.5 rounded-full border border-brand/30 animate-pulse">
              {activeDeployment.status.toUpperCase()}
            </span>
          </div>
          <DeploymentPipelineStepper
            deployment={activeDeployment}
            onActionComplete={() => loadDashboardData(true)}
          />
        </section>
      )}

      {/* SRE Reliability Grid */}
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
            target={slo?.slo_target_percent ?? 95.0}
            subtitle="1-hour rolling success rate"
            type="sli"
          />
          <SloStatCard
            title="SLO Target"
            value={slo?.slo_target_percent ?? 95.0}
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

      {/* Pending Approvals */}
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

      {/* Connected Projects */}
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
            <h3 className="text-sm font-semibold text-zinc-200">No connected repositories yet</h3>
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

      {/* Recent Deployments */}
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
            No recent deployments. Push a commit to trigger the pipeline.
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

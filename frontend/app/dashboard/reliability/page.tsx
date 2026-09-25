"use client";

import React, { useEffect, useState } from "react";
import { Activity, RefreshCw, Database, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SloStatCard } from "@/components/reliability/slo-stat-card";
import { BurnRateGauge } from "@/components/reliability/burn-rate-gauge";
import { api } from "@/lib/api";
import { SloMetrics, Project, ProjectSloMetrics } from "@/lib/types";

export default function ReliabilityPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "global">("global");
  const [globalSlo, setGlobalSlo] = useState<SloMetrics | null>(null);
  const [projectSlo, setProjectSlo] = useState<ProjectSloMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [projectsData, globalData] = await Promise.allSettled([
        api.getConnectedProjects(),
        api.getSloMetrics(),
      ]);

      if (projectsData.status === "fulfilled") setProjects(projectsData.value);
      if (globalData.status === "fulfilled") setGlobalSlo(globalData.value);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadSelectedProjectSlo() {
      if (selectedProjectId === "global") {
        setProjectSlo(null);
        return;
      }
      try {
        const data = await api.getProjectSlo(selectedProjectId);
        setProjectSlo(data);
      } catch {
        setProjectSlo(null);
      }
    }
    loadSelectedProjectSlo();
  }, [selectedProjectId]);

  const activeSli =
    selectedProjectId === "global"
      ? globalSlo?.sli_current_percent ?? null
      : projectSlo?.sli_current_percent ?? null;

  const activeTarget =
    selectedProjectId === "global"
      ? globalSlo?.slo_target_percent ?? 95.0
      : projectSlo?.slo_target_percent ?? 95.0;

  const activeBudget =
    selectedProjectId === "global"
      ? globalSlo?.error_budget_remaining_percent ?? null
      : projectSlo?.error_budget_remaining_percent ?? null;

  const activeBurn =
    selectedProjectId === "global"
      ? globalSlo?.burn_rate ?? null
      : projectSlo?.burn_rate ?? null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-brand" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {selectedProjectId === "global" ? "Platform-Wide Overview" : "Per-Project SLO"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            SRE Reliability & SLO Metrics
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Selector */}
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 p-1 rounded-lg text-xs">
            <span className="text-zinc-400 pl-2 font-medium">Scope:</span>
            <select
              value={selectedProjectId}
              onChange={(e) =>
                setSelectedProjectId(
                  e.target.value === "global" ? "global" : Number(e.target.value)
                )
              }
              className="bg-dark-800 text-zinc-100 text-xs rounded border border-dark-700 px-2 py-1 focus:outline-none"
            >
              <option value="global">Platform-Wide Overview</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.repo_full_name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} isLoading={refreshing}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SloStatCard
            title="Current SLI"
            value={activeSli}
            target={activeTarget}
            subtitle={
              selectedProjectId === "global"
                ? "Platform-wide rolling success rate"
                : projectSlo && projectSlo.sample_size === 0
                ? "No recent deployments"
                : `Project rolling 1-hour success rate (${projectSlo?.sample_size ?? 0} samples)`
            }
            type="sli"
          />
          <SloStatCard
            title="SLO Target"
            value={activeTarget}
            subtitle="Configured objective target threshold"
            type="target"
          />
          <SloStatCard
            title="Error Budget Left"
            value={activeBudget}
            subtitle="Remaining capacity before breach"
            type="budget"
          />
          <SloStatCard
            title="Burn Rate Multiplier"
            value={activeBurn}
            unit="x"
            subtitle="Error budget consumption speed"
            type="burn"
          />
        </div>
      )}

      {/* Error Budget & Burn Rate Gauge */}
      <BurnRateGauge
        burnRate={activeBurn}
        errorBudgetRemaining={activeBudget}
      />

      {/* PromQL & Per-Project Reference Panel */}
      <Card className="bg-dark-900 border-dark-700/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand" />
            <CardTitle className="text-sm font-semibold text-zinc-100">
              {selectedProjectId === "global"
                ? "Platform-Wide Prometheus Query Engine"
                : `Per-Project History: ${projectSlo?.repo || "Selected Project"}`}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {selectedProjectId === "global"
              ? "Aggregated across all connected repositories in infra/prometheus/recording-rules.yml"
              : "Rolling 1-hour PostgreSQL window metrics for this specific repository"}
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-dark-950 p-3.5 rounded-lg border border-dark-700/80 space-y-1">
            <span className="text-zinc-400 font-semibold block text-[11px]">
              {selectedProjectId === "global" ? "sli:deployment_success_rate:current" : "GET /slo/{project_id}"}
            </span>
            <code className="text-brand text-[11px] block overflow-x-auto">
              {selectedProjectId === "global"
                ? "deployment_success_rate_percent"
                : `sample_size: ${projectSlo?.sample_size ?? 0} deployments`}
            </code>
          </div>

          <div className="bg-dark-950 p-3.5 rounded-lg border border-dark-700/80 space-y-1">
            <span className="text-zinc-400 font-semibold block text-[11px]">
              slo:error_budget:remaining_percent
            </span>
            <code className="text-emerald-400 text-[11px] block overflow-x-auto">
              100 - (100 - SLI) / (100 - 95.0) * 100
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}

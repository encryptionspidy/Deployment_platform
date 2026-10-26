"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Rocket, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeploymentPipelineStepper } from "@/components/deployments/deployment-pipeline-stepper";
import { api } from "@/lib/api";
import { Deployment, PendingDeployment } from "@/lib/types";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [pending, setPending] = useState<PendingDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "success" | "pending" | "failed"
  >("all");

  const fetchDeploymentsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [historyData, pendingData] = await Promise.allSettled([
        api.getDeploymentHistory(),
        api.getPendingDeployments(),
      ]);

      if (historyData.status === "fulfilled") {
        setDeployments(historyData.value);
      }
      if (pendingData.status === "fulfilled") {
        setPending(pendingData.value);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeploymentsData();

    // Real-time backend status polling every 3 seconds
    const interval = setInterval(() => {
      fetchDeploymentsData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: number) => {
    await api.approveDeployment(id);
    await fetchDeploymentsData(true);
  };

  const handleReject = async (id: number) => {
    await api.rejectDeployment(id);
    await fetchDeploymentsData(true);
  };

  const filteredDeployments = deployments.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "success")
      return d.status === "success" || d.status === "deployed";
    if (statusFilter === "pending")
      return (
        d.status === "pending_approval" ||
        d.status === "queued" ||
        d.status === "building" ||
        d.status === "scanning" ||
        d.status === "deploying"
      );
    if (statusFilter === "failed")
      return d.status === "failed" || d.status === "rejected";
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Deployments & Security Review
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time 7-stage animated pipeline visualizer powered by K3s Kubernetes and Trivy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDeploymentsData(true)}
            isLoading={refreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Backend</span>
          </Button>
        </div>
      </div>

      {/* Security Approval Gate Paused Section */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">
              Security Action Required ({pending.length} Paused at Stage 5)
            </h2>
          </div>

          <div className="space-y-4">
            {pending.map((p) => {
              // Convert pending item to Deployment model format for pipeline stepper
              const depModel: Deployment = {
                id: p.id,
                repo: p.repo,
                commit_sha: p.commit_sha,
                status: "pending_approval",
                image_tag: p.image_tag,
                critical_vulns: p.critical_vulns,
                high_vulns: p.high_vulns,
                started_at: p.created_at,
              };

              return (
                <DeploymentPipelineStepper
                  key={p.id}
                  deployment={depModel}
                  onActionComplete={() => fetchDeploymentsData(true)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Pipeline Deployment History with Real-Time Steppers */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Real-Time Pipeline Executions ({filteredDeployments.length})
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-dark-900 border border-dark-700/80 p-1 rounded-lg text-xs">
            {(["all", "success", "pending", "failed"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  statusFilter === filter
                    ? "bg-dark-750 text-zinc-100 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredDeployments.length === 0 ? (
          <div className="bg-dark-900 border border-dark-700 rounded-xl py-12 text-center text-xs text-zinc-500">
            No pipeline executions matching filter &quot;{statusFilter}&quot;.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeployments.map((deployment) => (
              <DeploymentPipelineStepper
                key={deployment.id}
                deployment={deployment}
                onActionComplete={() => fetchDeploymentsData(true)}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

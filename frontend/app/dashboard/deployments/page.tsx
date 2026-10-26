"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Rocket, ShieldAlert, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeploymentPipelineStepper } from "@/components/deployments/deployment-pipeline-stepper";
import { api } from "@/lib/api";
import { Deployment, PendingDeployment } from "@/lib/types";

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

// ── Confirm Modal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}
function ConfirmModal({ title, message, confirmLabel, confirmVariant = "danger", onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant={confirmVariant === "danger" ? "outline" : "primary"}
            size="sm"
            onClick={onConfirm}
            className={confirmVariant === "danger" ? "text-red-400 border-red-500/30 hover:bg-red-500/10" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DeploymentsPage() {
  const searchParams = useSearchParams();
  const repoFilter = searchParams.get("repo") ?? undefined;

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [pending, setPending] = useState<PendingDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: "approve" | "reject";
    deploymentId: number;
    repo: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchDeploymentsData = useCallback(async (isManual = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isManual) setRefreshing(true);
    try {
      const [historyData, pendingData] = await Promise.allSettled([
        api.getDeploymentHistory(repoFilter),
        api.getPendingDeployments(),
      ]);

      if (controller.signal.aborted) return;

      if (historyData.status === "fulfilled") setDeployments(historyData.value);
      else setErrorToast("Failed to load deployment history.");

      if (pendingData.status === "fulfilled") setPending(pendingData.value);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorToast("Unable to reach the backend API.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [repoFilter]);

  useEffect(() => {
    fetchDeploymentsData();

    const POLL_INTERVAL = 3000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchDeploymentsData(false);
        }
      }, POLL_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDeploymentsData(false);
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
  }, [fetchDeploymentsData]);

  const handleApproveClick = async (id: number, repo: string): Promise<void> => {
    setConfirmModal({ type: "approve", deploymentId: id, repo });
  };

  const handleRejectClick = async (id: number, repo: string): Promise<void> => {
    setConfirmModal({ type: "reject", deploymentId: id, repo });
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setConfirmModal(null);
    try {
      if (confirmModal.type === "approve") {
        await api.approveDeployment(confirmModal.deploymentId);
      } else {
        await api.rejectDeployment(confirmModal.deploymentId);
      }
      await fetchDeploymentsData(true);
    } catch {
      setErrorToast(`Failed to ${confirmModal.type} deployment. Please try again.`);
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "success") return d.status === "success" || d.status === "deployed";
    if (statusFilter === "pending") return ["pending_approval", "queued", "building", "scanning", "deploying"].includes(d.status);
    if (statusFilter === "failed") return d.status === "failed" || d.status === "rejected";
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
      {/* Toast */}
      {errorToast && <Toast message={errorToast} onDismiss={() => setErrorToast(null)} />}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.type === "approve" ? "Approve Deployment" : "Reject Deployment"}
          message={
            confirmModal.type === "approve"
              ? `Deploy ${confirmModal.repo} to Kubernetes? This will proceed despite any HIGH severity vulnerabilities.`
              : `Reject and discard the pending deployment for ${confirmModal.repo}? This action cannot be undone.`
          }
          confirmLabel={confirmModal.type === "approve" ? "Yes, Deploy" : "Yes, Reject"}
          confirmVariant={confirmModal.type === "reject" ? "danger" : "primary"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Header */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Deployments & Security Review
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time 7-stage pipeline visualizer powered by K3s Kubernetes and Trivy.
            {repoFilter && (
              <span className="ml-2 font-mono bg-brand/10 text-brand border border-brand/20 px-1.5 py-0.5 rounded text-[10px]">
                Filtered: {repoFilter}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchDeploymentsData(true)} isLoading={refreshing}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Poll Backend</span>
        </Button>
      </div>

      {/* Pending Approvals — Security Gate */}
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
                  onApprove={(id) => handleApproveClick(id, p.repo)}
                  onReject={(id) => handleRejectClick(id, p.repo)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Deployment History */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Pipeline Executions ({filteredDeployments.length})
            </h2>
          </div>
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
                onApprove={(id) => handleApproveClick(id, deployment.repo)}
                onReject={(id) => handleRejectClick(id, deployment.repo)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoPicker } from "@/components/projects/repo-picker";
import { api } from "@/lib/api";
import { GitHubRepo, Project } from "@/lib/types";

export default function ConnectProjectPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [connectedNames, setConnectedNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [reposData, connectedData] = await Promise.all([
        api.getAvailableRepos(),
        api.getConnectedProjects(),
      ]);

      setRepos(reposData);
      setConnectedNames(connectedData.map((p: Project) => p.repo_full_name));
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to load GitHub repositories. Ensure your GitHub OAuth token is valid."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-dark-700/80 pb-5">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Connected Repositories
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Connect a GitHub Repository
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Select a repository from your GitHub profile to automatically set up push webhooks.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Repos</span>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <RepoPicker
          repos={repos}
          connectedRepoNames={connectedNames}
          onConnected={loadData}
        />
      )}
    </div>
  );
}

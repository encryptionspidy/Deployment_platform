"use client";

import React, { useState } from "react";
import { Search, GitBranch, Lock, Globe, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitHubRepo } from "@/lib/types";
import { api } from "@/lib/api";

interface RepoPickerProps {
  repos: GitHubRepo[];
  connectedRepoNames: string[];
  onConnected?: () => void;
}

export function RepoPicker({ repos, connectedRepoNames, onConnected }: RepoPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [connectingRepo, setConnectingRepo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConnect = async (repoName: string) => {
    try {
      setConnectingRepo(repoName);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await api.connectRepo(repoName);
      setSuccessMsg(`Successfully connected ${res.repo} and registered webhook!`);

      if (onConnected) {
        onConnected();
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to connect ${repoName}`);
    } finally {
      setConnectingRepo(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search your GitHub repositories (e.g. owner/repo)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
        />
      </div>

      {/* Feedback banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Repos list */}
      <div className="space-y-3">
        {searchTerm.trim().length > 2 && !filteredRepos.some(r => r.full_name.toLowerCase() === searchTerm.toLowerCase()) && (
          <Card className="flex items-center justify-between p-4 border-brand/40 bg-brand/5 hover:border-brand transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center text-brand">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  {searchTerm.trim()}
                </h4>
                <p className="text-xs text-zinc-400">
                  Connect custom or external repository
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleConnect(searchTerm.trim())}
              isLoading={connectingRepo === searchTerm.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Custom</span>
            </Button>
          </Card>
        )}

        {filteredRepos.length === 0 && searchTerm.trim().length <= 2 ? (
          <div className="text-center py-12 bg-dark-800/40 rounded-xl border border-dark-700/50">
            <GitBranch className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-300">No repositories found</p>
            <p className="text-xs text-zinc-500">
              Type the full name of any repository (e.g. encryptionspidy/my-app) to connect it.
            </p>
          </div>
        ) : (
          filteredRepos.map((repo) => {
            const isAlreadyConnected = connectedRepoNames.includes(
              repo.full_name
            );
            const isConnecting = connectingRepo === repo.full_name;

            return (
              <Card
                key={repo.full_name}
                className="flex items-center justify-between p-4 hover:border-dark-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-zinc-400">
                    {repo.private ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">
                      {repo.full_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={repo.private ? "warning" : "info"} size="sm">
                        {repo.private ? "Private" : "Public"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  {isAlreadyConnected ? (
                    <Badge variant="success" size="md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnect(repo.full_name)}
                      isLoading={isConnecting}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Connect Project</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

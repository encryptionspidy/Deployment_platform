"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderGit2, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/projects/project-card";
import { api } from "@/lib/api";
import { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = async () => {
    try {
      setRefreshing(true);
      const data = await api.getConnectedProjects();
      setProjects(data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.repo_full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/80 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Connected Repositories
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Repositories with active GitHub webhooks shipping through the Deploy Platform CI/CD pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            isLoading={refreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href="/dashboard/projects/connect">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              <span>Connect New Project</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Filter connected repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="text-center py-16 bg-dark-900/60 border-dashed">
          <FolderGit2 className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">
            {searchTerm ? "No matching repositories found" : "No connected projects yet"}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 mb-6 max-w-sm mx-auto">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Connect your GitHub repositories to start auto-building and deploying images."}
          </p>
          {!searchTerm && (
            <Link href="/dashboard/projects/connect">
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4" />
                <span>Connect Your First Repository</span>
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} onRefresh={fetchProjects} />
          ))}
        </div>
      )}
    </div>
  );
}

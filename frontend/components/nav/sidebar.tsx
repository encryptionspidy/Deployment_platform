"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  Activity,
  Palette,
  Server,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: FolderGit2,
  },
  {
    name: "Deployments",
    href: "/dashboard/deployments",
    icon: Rocket,
  },
  {
    name: "Reliability & SLO",
    href: "/dashboard/reliability",
    icon: Activity,
  },
  {
    name: "Design Preview",
    href: "/design-preview",
    icon: Palette,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-dark-700/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-md shadow-brand/20">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-zinc-100 tracking-tight leading-tight">
              Deploy Platform
            </h1>
            <span className="text-[10px] font-mono text-zinc-400">
              v1.0.0 • K8s Pipeline
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/design-preview" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand/15 text-brand font-semibold shadow-inner border border-brand/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-dark-800/80"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-brand" : "text-zinc-400"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / GitHub Backend Link */}
      <div className="p-4 border-t border-dark-700/80">
        <div className="bg-dark-800/60 rounded-lg p-3 border border-dark-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-300 font-mono">Backend API</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Online
          </span>
        </div>
      </div>
    </aside>
  );
}

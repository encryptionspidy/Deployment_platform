"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  Activity,
  Server,
  Github,
  Settings,
  Menu,
  X,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview",        href: "/dashboard",              icon: LayoutDashboard },
  { name: "Projects",        href: "/dashboard/projects",     icon: FolderGit2 },
  { name: "Deployments",     href: "/dashboard/deployments",  icon: Rocket },
  { name: "Reliability & SLO", href: "/dashboard/reliability", icon: Activity },
  { name: "Settings",        href: "/dashboard/settings",     icon: Settings },
];

// Only shown in development
const DEV_ITEMS = [
  { name: "Design Preview",  href: "/design-preview",         icon: Palette },
];

type HealthStatus = "checking" | "online" | "offline";

function useBackendHealth(): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/healthz`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        setStatus(res.ok ? "online" : "offline");
      } catch {
        setStatus("offline");
      }
    };

    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

export function Sidebar() {
  const pathname = usePathname();
  const healthStatus = useBackendHealth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  const navItems = isDev ? [...NAV_ITEMS, ...DEV_ITEMS] : NAV_ITEMS;

  const healthBadge = {
    checking: { label: "Checking…", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
    online:   { label: "Online",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    offline:  { label: "Offline",   cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  }[healthStatus];

  const SidebarContent = () => (
    <aside className="w-64 bg-dark-900 border-r border-dark-700/80 flex flex-col justify-between h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-dark-700/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-md shadow-brand/20 flex-shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm text-zinc-100 tracking-tight leading-tight truncate">
              Deploy Platform
            </h1>
            <span className="text-[10px] font-mono text-zinc-400">
              v1.0.0 • K8s Pipeline
            </span>
          </div>
          {/* Mobile close button */}
          <button
            className="lg:hidden ml-auto p-1 rounded text-zinc-400 hover:text-zinc-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
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
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand/15 text-brand font-semibold shadow-inner border border-brand/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-dark-800/80"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-brand" : "text-zinc-400")} />
                <span>{item.name}</span>
                {item.href === "/design-preview" && (
                  <span className="ml-auto text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded">
                    DEV
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer — live health indicator */}
      <div className="p-4 border-t border-dark-700/80">
        <div className="bg-dark-800/60 rounded-lg p-3 border border-dark-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-300 font-mono">Backend API</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
              healthBadge.cls
            )}
          >
            {healthStatus === "online" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
            {healthStatus === "offline" && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            )}
            {healthBadge.label}
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile hamburger button (shown on < lg) */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-900 border border-dark-700/80 text-zinc-400 hover:text-zinc-100 shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}

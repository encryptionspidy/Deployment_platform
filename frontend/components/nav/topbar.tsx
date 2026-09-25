"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthUser } from "@/lib/types";

interface TopbarProps {
  user?: AuthUser | null;
}

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const getBreadcrumbs = () => {
    if (pathname === "/dashboard") {
      return [{ name: "Overview", href: "/dashboard" }];
    }
    const segments = pathname.replace("/dashboard/", "").split("/");
    const crumbs = [{ name: "Dashboard", href: "/dashboard" }];

    let currentPath = "/dashboard";
    segments.forEach((seg) => {
      currentPath += `/${seg}`;
      const name =
        seg.charAt(0).toUpperCase() + seg.slice(1).replace("-", " ");
      crumbs.push({ name, href: currentPath });
    });

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.logout();
      router.push("/");
    } catch {
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const username = user?.github_username || "Developer";
  const avatarLetter = username.charAt(0).toUpperCase();

  return (
    <header className="h-13 bg-dark-900 border-b border-dark-700/80 px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Vercel-style Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs">
        <span className="font-semibold text-zinc-300">Deploy Platform</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span
              className={
                idx === breadcrumbs.length - 1
                  ? "font-medium text-zinc-100"
                  : "text-zinc-400"
              }
            >
              {crumb.name}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right: Status Pill & Solid User Badge */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-[11px] text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-zinc-400">K8s Operational</span>
        </div>

        {user?.logged_in && (
          <div className="flex items-center gap-3 pl-3 border-l border-dark-700/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand text-white flex items-center justify-center text-xs font-bold font-mono">
                {avatarLetter}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-medium text-zinc-200 leading-tight">
                  {username}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                  OAuth Session
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-xs px-2 py-1 h-7"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

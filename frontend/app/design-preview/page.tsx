"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Rocket, ShieldAlert, CheckCircle2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VulnerabilityBadge } from "@/components/deployments/vulnerability-badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DesignPreviewPage() {
  return (
    <div className="min-h-screen bg-dark-950 text-zinc-100 p-8 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-700/80 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-brand hover:underline mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Design System & Component Preview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Phase 1 verification page showing dark mode color tokens, typography scale, and components.
          </p>
        </div>

        <Badge variant="info" size="md">
          Phase 1 Complete
        </Badge>
      </div>

      {/* Section 1: Color Tokens */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Dark Theme Color Palette
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-700">
            <span className="text-xs font-mono block text-zinc-400">#0a0a0a</span>
            <span className="text-xs font-medium text-zinc-200 mt-1 block">Root Dark</span>
          </div>
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-700">
            <span className="text-xs font-mono block text-zinc-400">#121214</span>
            <span className="text-xs font-medium text-zinc-200 mt-1 block">Sidebar Surface</span>
          </div>
          <div className="p-4 rounded-xl bg-dark-800 border border-dark-700">
            <span className="text-xs font-mono block text-zinc-400">#18181b</span>
            <span className="text-xs font-medium text-zinc-200 mt-1 block">Card Surface</span>
          </div>
          <div className="p-4 rounded-xl bg-dark-700 border border-dark-600">
            <span className="text-xs font-mono block text-zinc-400">#27272a</span>
            <span className="text-xs font-medium text-zinc-200 mt-1 block">Border Divider</span>
          </div>
          <div className="p-4 rounded-xl bg-brand text-white">
            <span className="text-xs font-mono block opacity-90">#3b82f6</span>
            <span className="text-xs font-semibold mt-1 block">Primary Brand</span>
          </div>
        </div>
      </section>

      {/* Section 2: Buttons */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Button Variants & Sizes
        </h2>

        <div className="bg-dark-900 p-6 rounded-xl border border-dark-700 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Brand</Button>
            <Button variant="secondary">Secondary Dark</Button>
            <Button variant="outline">Outline Border</Button>
            <Button variant="success">Success Action</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="ghost">Ghost Link</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-dark-700/60">
            <Button variant="primary" size="sm">Small Size</Button>
            <Button variant="primary" size="md">Medium Size</Button>
            <Button variant="primary" size="lg">Large Size</Button>
            <Button variant="primary" isLoading>Loading State</Button>
          </div>
        </div>
      </section>

      {/* Section 3: Status Badges */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Status Badges & Security Counters
        </h2>

        <div className="bg-dark-900 p-6 rounded-xl border border-dark-700 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">
              <CheckCircle2 className="w-3 h-3" /> Deployed (Success)
            </Badge>
            <Badge variant="warning">
              <ShieldAlert className="w-3 h-3" /> Pending Review
            </Badge>
            <Badge variant="error">
              <ShieldAlert className="w-3 h-3" /> Critical Failure
            </Badge>
            <Badge variant="info">
              <Terminal className="w-3 h-3" /> Informational
            </Badge>
            <Badge variant="neutral">Neutral Tag</Badge>
          </div>

          <div className="pt-2 border-t border-dark-700/60 flex items-center gap-4">
            <span className="text-xs text-zinc-400">Trivy Vulnerability Badges:</span>
            <VulnerabilityBadge critical={0} high={0} />
            <VulnerabilityBadge critical={2} high={5} />
          </div>
        </div>
      </section>

      {/* Section 4: Typography & Monospace Code */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Typography Scale & Monospace Code
        </h2>

        <div className="bg-dark-900 p-6 rounded-xl border border-dark-700 space-y-3">
          <h1 className="text-3xl font-extrabold text-zinc-100">Heading 1 — 3xl Bold</h1>
          <h2 className="text-xl font-bold text-zinc-100">Heading 2 — xl Bold</h2>
          <h3 className="text-base font-semibold text-zinc-200">Heading 3 — base Semibold</h3>
          <p className="text-sm text-zinc-400">Body text — sm regular for UI paragraphs and descriptions.</p>

          <div className="p-3 bg-dark-950 rounded-lg border border-dark-700 font-mono text-xs text-zinc-300 space-y-1">
            <div><span className="text-zinc-500">commit_sha:</span> 8a3f1b9c24017e84</div>
            <div><span className="text-zinc-500">image_tag:</span> app-my-portfolio:latest</div>
            <div><span className="text-zinc-500">node_port:</span> 30042 (NodePort K3s)</div>
          </div>
        </div>
      </section>

      {/* Section 5: Skeleton Loaders */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Loading Skeleton Placeholders
        </h2>

        <div className="bg-dark-900 p-6 rounded-xl border border-dark-700 space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

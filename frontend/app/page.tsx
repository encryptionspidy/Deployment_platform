"use client";

import React from "react";
import Link from "next/link";
import {
  Github,
  Server,
  Box,
  ShieldCheck,
  Rocket,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-dark-700/60 relative z-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-md shadow-brand/20">
            <Server className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">
            Deploy Platform
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/design-preview"
            className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
          >
            Design System
          </Link>

          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10 my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-dark-700 text-xs text-zinc-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Multi-Tenant K3s CI/CD & SRE Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight leading-tight">
          Push code. We build it, secure it, deploy it, and keep it reliable.
        </h1>

        <p className="mt-4 text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Self-hosted multi-tenant CI/CD platform & SRE observability engine powered by FastAPI, K3s Kubernetes, Trivy vulnerability scanning, and Prometheus.
        </p>

        {/* Action Buttons: Sign In / Connect Repository */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-7 py-3 text-sm font-medium shadow-lg shadow-brand/20"
            >
              <Github className="w-4 h-4" />
              <span>Sign In with GitHub ID</span>
              <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
            </Button>
          </Link>

          <Link href="/design-preview" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 py-3 text-sm">
              <span>View Component Specs</span>
            </Button>
          </Link>
        </div>

        {/* 3-Step Pipeline Visual Concept */}
        <div className="mt-16 pt-10 border-t border-dark-700/60 max-w-lg mx-auto">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-brand">
                <Box className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">1. Docker Build</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">2. Trivy CVE Scan</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-emerald-400">
                <Rocket className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">3. K8s Deploy</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-dark-700/60 px-8 flex items-center justify-between text-xs text-zinc-500 max-w-6xl mx-auto w-full relative z-10">
        <div>Deploy Platform • Vercel + Linear Design System</div>
        <div className="font-mono text-[11px] text-zinc-500">
          FastAPI • Next.js 15 App Router
        </div>
      </footer>
    </div>
  );
}

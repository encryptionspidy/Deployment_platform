"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Github, Server, ArrowRight, ShieldCheck, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGitHubLogin = (switchAccount = false) => {
    setIsRedirecting(true);
    let loginUrl = api.getLoginUrl();
    if (switchAccount) {
      loginUrl += "?switch_account=true";
    }
    window.location.href = loginUrl;
  };

  const handleDemoLogin = () => {
    setIsRedirecting(true);
    window.location.href = api.getDemoLoginUrl();
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-between items-center p-6 select-none">
      {/* Top Brand Header */}
      <header className="w-full max-w-md flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-md shadow-brand/20">
            <Server className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">
            Deploy Platform
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
        >
          Back to Home
        </Link>
      </header>

      {/* Login Form Card */}
      <main className="w-full max-w-md my-auto">
        <Card className="bg-dark-900 border-dark-700/80 p-8 space-y-6 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Sign in with GitHub
            </h1>
            <p className="text-xs text-zinc-400">
              Authenticate dynamically with your GitHub account to manage repositories, automated builds, and deployments.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => handleGitHubLogin(false)}
              isLoading={isRedirecting}
              className="w-full py-3 text-xs font-semibold shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
            >
              <Github className="w-4 h-4" />
              <span>Continue with GitHub</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </Button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-750" />
              </div>
              <span className="relative bg-dark-900 px-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                or presentation mode
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDemoLogin}
              isLoading={isRedirecting}
              className="w-full py-3 text-xs font-semibold border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/60 flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>1-Click Demo Login (Bypass GitHub)</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </Button>

            <button
              type="button"
              onClick={() => handleGitHubLogin(true)}
              disabled={isRedirecting}
              className="w-full py-2 text-[11px] text-zinc-400 hover:text-zinc-200 hover:underline flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-zinc-500" />
              <span>Switch or use a different GitHub account</span>
            </button>
          </div>

          <div className="pt-4 border-t border-dark-800 text-center">
            <p className="text-[11px] text-zinc-500">
              Each user receives an isolated tenant environment, encrypted credential storage, and private repository support.
            </p>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-xs text-zinc-600 font-mono py-4">
        Deploy Platform • Multi-Tenant K3s CI/CD
      </footer>
    </div>
  );
}

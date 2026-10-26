"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Key,
  Globe,
  Database,
  RefreshCw,
  Copy,
  CheckCircle2,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthUser } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

interface ServiceHealth {
  name: string;
  url: string;
  status: "checking" | "online" | "offline";
  path: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-dark-700 text-zinc-500 hover:text-zinc-300 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: "Dashboard API", url: API_BASE, status: "checking", path: "/healthz" },
    { name: "Webhook Receiver", url: "http://localhost:8000", status: "checking", path: "/healthz" },
    { name: "Metrics Exporter", url: "http://localhost:8001", status: "checking", path: "/healthz" },
  ]);

  useEffect(() => {
    api.getAuthUser().then(setUser).catch(() => {});
  }, []);

  const checkAllHealth = async () => {
    const updated = await Promise.all(
      services.map(async (svc) => {
        try {
          const res = await fetch(`${svc.url}${svc.path}`, {
            signal: AbortSignal.timeout(3000),
          });
          return { ...svc, status: (res.ok ? "online" : "offline") as ServiceHealth["status"] };
        } catch {
          return { ...svc, status: "offline" as ServiceHealth["status"] };
        }
      })
    );
    setServices(updated);
  };

  useEffect(() => { checkAllHealth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusDot = {
    checking: "bg-zinc-400 animate-pulse",
    online:   "bg-emerald-500",
    offline:  "bg-red-400",
  };

  const configRows = [
    { key: "API Base URL",         value: API_BASE },
    { key: "Webhook Endpoint",     value: `${API_BASE.replace("8002", "8000")}/webhook/github` },
    { key: "Prometheus",           value: "http://localhost:9090" },
    { key: "Grafana Dashboard",    value: "http://localhost:3001" },
    { key: "Redis Queue",          value: "localhost:6379  (queue: build_jobs)" },
    { key: "Dead-Letter Queue",    value: "localhost:6379  (queue: build_jobs_dlq)" },
    { key: "PostgreSQL",           value: "localhost:5433  (db: deploy_platform)" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-5 h-5 text-brand" />
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Platform Settings</h1>
        </div>
        <p className="text-xs text-zinc-400">
          Configuration overview, service health, and webhook setup for your deploy platform instance.
        </p>
      </div>

      {/* Tenant Info */}
      <Card className="bg-dark-900 border-dark-700 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-700/60 pb-3">
          <Shield className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-zinc-200">Session & Tenant</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-500 block mb-0.5">Authenticated as</span>
            <span className="font-mono text-zinc-200">
              {user?.logged_in ? user.github_username : "Not logged in"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Auth Method</span>
            <span className="font-mono text-zinc-200">GitHub OAuth 2.0 + Encrypted Session</span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Token Storage</span>
            <span className="font-mono text-zinc-200">Fernet-encrypted in PostgreSQL</span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Demo Login</span>
            <span className="font-mono text-zinc-200">Disabled (set ENABLE_DEMO_LOGIN=true to enable)</span>
          </div>
        </div>
      </Card>

      {/* Service Health */}
      <Card className="bg-dark-900 border-dark-700 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-dark-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-zinc-200">Service Health</h2>
          </div>
          <Button variant="outline" size="sm" onClick={checkAllHealth}>
            <RefreshCw className="w-3 h-3" />
            <span>Re-check</span>
          </Button>
        </div>
        <div className="space-y-2">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between text-xs bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[svc.status]}`} />
                <span className="font-medium text-zinc-200">{svc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-zinc-400">{svc.url}</span>
                <a
                  href={`${svc.url}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-brand"
                  title="Open API docs"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Platform Configuration */}
      <Card className="bg-dark-900 border-dark-700 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-700/60 pb-3">
          <Database className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-zinc-200">Platform Configuration</h2>
        </div>
        <div className="space-y-2">
          {configRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between text-xs bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2"
            >
              <span className="text-zinc-400 w-40 flex-shrink-0">{row.key}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <code className="font-mono text-zinc-200 truncate">{row.value}</code>
                <CopyButton text={row.value} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhook Setup */}
      <Card className="bg-dark-900 border-dark-700 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-700/60 pb-3">
          <Key className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-zinc-200">Webhook Configuration</h2>
        </div>
        <div className="space-y-3 text-xs text-zinc-400">
          <p>
            To receive push events from GitHub, configure a webhook on your repository with:
          </p>
          <ul className="space-y-2 ml-4 list-disc">
            <li>
              <span className="text-zinc-300 font-medium">Payload URL:</span>{" "}
              <code className="font-mono bg-dark-800 px-1.5 py-0.5 rounded text-brand">
                https://your-ngrok-url/webhook/github
              </code>
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Content type:</span>{" "}
              <code className="font-mono bg-dark-800 px-1.5 py-0.5 rounded text-zinc-200">application/json</code>
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Secret:</span>{" "}
              <code className="font-mono bg-dark-800 px-1.5 py-0.5 rounded text-zinc-200">
                Value of GITHUB_WEBHOOK_SECRET in webhook-receiver/.env
              </code>
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Events:</span> Just the <em>push</em> event
            </li>
          </ul>
          <p className="text-zinc-500">
            The secret must match exactly between your GitHub webhook settings,{" "}
            <code className="font-mono text-zinc-400">webhook-receiver/.env</code>, and{" "}
            <code className="font-mono text-zinc-400">dashboard-backend/.env</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

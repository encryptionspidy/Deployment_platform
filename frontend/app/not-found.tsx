import Link from "next/link";
import { Server, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
        <Server className="w-6 h-6" />
      </div>

      <h1 className="text-4xl font-extrabold text-zinc-100 tracking-tight font-mono">
        404
      </h1>
      <h2 className="text-lg font-semibold text-zinc-200 mt-2">
        Page Not Found
      </h2>
      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
        The requested dashboard route or deployment resource could not be found.
      </p>

      <div className="mt-6">
        <Link href="/dashboard">
          <Button variant="primary" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

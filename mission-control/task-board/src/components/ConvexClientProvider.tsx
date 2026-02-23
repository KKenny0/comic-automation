"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const client = useMemo(() => {
    if (!convexUrl) return null;

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-amber-500/40 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold">Convex 未配置</h1>
          <p className="mt-3 text-sm text-slate-200/90">
            请先在项目根目录创建 <code>.env.local</code>，并设置
            <code className="mx-1">NEXT_PUBLIC_CONVEX_URL</code>。
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

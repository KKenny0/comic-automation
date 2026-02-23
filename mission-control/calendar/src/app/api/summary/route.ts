import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const listRange = makeFunctionReference<"query">("events:listRange");

export async function GET() {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not set" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const now = Date.now();
    const start = now - 14 * 24 * 60 * 60 * 1000;
    const end = now + 30 * 24 * 60 * 60 * 1000;

    const items = (await client.query(listRange, { start, end })) as Array<{
      status: string;
      kind: string;
      nextRunAt?: number;
      lastRunStatus?: string;
    }>;

    const cronJobs = items.filter((i) => i.kind === "cron_job").length;
    const scheduledTasks = items.filter((i) => i.kind === "scheduled_task").length;
    const running = items.filter((i) => i.status === "running").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const nextRuns = items.filter((i) => typeof i.nextRunAt === "number").length;

    return NextResponse.json({
      cronJobs,
      scheduledTasks,
      running,
      failed,
      nextRuns,
      total: items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

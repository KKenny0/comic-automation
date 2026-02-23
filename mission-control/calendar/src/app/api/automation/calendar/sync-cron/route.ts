import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const syncCronJobs = makeFunctionReference<"mutation">("events:syncCronJobs");

type CronJobInput = {
  cronJobId: string;
  title: string;
  scheduledFor: number;
  assignee: "Kenny" | "Assistant";
  cronExpr?: string;
  status?: "scheduled" | "running" | "completed" | "cancelled" | "failed";
  nextRunAt?: number;
};

export async function POST(req: Request) {
  try {
    const expected = process.env.CALENDAR_AUTOMATION_TOKEN;
    const provided = req.headers.get("x-mc-token");
    if (expected && provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not set" }, { status: 500 });
    }

    const body = (await req.json()) as { jobs?: CronJobInput[] };
    const jobs = body.jobs ?? [];
    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: "jobs must be an array" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(syncCronJobs, { jobs });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

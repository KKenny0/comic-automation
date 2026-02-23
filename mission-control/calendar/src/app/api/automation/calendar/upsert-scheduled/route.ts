import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const upsertScheduledEntry = makeFunctionReference<"mutation">(
  "events:upsertScheduledEntry",
);

type Body = {
  autoKey: string;
  title: string;
  description?: string;
  scheduledFor: number;
  assignee: "Kenny" | "Assistant";
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

    const body = (await req.json()) as Body;
    if (!body?.autoKey || !body?.title || !body?.scheduledFor || !body?.assignee) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const id = await client.mutation(upsertScheduledEntry, body);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const listTasks = makeFunctionReference<"query">("tasks:list");

export async function GET() {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not set" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const tasks = (await client.query(listTasks, {})) as Array<{
      status: "todo" | "in_progress" | "blocked" | "done";
      source?: "manual" | "assistant_auto";
    }>;

    const count = (status: string) => tasks.filter((t) => t.status === status).length;

    return NextResponse.json({
      total: tasks.length,
      todo: count("todo"),
      inProgress: count("in_progress"),
      blocked: count("blocked"),
      done: count("done"),
      auto: tasks.filter((t) => t.source === "assistant_auto").length,
      manual: tasks.filter((t) => t.source !== "assistant_auto").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

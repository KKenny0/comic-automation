import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const listRange = makeFunctionReference<"query">("events:listRange");

export async function GET(req: Request) {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex URL is not set" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const start = Number(searchParams.get("start"));
    const end = Number(searchParams.get("end"));

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return NextResponse.json({ error: "start/end required" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const items = await client.query(listRange, { start, end });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

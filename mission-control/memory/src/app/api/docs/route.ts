import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const searchMemoryDocs = makeFunctionReference<"query">("memories:search");

export async function GET(req: Request) {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex URL is not set" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const term = searchParams.get("term")?.trim() || undefined;

    const client = new ConvexHttpClient(convexUrl);
    const docs = await client.query(searchMemoryDocs, { term });

    return NextResponse.json({ docs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

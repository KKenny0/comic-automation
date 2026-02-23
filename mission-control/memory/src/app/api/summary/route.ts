import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const searchMemoryDocs = makeFunctionReference<"query">("memories:search");

export async function GET() {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not set" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const docs = (await client.query(searchMemoryDocs, {})) as Array<{
      updatedAt: number;
      sourcePath?: string;
    }>;

    const lastUpdatedAt = docs.length > 0 ? Math.max(...docs.map((d) => d.updatedAt)) : null;
    const automated = docs.filter((d) => d.sourcePath?.startsWith("automation/")).length;

    return NextResponse.json({
      total: docs.length,
      automated,
      fileBacked: docs.length - automated,
      lastUpdatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

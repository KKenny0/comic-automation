import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

const upsertAutomationMemory = makeFunctionReference<"mutation">(
  "memories:upsertAutomationMemory",
);

type Body = {
  autoKey: string;
  title: string;
  content: string;
  tags?: string[];
};

export async function POST(req: Request) {
  try {
    const expected = process.env.MEMORY_AUTOMATION_TOKEN;
    const provided = req.headers.get("x-mc-token");
    if (expected && provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not set" }, { status: 500 });
    }

    const body = (await req.json()) as Body;
    if (!body?.autoKey || !body?.title || !body?.content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const id = await client.mutation(upsertAutomationMemory, {
      autoKey: body.autoKey,
      title: body.title,
      content: body.content,
      tags: body.tags ?? ["automation", "memory"],
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

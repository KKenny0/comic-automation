import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { resolveConvexUrl } from "@/lib/server/convexUrl";

export const runtime = "nodejs";

type SyncDoc = {
  title: string;
  content: string;
  tags: string[];
  sourcePath: string;
};

const upsertMemoryFromSource = makeFunctionReference<"mutation">(
  "memories:upsertFromSource",
);

const workspaceRoot = path.resolve(process.cwd(), "../..");

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  if (!(await fileExists(dirPath))) return [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }

  return files;
}

function toTitle(filePath: string) {
  const base = path.basename(filePath, ".md");
  if (base.toUpperCase() === "MEMORY") return "Long-term Memory";
  return base;
}

function inferTags(relativePath: string) {
  const tags = ["memory"];
  if (relativePath.startsWith("memory/")) tags.push("daily");
  if (relativePath === "MEMORY.md") tags.push("long-term");
  return tags;
}

export async function POST() {
  try {
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL is not set" },
        { status: 500 },
      );
    }

    const candidates: string[] = [];

    const longTerm = path.join(workspaceRoot, "MEMORY.md");
    if (await fileExists(longTerm)) {
      candidates.push(longTerm);
    }

    const dailyDir = path.join(workspaceRoot, "memory");
    candidates.push(...(await listMarkdownFiles(dailyDir)));

    const docs: SyncDoc[] = [];

    for (const filePath of candidates) {
      const content = await fs.readFile(filePath, "utf8");
      const sourcePath = path.relative(workspaceRoot, filePath);
      docs.push({
        title: toTitle(filePath),
        content,
        tags: inferTags(sourcePath),
        sourcePath,
      });
    }

    docs.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

    const client = new ConvexHttpClient(convexUrl);

    let success = 0;
    const failures: Array<{ sourcePath: string; error: string }> = [];

    for (const doc of docs) {
      try {
        await client.mutation(upsertMemoryFromSource, doc);
        success += 1;
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown mutation error";
        const looksLikeConnectivityIssue =
          /fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(raw);

        failures.push({
          sourcePath: doc.sourcePath,
          error: looksLikeConnectivityIssue
            ? `Cannot reach Convex at ${convexUrl}. Start \`npm run convex:dev\` in mission-control/memory and keep it running.`
            : raw,
        });
      }
    }

    return NextResponse.json({
      total: docs.length,
      success,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

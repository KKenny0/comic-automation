#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const upsertMemoryFromSource = makeFunctionReference("memories:upsertFromSource");

function parseEnvLike(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash >= 0) value = value.slice(0, hash).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(dirPath) {
  if (!(await exists(dirPath))) return [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

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

function toTitle(filePath) {
  const base = path.basename(filePath, ".md");
  if (base.toUpperCase() === "MEMORY") return "Long-term Memory";
  return base;
}

function inferTags(relativePath) {
  const tags = ["memory"];
  if (relativePath.startsWith("memory/")) tags.push("daily");
  if (relativePath === "MEMORY.md") tags.push("long-term");
  return tags;
}

async function main() {
  const appRoot = process.cwd();
  const workspaceRoot = path.resolve(appRoot, "../..");
  const envPath = path.join(appRoot, ".env.local");

  if (!(await exists(envPath))) {
    throw new Error(`Missing ${envPath}`);
  }

  const env = parseEnvLike(await fs.readFile(envPath, "utf8"));
  const convexUrl = env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL in .env.local");
  }

  const candidates = [];
  const longTerm = path.join(workspaceRoot, "MEMORY.md");
  if (await exists(longTerm)) candidates.push(longTerm);

  const dailyDir = path.join(workspaceRoot, "memory");
  candidates.push(...(await listMarkdownFiles(dailyDir)));

  const docs = [];
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
  const failures = [];

  for (const doc of docs) {
    try {
      await client.mutation(upsertMemoryFromSource, doc);
      success += 1;
      console.log(`✓ upserted ${doc.sourcePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ sourcePath: doc.sourcePath, error: message });
      console.error(`✗ failed ${doc.sourcePath}: ${message}`);
    }
  }

  console.log(`\nSync complete: ${success}/${docs.length} succeeded`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

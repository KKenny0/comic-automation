import fs from "node:fs";
import path from "node:path";

export function resolveConvexUrl() {
  const fromEnv = process.env["CONVEX_URL"] ?? process.env["NEXT_PUBLIC_CONVEX_URL"];
  if (fromEnv) return fromEnv;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const raw = fs.readFileSync(envPath, "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.startsWith("CONVEX_URL=") || l.startsWith("NEXT_PUBLIC_CONVEX_URL="));
    if (!line) return null;
    return line.split("=").slice(1).join("=").trim();
  } catch {
    return null;
  }
}

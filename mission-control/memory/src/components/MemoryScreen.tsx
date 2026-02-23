"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  createMemoryDoc,
  searchMemoryDocs,
  type MemoryDoc,
} from "@/lib/convexFunctions";

type SyncResponse = {
  total: number;
  success: number;
  failed: number;
  failures?: Array<{ sourcePath: string; error: string }>;
  error?: string;
};

const AUTO_SYNC_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 60_000;

export function MemoryScreen() {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const docs = useQuery(searchMemoryDocs, {
    term: search.trim() || undefined,
  }) as MemoryDoc[] | undefined;
  const [serverDocs, setServerDocs] = useState<MemoryDoc[]>([]);

  const create = useMutation(createMemoryDoc);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await create({
      title: title.trim(),
      content: content.trim(),
      tags: tagList,
      sourcePath: sourcePath.trim() || undefined,
    });

    setTitle("");
    setContent("");
    setTags("");
    setSourcePath("");
  };

  const syncWorkspaceMemories = async (mode: "manual" | "auto" = "manual") => {
    if (syncing) return;

    setSyncing(true);
    if (mode === "manual") setSyncMessage(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch("/api/memory/sync", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timer);

      const payload = (await res.json()) as SyncResponse;
      if (!res.ok) throw new Error(payload.error || `Sync failed: ${res.status}`);

      setLastSyncedAt(Date.now());

      if ((payload.total ?? 0) === 0) {
        setSyncMessage("No workspace memory files found to sync.");
        return;
      }

      if ((payload.failed ?? 0) > 0) {
        const first = payload.failures?.[0];
        setSyncMessage(
          `Synced ${payload.success}/${payload.total} memory files (${payload.failed} failed). ${first ? `${first.sourcePath}: ${first.error}` : ""}`,
        );
        return;
      }

      setSyncMessage(`Synced ${payload.success} memory files from workspace.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      setSyncMessage(`Sync failed: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncWorkspaceMemories("auto");
    const id = setInterval(() => {
      void syncWorkspaceMemories("auto");
    }, AUTO_SYNC_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchServerDocs = async () => {
      try {
        const q = encodeURIComponent(search.trim());
        const res = await fetch(`/api/docs${q ? `?term=${q}` : ""}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { docs?: MemoryDoc[] };
        setServerDocs(payload.docs ?? []);
      } catch {
        // keep existing docs
      }
    };

    void fetchServerDocs();
  }, [search, lastSyncedAt]);

  const displayedDocs = (docs && docs.length > 0) ? docs : serverDocs;

  const resultLabel = useMemo(() => {
    const count = displayedDocs.length;
    return `${count} memory document${count === 1 ? "" : "s"}`;
  }, [displayedDocs]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Memory</h1>
            <p className="mt-2 text-slate-300">Beautiful memory documents with quick search.</p>
          </div>
          <button
            onClick={() => void syncWorkspaceMemories("manual")}
            disabled={syncing}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync all workspace memories"}
          </button>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
          <h2 className="mb-3 text-lg font-semibold">Search Memories</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, content, or tags..."
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <p className="mt-2 text-sm text-slate-400">{resultLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            Source: {docs && docs.length > 0 ? "Convex live query" : "Server fallback API"}
          </p>
          {lastSyncedAt ? (
            <p className="mt-1 text-xs text-slate-400">Last synced: {new Date(lastSyncedAt).toLocaleString()}</p>
          ) : null}
          {syncMessage ? (
            <p className="mt-2 text-sm text-emerald-300">{syncMessage}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Add Memory Document</h2>
          <form onSubmit={onCreate} className="grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              required
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Memory content"
              required
              rows={6}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
              <input
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="Source path (optional)"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </div>
            <button className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500" type="submit">
              Save Memory
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Memory Documents</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedDocs.map((doc) => {
              const isExpanded = expandedDocId === doc._id;

              return (
                <article
                  key={doc._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedDocId((prev) => (prev === doc._id ? null : doc._id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedDocId((prev) => (prev === doc._id ? null : doc._id));
                    }
                  }}
                  className="cursor-pointer rounded-xl border border-amber-200/60 bg-[linear-gradient(180deg,#fffdf7_0%,#f9f5e8_100%)] p-5 shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{doc.title}</h3>
                    <span className="rounded border border-amber-300 bg-amber-100/60 px-2 py-0.5 text-[11px] text-amber-900">
                      {isExpanded ? "Expanded" : "Document"}
                    </span>
                  </div>

                  <div className="mt-3 border-l-2 border-amber-300 pl-3">
                    <p
                      className={[
                        "whitespace-pre-wrap text-sm leading-6 text-slate-800",
                        isExpanded ? "max-h-80 overflow-y-auto pr-2" : "line-clamp-10",
                      ].join(" ")}
                    >
                      {doc.content}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {isExpanded ? "Click again to collapse" : "Click card to expand full content"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-slate-600">Updated {new Date(doc.updatedAt).toLocaleString()}</p>
                  {doc.sourcePath ? (
                    <p className="mt-1 text-xs text-slate-500">Source: {doc.sourcePath}</p>
                  ) : null}
                </article>
              );
            })}
            {displayedDocs.length === 0 ? (
              <p className="text-sm text-slate-400">No memory documents yet. Click Sync all workspace memories.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

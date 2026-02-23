const apps = [
  {
    key: "taskBoard",
    name: "Task Board",
    description: "Track active tasks, statuses, and assignees.",
    url: process.env.NEXT_PUBLIC_TASK_BOARD_URL ?? "http://localhost:3001",
    run: "cd ../task-board && npm run convex:dev && npm run dev -- -p 3001",
  },
  {
    key: "calendar",
    name: "Calendar",
    description: "Manage scheduled tasks and cron jobs.",
    url: process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3002",
    run: "cd ../calendar && npm run convex:dev && npm run dev -- -p 3002",
  },
  {
    key: "memory",
    name: "Memory",
    description: "Browse and search memory documents.",
    url: process.env.NEXT_PUBLIC_MEMORY_URL ?? "http://localhost:3003",
    run: "cd ../memory && npm run convex:dev && npm run dev -- -p 3003",
  },
] as const;

async function fetchSummary(baseUrl: string) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl}/api/summary`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return { ok: false as const, status: res.status };
    const data = await res.json();
    return { ok: true as const, data };
  } catch {
    return { ok: false as const };
  }
}

export default async function Home() {
  const [taskBoardSummary, calendarSummary, memorySummary] = await Promise.all([
    fetchSummary(apps[0].url),
    fetchSummary(apps[1].url),
    fetchSummary(apps[2].url),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Mission Control</h1>
          <p className="mt-2 text-slate-300">
            Unified portal for Task Board, Calendar, and Memory.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Cross-module overview</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="font-medium">Tasks</p>
              {taskBoardSummary.ok ? (
                <p className="mt-1 text-slate-300">
                  Total {taskBoardSummary.data.total} · In Progress {taskBoardSummary.data.inProgress} · Blocked {taskBoardSummary.data.blocked}
                </p>
              ) : (
                <p className="mt-1 text-amber-300">Task Board offline / summary unavailable</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="font-medium">Calendar</p>
              {calendarSummary.ok ? (
                <p className="mt-1 text-slate-300">
                  Cron {calendarSummary.data.cronJobs} · Running {calendarSummary.data.running} · Failed {calendarSummary.data.failed}
                </p>
              ) : (
                <p className="mt-1 text-amber-300">Calendar offline / summary unavailable</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="font-medium">Memory</p>
              {memorySummary.ok ? (
                <p className="mt-1 text-slate-300">
                  Docs {memorySummary.data.total} · Automated {memorySummary.data.automated}
                </p>
              ) : (
                <p className="mt-1 text-amber-300">Memory offline / summary unavailable</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {apps.map((app) => (
            <article
              key={app.name}
              className="rounded-xl border border-slate-700 bg-slate-900 p-5"
            >
              <h2 className="text-xl font-semibold">{app.name}</h2>
              <p className="mt-2 text-sm text-slate-300">{app.description}</p>
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500"
              >
                Open {app.name}
              </a>
              <div className="mt-4 rounded-md border border-slate-700 bg-slate-950 p-2">
                <p className="text-xs text-slate-400">Run:</p>
                <code className="text-xs text-slate-200 break-all">{app.run}</code>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold">Suggested startup order</h3>
          <ol className="mt-3 list-decimal pl-5 text-sm text-slate-300 space-y-1">
            <li>Start each apps Convex backend with <code>npm run convex:dev</code>.</li>
            <li>Start each Next.js app on its own port (3001/3002/3003).</li>
            <li>Keep this portal on port 3000 for top-level navigation.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  createCalendarItem,
  listCalendarRange,
  updateCalendarAssignee,
  updateCalendarStatus,
  type CalendarAssignee,
  type CalendarKind,
  type CalendarStatus,
} from "@/lib/convexFunctions";
import { MissionNav } from "@/components/MissionNav";

type CalendarItem = {
  _id: string;
  title: string;
  description?: string;
  kind: CalendarKind;
  assignee: CalendarAssignee;
  status: CalendarStatus;
  scheduledFor: number;
  source: "manual" | "cron";
  cronExpr?: string;
  cronJobId?: string;
  nextRunAt?: number;
  lastRunAt?: number;
  lastRunStatus?: "success" | "failed" | "running" | "skipped";
  lastRunSummary?: string;
};

const statusOptions: CalendarStatus[] = [
  "scheduled",
  "running",
  "completed",
  "cancelled",
  "failed",
];

const dayMs = 24 * 60 * 60 * 1000;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function fmtDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getCalendarTime(item: CalendarItem) {
  return item.kind === "cron_job" ? (item.nextRunAt ?? item.scheduledFor) : item.scheduledFor;
}

export function MissionCalendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Keep data range aligned with portal summary API to avoid count mismatch (e.g. 3 vs 2 cron jobs)
  const [windowRange] = useState(() => {
    const now = Date.now();
    return {
      start: now - 14 * dayMs,
      end: now + 30 * dayMs,
    };
  });

  const entries = useQuery(listCalendarRange, {
    start: windowRange.start,
    end: windowRange.end,
  }) as CalendarItem[] | undefined;
  const [serverEntries, setServerEntries] = useState<CalendarItem[]>([]);

  const create = useMutation(createCalendarItem);
  const updateStatus = useMutation(updateCalendarStatus);
  const updateAssignee = useMutation(updateCalendarAssignee);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<CalendarKind>("scheduled_task");
  const [assignee, setAssignee] = useState<CalendarAssignee>("Assistant");
  const [scheduledForInput, setScheduledForInput] = useState(() => fmtDateInput(new Date()));
  const [cronExpr, setCronExpr] = useState("");
  const [cronJobId, setCronJobId] = useState("");

  useEffect(() => {
    const fetchServerEntries = async () => {
      try {
        const start = windowRange.start;
        const end = windowRange.end;
        const res = await fetch(`/api/items?start=${start}&end=${end}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { items?: CalendarItem[] };
        setServerEntries(payload.items ?? []);
      } catch {
        // keep existing entries
      }
    };

    void fetchServerEntries();
  }, [windowRange]);

  const displayedEntries = (entries && entries.length > 0) ? entries : serverEntries;

  const groupedByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of displayedEntries) {
      const key = new Date(getCalendarTime(item)).toDateString();
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [displayedEntries]);

  const selectedItems = groupedByDay.get(selectedDate.toDateString()) ?? [];

  const upcomingCronJobs = useMemo(
    () => displayedEntries
      .filter((item) => item.kind === "cron_job")
      .sort((a, b) => getCalendarTime(a) - getCalendarTime(b))
      .slice(0, 5),
    [displayedEntries],
  );

  const daysInMonth = useMemo(() => {
    const firstDay = startOfMonth(cursor);
    const startWeekday = firstDay.getDay();
    const lastDay = endOfMonth(cursor).getDate();

    const cells: Array<Date | null> = Array.from({ length: startWeekday }, () => null);
    for (let day = 1; day <= lastDay; day++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const when = new Date(scheduledForInput).getTime();
    if (!title.trim() || Number.isNaN(when)) return;

    await create({
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      assignee,
      source: kind === "cron_job" ? "cron" : "manual",
      scheduledFor: when,
      cronExpr: kind === "cron_job" ? cronExpr.trim() || undefined : undefined,
      cronJobId: kind === "cron_job" ? cronJobId.trim() || undefined : undefined,
      status: "scheduled",
    });

    setTitle("");
    setDescription("");
    setCronExpr("");
    setCronJobId("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="mt-2 text-slate-300">All scheduled tasks and cron jobs live here.</p>
          </div>
          <MissionNav />
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Add Scheduled Item</h2>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" type="datetime-local" value={scheduledForInput} onChange={(e) => setScheduledForInput(e.target.value)} required />
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as CalendarKind)}>
              <option value="scheduled_task">Scheduled task</option>
              <option value="cron_job">Cron job</option>
            </select>
            <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={assignee} onChange={(e) => setAssignee(e.target.value as CalendarAssignee)}>
              <option value="Kenny">Kenny</option>
              <option value="Assistant">Assistant</option>
            </select>
            {kind === "cron_job" ? (
              <>
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Cron expr (optional)" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} />
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Cron job id (optional)" value={cronJobId} onChange={(e) => setCronJobId(e.target.value)} />
              </>
            ) : null}
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 lg:col-span-3">Create</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
          <h2 className="text-lg font-semibold">Upcoming Cron Jobs</h2>
          <div className="mt-3 space-y-2">
            {upcomingCronJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No cron jobs found in this month range.</p>
            ) : (
              upcomingCronJobs.map((job) => (
                <div key={job._id} className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-xs text-slate-300">
                    Next: {new Date(getCalendarTime(job)).toLocaleString()} · {job.cronExpr ?? "(manual)"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <button className="rounded border border-slate-700 px-3 py-1" onClick={() => setCursor(new Date(cursor.getTime() - 31 * dayMs))}>←</button>
              <h3 className="text-lg font-semibold">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
              <button className="rounded border border-slate-700 px-3 py-1" onClick={() => setCursor(new Date(cursor.getTime() + 31 * dayMs))}>→</button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, idx) => {
                if (!day) return <div key={idx} className="h-20 rounded bg-slate-900/20" />;
                const key = day.toDateString();
                const count = groupedByDay.get(key)?.length ?? 0;
                const selected = key === selectedDate.toDateString();
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={`h-20 rounded border p-2 text-left ${selected ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-950/70"}`}
                  >
                    <div className="text-xs">{day.getDate()}</div>
                    {count > 0 ? <div className="mt-2 text-xs text-blue-300">{count} item(s)</div> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-lg font-semibold">{selectedDate.toDateString()}</h3>
            <div className="mt-3 space-y-3">
              {selectedItems.length === 0 ? (
                <p className="text-sm text-slate-400">No scheduled items.</p>
              ) : (
                selectedItems.map((item) => (
                  <div key={item._id} className="rounded border border-slate-800 bg-slate-950 p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(getCalendarTime(item)).toLocaleString()}</p>
                    <p className="text-xs mt-1 text-slate-300">{item.kind === "cron_job" ? "Cron" : "Task"} • {item.assignee}</p>
                    {item.cronExpr ? <p className="text-xs text-slate-400">{item.cronExpr}</p> : null}
                    {item.nextRunAt ? (
                      <p className="text-xs text-blue-300">Next run: {new Date(item.nextRunAt).toLocaleString()}</p>
                    ) : null}
                    {item.lastRunAt ? (
                      <p className="text-xs text-emerald-300">
                        Last run: {new Date(item.lastRunAt).toLocaleString()} ({item.lastRunStatus ?? "unknown"})
                      </p>
                    ) : null}
                    {item.lastRunSummary ? (
                      <p className="text-xs text-slate-400">{item.lastRunSummary}</p>
                    ) : null}
                    <div className="mt-2 grid gap-2">
                      <select
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                        value={item.status}
                        onChange={(e) => updateStatus({ id: item._id as never, status: e.target.value as CalendarStatus })}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                        value={item.assignee}
                        onChange={(e) => updateAssignee({ id: item._id as never, assignee: e.target.value as CalendarAssignee })}
                      >
                        <option value="Kenny">Kenny</option>
                        <option value="Assistant">Assistant</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

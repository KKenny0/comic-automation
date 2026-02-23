import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const query = queryGeneric;
const mutation = mutationGeneric;

const kindValidator = v.union(v.literal("scheduled_task"), v.literal("cron_job"));
const assigneeValidator = v.union(v.literal("Kenny"), v.literal("Assistant"));
const statusValidator = v.union(
  v.literal("scheduled"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("failed"),
);
const runStatusValidator = v.union(
  v.literal("success"),
  v.literal("failed"),
  v.literal("running"),
  v.literal("skipped"),
);

export const listRange = query({
  args: {
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    const byScheduledFor = await ctx.db
      .query("scheduledItems")
      .withIndex("by_scheduled_for", (q) =>
        q.gte("scheduledFor", args.start).lte("scheduledFor", args.end),
      )
      .collect();

    const byNextRunAt = await ctx.db
      .query("scheduledItems")
      .withIndex("by_next_run_at", (q) =>
        q.gte("nextRunAt", args.start).lte("nextRunAt", args.end),
      )
      .collect();

    const merged = new Map<string, (typeof byScheduledFor)[number]>();
    for (const item of [...byScheduledFor, ...byNextRunAt]) {
      merged.set(item._id, item);
    }

    return [...merged.values()].sort((a, b) => {
      const aTime = a.kind === "cron_job" ? (a.nextRunAt ?? a.scheduledFor) : a.scheduledFor;
      const bTime = b.kind === "cron_job" ? (b.nextRunAt ?? b.scheduledFor) : b.scheduledFor;
      return aTime - bTime;
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    kind: kindValidator,
    assignee: assigneeValidator,
    status: v.optional(statusValidator),
    scheduledFor: v.number(),
    source: v.union(v.literal("manual"), v.literal("cron")),
    cronExpr: v.optional(v.string()),
    cronJobId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("scheduledItems", {
      title: args.title,
      description: args.description,
      kind: args.kind,
      assignee: args.assignee,
      status: args.status ?? "scheduled",
      scheduledFor: args.scheduledFor,
      source: args.source,
      cronExpr: args.cronExpr,
      cronJobId: args.cronJobId,
      nextRunAt: args.scheduledFor,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("scheduledItems"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateAssignee = mutation({
  args: {
    id: v.id("scheduledItems"),
    assignee: assigneeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      assignee: args.assignee,
      updatedAt: Date.now(),
    });
  },
});

export const upsertCronEntry = mutation({
  args: {
    cronJobId: v.string(),
    title: v.string(),
    scheduledFor: v.number(),
    assignee: assigneeValidator,
    cronExpr: v.optional(v.string()),
    status: v.optional(statusValidator),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduledItems")
      .withIndex("by_cron_job_id", (q) => q.eq("cronJobId", args.cronJobId))
      .unique();

    const now = Date.now();
    const next = args.nextRunAt ?? args.scheduledFor;

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        scheduledFor: next,
        assignee: args.assignee,
        cronExpr: args.cronExpr,
        status: args.status ?? existing.status,
        nextRunAt: next,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("scheduledItems", {
      title: args.title,
      kind: "cron_job",
      assignee: args.assignee,
      status: args.status ?? "scheduled",
      scheduledFor: next,
      source: "cron",
      cronExpr: args.cronExpr,
      cronJobId: args.cronJobId,
      nextRunAt: next,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertScheduledEntry = mutation({
  args: {
    autoKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledFor: v.number(),
    assignee: assigneeValidator,
    status: v.optional(statusValidator),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduledItems")
      .withIndex("by_auto_key", (q) => q.eq("autoKey", args.autoKey))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        scheduledFor: args.scheduledFor,
        assignee: args.assignee,
        status: args.status ?? existing.status,
        nextRunAt: args.nextRunAt ?? args.scheduledFor,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("scheduledItems", {
      title: args.title,
      description: args.description,
      kind: "scheduled_task",
      assignee: args.assignee,
      status: args.status ?? "scheduled",
      scheduledFor: args.scheduledFor,
      source: "manual",
      autoKey: args.autoKey,
      nextRunAt: args.nextRunAt ?? args.scheduledFor,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const syncCronJobs = mutation({
  args: {
    jobs: v.array(
      v.object({
        cronJobId: v.string(),
        title: v.string(),
        scheduledFor: v.number(),
        assignee: assigneeValidator,
        cronExpr: v.optional(v.string()),
        status: v.optional(statusValidator),
        nextRunAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];

    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("scheduledItems")
        .withIndex("by_cron_job_id", (q) => q.eq("cronJobId", job.cronJobId))
        .unique();

      const now = Date.now();
      const next = job.nextRunAt ?? job.scheduledFor;

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: job.title,
          scheduledFor: next,
          assignee: job.assignee,
          cronExpr: job.cronExpr,
          status: job.status ?? existing.status,
          nextRunAt: next,
          updatedAt: now,
        });
        ids.push(existing._id);
      } else {
        const newId = await ctx.db.insert("scheduledItems", {
          title: job.title,
          kind: "cron_job",
          assignee: job.assignee,
          status: job.status ?? "scheduled",
          scheduledFor: next,
          source: "cron",
          cronExpr: job.cronExpr,
          cronJobId: job.cronJobId,
          nextRunAt: next,
          createdAt: now,
          updatedAt: now,
        });
        ids.push(newId);
      }
    }

    return { upserted: ids.length, ids };
  },
});

export const recordCronRun = mutation({
  args: {
    cronJobId: v.string(),
    runAt: v.number(),
    runStatus: runStatusValidator,
    summary: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduledItems")
      .withIndex("by_cron_job_id", (q) => q.eq("cronJobId", args.cronJobId))
      .unique();

    if (!existing) {
      return { ok: false, reason: "cron_job_not_found" };
    }

    const mappedStatus =
      args.runStatus === "success"
        ? "completed"
        : args.runStatus === "failed"
          ? "failed"
          : args.runStatus === "running"
            ? "running"
            : existing.status;

    await ctx.db.patch(existing._id, {
      status: mappedStatus,
      lastRunAt: args.runAt,
      lastRunStatus: args.runStatus,
      lastRunSummary: args.summary,
      nextRunAt: args.nextRunAt ?? existing.nextRunAt,
      scheduledFor: args.nextRunAt ?? existing.scheduledFor,
      updatedAt: Date.now(),
    });

    return { ok: true, id: existing._id };
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scheduledItems: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    kind: v.union(v.literal("scheduled_task"), v.literal("cron_job")),
    assignee: v.union(v.literal("Kenny"), v.literal("Assistant")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("failed"),
    ),
    scheduledFor: v.number(),
    source: v.union(v.literal("manual"), v.literal("cron")),
    cronExpr: v.optional(v.string()),
    cronJobId: v.optional(v.string()),
    autoKey: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(
      v.union(
        v.literal("success"),
        v.literal("failed"),
        v.literal("running"),
        v.literal("skipped"),
      ),
    ),
    lastRunSummary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduled_for", ["scheduledFor"])
    .index("by_next_run_at", ["nextRunAt"])
    .index("by_kind", ["kind"])
    .index("by_assignee", ["assignee"])
    .index("by_cron_job_id", ["cronJobId"])
    .index("by_auto_key", ["autoKey"]),
});

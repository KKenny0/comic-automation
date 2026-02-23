import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("done"),
    ),
    assignee: v.union(v.literal("Kenny"), v.literal("Assistant")),
    source: v.union(v.literal("manual"), v.literal("assistant_auto")),
    autoKey: v.optional(v.string()),
    lastEvent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_auto_key", ["autoKey"]),
});

import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const query = queryGeneric;
const mutation = mutationGeneric;

const statusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done"),
);

const assigneeValidator = v.union(v.literal("Kenny"), v.literal("Assistant"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();

    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assignee: assigneeValidator,
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      assignee: args.assignee,
      status: args.status ?? "todo",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
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
    id: v.id("tasks"),
    assignee: assigneeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      assignee: args.assignee,
      updatedAt: Date.now(),
    });
  },
});

export const updateDetails = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

export const upsertAutomationTask = mutation({
  args: {
    autoKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    assignee: assigneeValidator,
    status: statusValidator,
    lastEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_auto_key", (q) => q.eq("autoKey", args.autoKey))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        assignee: args.assignee,
        status: args.status,
        source: "assistant_auto",
        lastEvent: args.lastEvent,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      assignee: args.assignee,
      status: args.status,
      source: "assistant_auto",
      autoKey: args.autoKey,
      lastEvent: args.lastEvent,
      createdAt: now,
      updatedAt: now,
    });
  },
});

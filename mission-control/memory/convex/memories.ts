import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const query = queryGeneric;
const mutation = mutationGeneric;

export const search = query({
  args: {
    term: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("memoryDocs").collect();
    const term = args.term?.trim().toLowerCase();

    const filtered = !term
      ? all
      : all.filter((doc) => {
          const haystack = `${doc.title}\n${doc.content}\n${doc.tags.join(" ")}`.toLowerCase();
          return haystack.includes(term);
        });

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    sourcePath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("memoryDocs", {
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      sourcePath: args.sourcePath,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertFromSource = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    sourcePath: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memoryDocs")
      .withIndex("by_source_path", (q) => q.eq("sourcePath", args.sourcePath))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        tags: args.tags ?? [],
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("memoryDocs", {
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      sourcePath: args.sourcePath,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertAutomationMemory = mutation({
  args: {
    autoKey: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const sourcePath = `automation/${args.autoKey}.md`;
    const existing = await ctx.db
      .query("memoryDocs")
      .withIndex("by_source_path", (q) => q.eq("sourcePath", sourcePath))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        tags: args.tags ?? [],
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("memoryDocs", {
      title: args.title,
      content: args.content,
      tags: args.tags ?? [],
      sourcePath,
      createdAt: now,
      updatedAt: now,
    });
  },
});

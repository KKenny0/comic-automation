import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memoryDocs: defineTable({
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    sourcePath: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updated_at", ["updatedAt"])
    .index("by_source_path", ["sourcePath"]),
});

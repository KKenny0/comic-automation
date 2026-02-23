import { makeFunctionReference } from "convex/server";

export type MemoryDoc = {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  sourcePath?: string;
  createdAt: number;
  updatedAt: number;
};

export const searchMemoryDocs =
  makeFunctionReference<"query">("memories:search");
export const createMemoryDoc =
  makeFunctionReference<"mutation">("memories:create");
export const upsertMemoryFromSource =
  makeFunctionReference<"mutation">("memories:upsertFromSource");
export const upsertAutomationMemory =
  makeFunctionReference<"mutation">("memories:upsertAutomationMemory");

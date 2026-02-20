import { makeFunctionReference } from "convex/server";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskAssignee = "Kenny" | "Assistant";

export const listTasks = makeFunctionReference<"query">("tasks:list");
export const createTask = makeFunctionReference<"mutation">("tasks:create");
export const updateTaskStatus =
  makeFunctionReference<"mutation">("tasks:updateStatus");
export const updateTaskAssignee =
  makeFunctionReference<"mutation">("tasks:updateAssignee");

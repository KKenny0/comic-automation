import { makeFunctionReference } from "convex/server";

export type CalendarKind = "scheduled_task" | "cron_job";
export type CalendarAssignee = "Kenny" | "Assistant";
export type CalendarStatus =
  | "scheduled"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export const listCalendarRange =
  makeFunctionReference<"query">("events:listRange");
export const createCalendarItem =
  makeFunctionReference<"mutation">("events:create");
export const updateCalendarStatus =
  makeFunctionReference<"mutation">("events:updateStatus");
export const updateCalendarAssignee =
  makeFunctionReference<"mutation">("events:updateAssignee");
export type CalendarRunStatus = "success" | "failed" | "running" | "skipped";

export const upsertCronEntry =
  makeFunctionReference<"mutation">("events:upsertCronEntry");
export const upsertScheduledEntry =
  makeFunctionReference<"mutation">("events:upsertScheduledEntry");
export const syncCronJobs =
  makeFunctionReference<"mutation">("events:syncCronJobs");
export const recordCronRun =
  makeFunctionReference<"mutation">("events:recordCronRun");

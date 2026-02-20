"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  createTask,
  listTasks,
  updateTaskAssignee,
  updateTaskStatus,
  type TaskAssignee,
  type TaskStatus,
} from "@/lib/convexFunctions";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee: TaskAssignee;
  updatedAt: number;
};

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];

export function TaskBoard() {
  const tasks = useQuery(listTasks, {}) as Task[] | undefined;
  const createTaskMutation = useMutation(createTask);
  const updateStatusMutation = useMutation(updateTaskStatus);
  const updateAssigneeMutation = useMutation(updateTaskAssignee);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<TaskAssignee>("Assistant");

  const grouped = useMemo(() => {
    const allTasks = tasks ?? [];

    return columns.map((column) => ({
      ...column,
      tasks: allTasks.filter((task) => task.status === column.key),
    }));
  }, [tasks]);

  const onCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) return;

    await createTaskMutation({
      title: trimmedTitle,
      description: description.trim() || undefined,
      assignee,
      status: "todo",
    });

    setTitle("");
    setDescription("");
    setAssignee("Assistant");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Kenny × Assistant Task Board</h1>
          <p className="text-slate-300">
            实时任务看板：跟踪状态、负责人和最新更新时间。
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Add Task</h2>
          <form onSubmit={onCreateTask} className="grid gap-3 md:grid-cols-4">
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500 md:col-span-2"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value as TaskAssignee)}
            >
              <option value="Kenny">Kenny</option>
              <option value="Assistant">Assistant</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 md:col-span-4"
            >
              Create Task
            </button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {grouped.map((column) => (
            <div
              key={column.key}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{column.label}</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {column.tasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {column.tasks.length === 0 ? (
                  <p className="text-sm text-slate-400">No tasks</p>
                ) : (
                  column.tasks.map((task) => (
                    <article
                      key={task._id}
                      className="rounded-lg border border-slate-800 bg-slate-950/80 p-3"
                    >
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description ? (
                        <p className="mt-1 text-sm text-slate-300">{task.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-400">
                        Updated {new Date(task.updatedAt).toLocaleString()}
                      </p>

                      <div className="mt-3 grid gap-2">
                        <select
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          value={task.status}
                          onChange={(e) =>
                            updateStatusMutation({
                              id: task._id as never,
                              status: e.target.value as TaskStatus,
                            })
                          }
                        >
                          {columns.map((statusOption) => (
                            <option key={statusOption.key} value={statusOption.key}>
                              {statusOption.label}
                            </option>
                          ))}
                        </select>

                        <select
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                          value={task.assignee}
                          onChange={(e) =>
                            updateAssigneeMutation({
                              id: task._id as never,
                              assignee: e.target.value as TaskAssignee,
                            })
                          }
                        >
                          <option value="Kenny">Kenny</option>
                          <option value="Assistant">Assistant</option>
                        </select>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

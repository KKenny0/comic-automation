# Task Board (Next.js + Convex)

A realtime task board for Kenny + Assistant.

## Features

- Track every task with:
  - title + optional description
  - status (`Todo`, `In Progress`, `Blocked`, `Done`)
  - assignee (`Kenny` or `Assistant`)
  - updated timestamp
- Live updates through Convex subscriptions
- Board view grouped by status
- Quick actions to create tasks, change status, and reassign ownership
- Automation ingestion endpoint for assistant-driven task auto-upserts

## Tech

- Next.js (App Router, TypeScript)
- Convex (database + realtime backend)
- Tailwind CSS

## 1) Install dependencies

```bash
npm install
```

## 2) Configure Convex

Initialize Convex and generate local config:

```bash
npx convex dev
```

During first run, Convex will ask you to log in and create/select a project.

After setup, copy the deployment URL to `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

> Keep `npx convex dev` running in one terminal while developing.

## 3) Run Next.js

```bash
npm run dev
```

Open <http://localhost:3000>.

## Convex functions

- `tasks:list` query
- `tasks:create` mutation
- `tasks:updateStatus` mutation
- `tasks:updateAssignee` mutation
- `tasks:updateDetails` mutation
- `tasks:upsertAutomationTask` mutation

## Automation API (for closed-loop task updates)

`POST /api/automation/tasks/upsert`

Body:

```json
{
  "autoKey": "session-or-work-item-id",
  "title": "string",
  "description": "string (optional)",
  "assignee": "Kenny|Assistant",
  "status": "todo|in_progress|blocked|done",
  "lastEvent": "string (optional)"
}
```

If `TASK_BOARD_AUTOMATION_TOKEN` is set in `.env.local`, send it as header `x-mc-token`.

## Summary API (for Mission Control overview)

`GET /api/summary` returns task counts by status and source.

## Project structure

- `convex/schema.ts` – Convex table definitions
- `convex/tasks.ts` – Convex queries/mutations
- `src/components/TaskBoard.tsx` – main board UI
- `src/components/ConvexClientProvider.tsx` – Convex React provider
- `src/lib/convexFunctions.ts` – function references used by hooks

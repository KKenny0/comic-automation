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

## Project structure

- `convex/schema.ts` – Convex table definitions
- `convex/tasks.ts` – Convex queries/mutations
- `src/components/TaskBoard.tsx` – main board UI
- `src/components/ConvexClientProvider.tsx` – Convex React provider
- `src/lib/convexFunctions.ts` – function references used by hooks

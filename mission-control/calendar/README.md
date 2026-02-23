# Calendar (Next.js + Convex)

Calendar app for Mission Control: scheduled tasks + cron job audit panel.

## Features

- Track scheduled tasks and cron jobs
- Assignee (`Kenny` / `Assistant`) and status tracking
- Month grid + per-day detail panel
- Realtime updates via Convex
- Cron automation ingestion endpoint
- Cron execution-result backfill endpoint

## Setup

```bash
npm install
npm run convex:dev
npm run dev
```

Open <http://localhost:3000>.

## Convex

- `convex/schema.ts`
- `convex/events.ts`

## Automation APIs

### 1) Sync cron definitions into calendar

`POST /api/automation/calendar/sync-cron`

Body:

```json
{
  "jobs": [
    {
      "cronJobId": "job_123",
      "title": "Daily digest",
      "scheduledFor": 1771600000000,
      "nextRunAt": 1771600000000,
      "assignee": "Assistant",
      "cronExpr": "0 9 * * *",
      "status": "scheduled"
    }
  ]
}
```

### 2) Upsert scheduled task entries

`POST /api/automation/calendar/upsert-scheduled`

Body:

```json
{
  "autoKey": "task_abc",
  "title": "Prepare investor memo",
  "description": "Draft + final review",
  "scheduledFor": 1771605000000,
  "nextRunAt": 1771605000000,
  "assignee": "Assistant",
  "status": "scheduled"
}
```

### 3) Record cron execution result

`POST /api/automation/calendar/record-run`

Body:

```json
{
  "cronJobId": "job_123",
  "runAt": 1771600100000,
  "runStatus": "success",
  "summary": "Digest sent to #ai-news",
  "nextRunAt": 1771686400000
}
```

Optional auth header for both endpoints:

- Set `CALENDAR_AUTOMATION_TOKEN` in `.env.local`
- Send header: `x-mc-token: <token>`

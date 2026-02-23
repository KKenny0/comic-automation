# Memory (Next.js + Convex)

Standalone Memory screen for Mission Control.

## Features

- Beautiful memory document cards
- Search by title/content/tags
- Create memory docs with tags + source path
- One-click sync from workspace memory files (`MEMORY.md` + `memory/*.md`)
- Automation upsert endpoint for runtime bridge
- Realtime updates with Convex

## Setup

```bash
npm install
npm run convex:dev
npm run dev
```

Open <http://localhost:3000>.

## Automation API

`POST /api/automation/memory/upsert`

Body:

```json
{
  "autoKey": "decision_2026_02_20",
  "title": "Decision: Mission Control scope",
  "content": "We split into task-board/calendar/memory apps under mission-control.",
  "tags": ["decision", "mission-control"]
}
```

If `MEMORY_AUTOMATION_TOKEN` is set in `.env.local`, include header `x-mc-token`.

## Summary API

`GET /api/summary` returns document totals for cross-module overview.

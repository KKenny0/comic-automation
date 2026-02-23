# mission-control workspace

Apps:

- `portal/` - top-level Mission Control navigation
- `task-board/` - task tracking board
- `calendar/` - scheduled tasks + cron calendar
- `memory/` - memory documents + search

## Recommended ports

- portal: `3000`
- task-board: `3001`
- calendar: `3002`
- memory: `3003`

## Unified env + one-click start

Each app now supports a unified Convex env strategy:

- `CONVEX_URL` (server/API routes)
- `NEXT_PUBLIC_CONVEX_URL` (browser)

Set both to the same deployment URL in each app's `.env.local`.

One-click start (per app):

```bash
cd /Users/kenny/.openclaw/workspace/mission-control
./scripts/start.sh task-board
# or
./scripts/start.sh calendar
./scripts/start.sh memory
```

This runs Convex + Next together via `dev:stack`, reducing env mismatch.

## Note on fixed cloud deployments

For truly fixed, concurrent multi-app operation, configure each app to a cloud Convex deployment (`npx convex dev --configure existing --dev-deployment cloud`) and keep app-specific `.env.local` pinned.

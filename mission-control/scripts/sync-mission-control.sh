#!/bin/bash
# Auto-sync mission-control data (calendar + memory)
# This script syncs OpenClaw cron jobs and memory docs to Convex

set -euo pipefail

CALENDAR_URL="http://localhost:3002"
MEMORY_URL="http://localhost:3003"
OPENCLAW_API="http://localhost:8787"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Sync memory documents
sync_memory() {
  log "Syncing memory documents..."
  
  response=$(curl -s -X POST "${MEMORY_URL}/api/memory/sync" 2>&1)
  
  if echo "$response" | grep -q '"success"'; then
    total=$(echo "$response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    success=$(echo "$response" | grep -o '"success":[0-9]*' | grep -o '[0-9]*')
    log "✓ Memory sync complete: $success/$total documents"
  else
    log "✗ Memory sync failed: $response"
    return 1
  fi
}

# Sync calendar cron jobs
sync_calendar() {
  log "Syncing calendar cron jobs..."
  
  # Get cron jobs using openclaw CLI
  if ! command -v openclaw &> /dev/null; then
    log "✗ openclaw CLI not found, skipping calendar sync"
    return 0
  fi
  
  cron_jobs=$(openclaw cron list --json 2>&1)
  
  # Check if the response is a valid JSON with jobs array
  if ! echo "$cron_jobs" | jq -e '.jobs' > /dev/null 2>&1; then
    log "✗ Failed to fetch cron jobs: $cron_jobs"
    return 1
  fi
  
  # Transform cron jobs to calendar format
  calendar_jobs=$(echo "$cron_jobs" | jq -c '
    if .jobs then
      [.jobs[] | {
        cronJobId: .id,
        title: .name,
        scheduledFor: (.state.nextRunAtMs // 0),
        assignee: "Assistant",
        cronExpr: (.schedule.expr // ""),
        status: "scheduled",
        nextRunAt: (.state.nextRunAtMs // 0)
      }]
    else
      []
    end
  ')
  
  # Send to calendar API
  response=$(curl -s -X POST "${CALENDAR_URL}/api/automation/calendar/sync-cron" \
    -H "Content-Type: application/json" \
    -d "{\"jobs\": $calendar_jobs}" 2>&1)
  
  if echo "$response" | grep -q '"ok":true'; then
    upserted=$(echo "$response" | grep -o '"upserted":[0-9]*' | grep -o '[0-9]*')
    log "✓ Calendar sync complete: $upserted jobs updated"
  else
    log "✗ Calendar sync failed: $response"
    return 1
  fi
}

# Main sync routine
main() {
  log "Starting mission-control sync..."
  
  # Check if services are running
  if ! curl -s "${MEMORY_URL}" > /dev/null 2>&1; then
    log "✗ Memory service not running on ${MEMORY_URL}"
    log "  Start with: cd mission-control && ./scripts/start.sh memory"
    exit 1
  fi
  
  if ! curl -s "${CALENDAR_URL}" > /dev/null 2>&1; then
    log "✗ Calendar service not running on ${CALENDAR_URL}"
    log "  Start with: cd mission-control && ./scripts/start.sh calendar"
    exit 1
  fi
  
  # Run syncs
  sync_memory
  sync_calendar
  
  log "Mission-control sync complete!"
}

main "$@"

# workflow.v1 Runner Guide (MVP)

## Overview

This runner executes the v1 MVP pipeline in sequence:

1. `plan`
2. `generate`
3. `assemble`
4. `eval`

Current implementation is **mock-first** for deterministic verification and integration testing.

## Command

```bash
python3 scripts/run_workflow_v1.py \
  --project-root . \
  --workflow workflows/workflow.v1.template.json
```

## Output Layout

Artifacts are written to:

- `outputs/<run_id>/timeline.v1.json`
- `outputs/<run_id>/shots/Sxx.mp4`
- `outputs/<run_id>/assembly/final.mp4`
- `outputs/<run_id>/logs/generation.json`
- `outputs/<run_id>/logs/assembly.log`
- `outputs/<run_id>/reports/eval.json`
- `outputs/<run_id>/reports/eval.md`
- `outputs/<run_id>/reports/regen_queue.json`
- `outputs/<run_id>/workflow_state.v1.json`

## Notes

- The runner performs basic timeline validation before generation.
- Shot files are mock `.mp4` placeholders in this MVP stage.
- This is intended for Phase A/B integration. Real Seedance API binding will be added in later phases.

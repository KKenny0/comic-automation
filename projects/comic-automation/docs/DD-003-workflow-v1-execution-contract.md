# DD-003 | `workflow.v1` Execution Contract (v0.1)

## 1. Purpose

Define a production-oriented execution contract for the comic automation pipeline:

`plan -> generate -> assemble -> eval`

This document specifies stage I/O, state transitions, retry strategy, and observability requirements so that OpenClaw can run the pipeline deterministically.

---

## 2. Workflow Lifecycle

## 2.1 Status Model

- `pending`
- `running`
- `blocked`
- `failed`
- `completed`

## 2.2 Stage Model

Each stage has:

- `name`: `plan | generate | assemble | eval`
- `status`: same status model as above
- `started_at`, `finished_at`
- `attempt`
- `max_attempts`
- `artifacts[]`
- `error` (nullable)

---

## 3. Stage Contracts

## 3.1 Stage: `plan`

### Input

- `project.idea`
- optional references (`assets/*`)
- `config.plan`

### Output

- `artifacts.timeline_json`: path to `timeline.v1.json`
- `artifacts.plan_report_md`: planning summary

### Success Criteria

- timeline schema valid (`timeline.v1`)
- non-overlapping shots
- all shots have executable `seedance_plan`

### Failure Modes

- invalid timeline schema
- unsupported shot duration for Seedance (outside 4-15s)

---

## 3.2 Stage: `generate`

### Input

- `artifacts.timeline_json`
- `config.generate`

### Output

- `artifacts.shot_videos[]`: one output file per shot
- `artifacts.generation_log_json`

### Success Criteria

- each shot has a valid output video file
- all required references resolved and bound (`@image/@video/@audio` mapping)

### Retry Strategy

- retry per shot (not whole stage)
- use `shot.retry_policy`
- fallback mode allowed (`t2v/i2v/keyframes/multiref`)

---

## 3.3 Stage: `assemble`

### Input

- `artifacts.shot_videos[]`
- `artifacts.timeline_json`
- optional audio tracks

### Output

- `artifacts.final_video`
- `artifacts.assembly_log`

### Success Criteria

- shot order equals timeline order
- output duration within tolerance (default ±1.0s)
- AV mux completed without corruption

---

## 3.4 Stage: `eval`

### Input

- `artifacts.final_video`
- `artifacts.timeline_json`
- `qa_policy`

### Output

- `artifacts.eval_report_json`
- `artifacts.eval_report_md`
- `artifacts.regen_queue` (optional)

### Success Criteria

- quality score computed with required dimensions
- if score < threshold, regen queue generated with shot IDs

---

## 4. Regeneration Contract (Shot-level)

If eval score is below threshold:

1. Build `regen_queue` with priority:
   - continuity breaks
   - character inconsistency
   - motion artifacts
2. Re-run only affected shots in `generate`
3. Re-run `assemble` and `eval`
4. Stop when:
   - score >= threshold, or
   - `qa_policy.auto_regen.max_rounds` reached

---

## 5. Artifact Contract

Required artifacts under `outputs/<run_id>/`:

- `timeline.v1.json`
- `shots/Sxx.mp4`
- `assembly/final.mp4`
- `logs/generation.json`
- `logs/assembly.log`
- `reports/eval.json`
- `reports/eval.md`

---

## 6. OpenClaw Runtime Mapping

Recommended sub-agents/tasks:

- `planner-agent` -> stage `plan`
- `seedance-agent` -> stage `generate`
- `ffmpeg-agent` -> stage `assemble`
- `qa-agent` -> stage `eval`

Execution policy:

- `generate` supports partial parallelism for independent shots (`transition_to_next = cut`)
- continuous chains should run in sequence

---

## 7. Validation Rules

Before entering each stage:

- `plan`: validate input idea non-empty
- `generate`: validate timeline schema + asset existence
- `assemble`: validate all shot video files exist
- `eval`: validate final video exists and is readable

---

## 8. Deliverables in this DD

- `specs/workflow.v1.schema.json`
- `workflows/examples/workflow.v1.sample.json`

These provide machine-readable execution contract and a runnable sample.

#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_dirs(base: Path) -> None:
    for rel in ["shots", "assembly", "logs", "reports"]:
        (base / rel).mkdir(parents=True, exist_ok=True)


def stage_by_name(workflow: Dict[str, Any], name: str) -> Dict[str, Any]:
    for stage in workflow["stages"]:
        if stage["name"] == name:
            return stage
    raise ValueError(f"missing stage: {name}")


def mark_stage(stage: Dict[str, Any], status: str, error: Dict[str, Any] = None) -> None:
    if status == "running":
        stage["started_at"] = now_iso()
    if status in {"failed", "completed"}:
        stage["finished_at"] = now_iso()
    stage["status"] = status
    stage["error"] = error


def validate_timeline_basic(timeline: Dict[str, Any]) -> None:
    shots: List[Dict[str, Any]] = timeline.get("shots", [])
    if not shots:
        raise ValueError("timeline has no shots")

    last_end = -1.0
    for shot in shots:
        start = float(shot["start_sec"])
        end = float(shot["end_sec"])
        duration = float(shot["duration_sec"])
        if end <= start:
            raise ValueError(f"invalid shot range: {shot['shot_id']}")
        if abs((end - start) - duration) > 1e-6:
            raise ValueError(f"duration mismatch: {shot['shot_id']}")
        if start < last_end:
            raise ValueError(f"overlap detected at shot: {shot['shot_id']}")
        sd_duration = float(shot["seedance_plan"]["duration_sec"])
        if sd_duration < 4 or sd_duration > 15:
            raise ValueError(f"seedance duration out of range in shot: {shot['shot_id']}")
        last_end = end


def run_plan(project_root: Path, output_base: Path, workflow: Dict[str, Any]) -> Dict[str, Any]:
    stage = stage_by_name(workflow, "plan")
    mark_stage(stage, "running")
    try:
        timeline_source_rel = workflow["config"]["plan"].get(
            "timeline_source", "specs/examples/timeline.v1.sample.json"
        )
        timeline_source = project_root / timeline_source_rel
        timeline = read_json(timeline_source)
        validate_timeline_basic(timeline)

        timeline_out = output_base / "timeline.v1.json"
        plan_report = output_base / "reports" / "plan.md"

        write_json(timeline_out, timeline)
        plan_report.write_text(
            "# Plan Report\n\n"
            f"- Generated at: {now_iso()}\n"
            f"- Source timeline: `{timeline_source_rel}`\n"
            f"- Shots: {len(timeline.get('shots', []))}\n",
            encoding="utf-8",
        )

        stage["artifacts"] = [
            {"name": "timeline_json", "path": str(timeline_out.relative_to(project_root))},
            {"name": "plan_report_md", "path": str(plan_report.relative_to(project_root))},
        ]
        stage["outputs"]["timeline"] = str(timeline_out.relative_to(project_root))
        mark_stage(stage, "completed")
        return timeline
    except Exception as e:
        mark_stage(stage, "failed", {"code": "PLAN_FAILED", "message": str(e), "retryable": False})
        raise


def run_generate(project_root: Path, output_base: Path, workflow: Dict[str, Any], timeline: Dict[str, Any]) -> List[Path]:
    stage = stage_by_name(workflow, "generate")
    mark_stage(stage, "running")
    try:
        shot_paths: List[Path] = []
        logs = []
        generate_cfg = workflow.get("config", {}).get("generate", {})
        model_id = generate_cfg.get("model_id", "doubao-seedance-1-5-pro-251215")
        engine = generate_cfg.get("engine", "seedance-api")
        draft_mode = bool(generate_cfg.get("draft_mode", True))

        for shot in timeline["shots"]:
            shot_id = shot["shot_id"]
            shot_out = output_base / "shots" / f"{shot_id}.mp4"
            shot_out.write_text(
                f"MOCK_VIDEO\nshot={shot_id}\nmode={shot['control_mode']}\nduration={shot['duration_sec']}\n",
                encoding="utf-8",
            )
            shot_paths.append(shot_out)
            logs.append(
                {
                    "shot_id": shot_id,
                    "status": "completed",
                    "engine": engine,
                    "model_id": shot.get("seedance_plan", {}).get("model_id", model_id),
                    "draft_mode": shot.get("seedance_plan", {}).get("draft_mode", draft_mode),
                    "control_mode": shot["control_mode"],
                    "duration_sec": shot["duration_sec"],
                    "attempt": 1,
                    "generated_at": now_iso(),
                }
            )

        generation_log = output_base / "logs" / "generation.json"
        write_json(generation_log, {"run_id": workflow["run"]["run_id"], "shots": logs})

        stage["artifacts"] = [
            {"name": "shot_videos", "path": str((output_base / 'shots').relative_to(project_root))},
            {"name": "generation_log_json", "path": str(generation_log.relative_to(project_root))},
        ]
        stage["outputs"]["shots"] = str((output_base / "shots").relative_to(project_root))
        mark_stage(stage, "completed")
        return shot_paths
    except Exception as e:
        mark_stage(stage, "failed", {"code": "GENERATE_FAILED", "message": str(e), "retryable": True})
        raise


def run_assemble(project_root: Path, output_base: Path, workflow: Dict[str, Any], shot_paths: List[Path]) -> Path:
    stage = stage_by_name(workflow, "assemble")
    mark_stage(stage, "running")
    try:
        final_video = output_base / "assembly" / "final.mp4"
        assembly_log = output_base / "logs" / "assembly.log"

        order_lines = [p.name for p in shot_paths]
        final_video.write_text("MOCK_FINAL_VIDEO\n" + "\n".join(order_lines) + "\n", encoding="utf-8")
        assembly_log.write_text(
            "Assembly completed\n"
            f"At: {now_iso()}\n"
            f"Shot count: {len(shot_paths)}\n"
            f"Order: {', '.join(order_lines)}\n",
            encoding="utf-8",
        )

        stage["artifacts"] = [
            {"name": "final_video", "path": str(final_video.relative_to(project_root))},
            {"name": "assembly_log", "path": str(assembly_log.relative_to(project_root))},
        ]
        stage["outputs"]["final_video"] = str(final_video.relative_to(project_root))
        mark_stage(stage, "completed")
        return final_video
    except Exception as e:
        mark_stage(stage, "failed", {"code": "ASSEMBLE_FAILED", "message": str(e), "retryable": True})
        raise


def run_eval(project_root: Path, output_base: Path, workflow: Dict[str, Any], timeline: Dict[str, Any]) -> Dict[str, Any]:
    stage = stage_by_name(workflow, "eval")
    mark_stage(stage, "running")
    try:
        threshold = float(workflow["config"]["eval"].get("score_threshold", 75))
        scores = {
            "narrative": 82,
            "consistency": 79,
            "motion_naturalness": 76,
            "style_unity": 80,
            "av_sync": 78,
        }
        total = round(sum(scores.values()) / len(scores), 2)
        regen_queue = []
        if total < threshold:
            regen_queue = [timeline["shots"][0]["shot_id"]]

        eval_json = {
            "run_id": workflow["run"]["run_id"],
            "threshold": threshold,
            "total_score": total,
            "scores": scores,
            "regen_queue": regen_queue,
            "evaluated_at": now_iso(),
        }

        eval_json_path = output_base / "reports" / "eval.json"
        eval_md_path = output_base / "reports" / "eval.md"
        regen_queue_path = output_base / "reports" / "regen_queue.json"

        write_json(eval_json_path, eval_json)
        write_json(regen_queue_path, {"regen_queue": regen_queue})
        eval_md_path.write_text(
            "# Eval Report\n\n"
            f"- Total score: {total}\n"
            f"- Threshold: {threshold}\n"
            f"- Regen queue length: {len(regen_queue)}\n",
            encoding="utf-8",
        )

        stage["artifacts"] = [
            {"name": "eval_report_json", "path": str(eval_json_path.relative_to(project_root))},
            {"name": "eval_report_md", "path": str(eval_md_path.relative_to(project_root))},
            {"name": "regen_queue", "path": str(regen_queue_path.relative_to(project_root))},
        ]
        stage["outputs"]["eval_report_json"] = str(eval_json_path.relative_to(project_root))
        stage["outputs"]["eval_report_md"] = str(eval_md_path.relative_to(project_root))
        mark_stage(stage, "completed")
        return eval_json
    except Exception as e:
        mark_stage(stage, "failed", {"code": "EVAL_FAILED", "message": str(e), "retryable": True})
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Run comic automation workflow.v1 (MVP mock runner)")
    parser.add_argument("--project-root", default=".", help="Path to comic-automation project root")
    parser.add_argument(
        "--workflow",
        default="workflows/workflow.v1.template.json",
        help="Path to workflow.v1 json file (relative to project root)",
    )
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    workflow_path = (project_root / args.workflow).resolve()

    workflow = read_json(workflow_path)
    run_id = workflow["run"]["run_id"]
    output_base = project_root / "outputs" / run_id
    ensure_dirs(output_base)

    workflow["run"]["status"] = "running"
    workflow["run"]["started_at"] = now_iso()

    try:
        timeline = run_plan(project_root, output_base, workflow)
        shot_paths = run_generate(project_root, output_base, workflow, timeline)
        _final_video = run_assemble(project_root, output_base, workflow, shot_paths)
        _eval = run_eval(project_root, output_base, workflow, timeline)

        workflow["run"]["status"] = "completed"
        workflow["run"]["finished_at"] = now_iso()
    except Exception:
        workflow["run"]["status"] = "failed"
        workflow["run"]["finished_at"] = now_iso()
        state_path = output_base / "workflow_state.v1.json"
        write_json(state_path, workflow)
        raise

    state_path = output_base / "workflow_state.v1.json"
    write_json(state_path, workflow)
    print(f"Workflow completed. State written to: {state_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

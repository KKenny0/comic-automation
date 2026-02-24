#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List


SEEDANCE_MODEL_CAPABILITIES = {
    "doubao-seedance-1-5-pro-251215": {
        "label": "Seedance 1.5 Pro",
        "t2v": True,
        "i2v_first": True,
        "i2v_first_last": True,
        "audio": True,
        "draft": True,
        "reference_images_max": None,
    },
    "doubao-seedance-1-0-pro-250428": {
        "label": "Seedance 1.0 Pro",
        "t2v": True,
        "i2v_first": True,
        "i2v_first_last": True,
        "audio": False,
        "draft": False,
        "reference_images_max": None,
    },
    "doubao-seedance-1-0-pro-fast-250528": {
        "label": "Seedance 1.0 Pro Fast",
        "t2v": True,
        "i2v_first": True,
        "i2v_first_last": False,
        "audio": False,
        "draft": False,
        "reference_images_max": None,
    },
    "doubao-seedance-1-0-lite-t2v-250219": {
        "label": "Seedance 1.0 Lite T2V",
        "t2v": True,
        "i2v_first": False,
        "i2v_first_last": False,
        "audio": False,
        "draft": False,
        "reference_images_max": None,
    },
    "doubao-seedance-1-0-lite-i2v-250219": {
        "label": "Seedance 1.0 Lite I2V",
        "t2v": False,
        "i2v_first": True,
        "i2v_first_last": True,
        "audio": False,
        "draft": False,
        "reference_images_max": 4,
    },
}


def mode_supported(control_mode: str, caps: Dict[str, Any], image_ref_count: int = 0) -> bool:
    if control_mode == "t2v":
        return bool(caps.get("t2v"))
    if control_mode == "i2v":
        return bool(caps.get("i2v_first"))
    if control_mode == "keyframes":
        return bool(caps.get("i2v_first_last"))
    if control_mode == "multiref":
        # 按当前能力表，只有支持 reference images 的模型才视为原生 multiref
        max_refs = caps.get("reference_images_max")
        if not caps.get("i2v_first") or max_refs is None:
            return False
        if image_ref_count > max_refs:
            return False
        return True
    return False


def pick_supported_mode(caps: Dict[str, Any]) -> str:
    for mode in ["i2v", "keyframes", "t2v", "multiref"]:
        if mode_supported(mode, caps):
            return mode
    raise ValueError("no supported control mode for selected seedance model")


def normalize_shot_for_model(
    shot: Dict[str, Any],
    default_model_id: str,
    default_draft_mode: bool,
    default_fallback_mode: str,
) -> Dict[str, Any]:
    sp = shot.setdefault("seedance_plan", {})
    warnings: List[str] = []

    model_id = sp.get("model_id", default_model_id)
    caps = SEEDANCE_MODEL_CAPABILITIES.get(model_id)
    if caps is None:
        warnings.append(f"unknown model_id={model_id}, fallback to {default_model_id}")
        model_id = default_model_id
        caps = SEEDANCE_MODEL_CAPABILITIES[model_id]
    sp["model_id"] = model_id

    requested_mode = shot.get("control_mode", "t2v")
    image_ref_count = len(shot.get("refs", {}).get("image_asset_ids", []))

    fallback_mode = shot.get("retry_policy", {}).get("fallback_mode", default_fallback_mode)
    if not mode_supported(fallback_mode, caps, image_ref_count=image_ref_count):
        fallback_mode = pick_supported_mode(caps)
        warnings.append(f"retry fallback_mode auto-adjusted to {fallback_mode}")
        shot.setdefault("retry_policy", {})["fallback_mode"] = fallback_mode

    effective_mode = requested_mode
    if not mode_supported(requested_mode, caps, image_ref_count=image_ref_count):
        effective_mode = fallback_mode
        warnings.append(
            f"control_mode {requested_mode} not supported by {model_id}, switched to {effective_mode}"
        )

    draft_mode = bool(sp.get("draft_mode", default_draft_mode))
    if draft_mode and not caps.get("draft"):
        draft_mode = False
        warnings.append(f"draft_mode disabled for model {model_id}")
    sp["draft_mode"] = draft_mode

    audio_ids = shot.get("refs", {}).get("audio_asset_ids", [])
    if audio_ids and not caps.get("audio"):
        shot["refs"]["audio_asset_ids"] = []
        warnings.append(f"audio refs removed: model {model_id} has no audio support")

    max_refs = caps.get("reference_images_max")
    if max_refs is not None and image_ref_count > max_refs:
        shot["refs"]["image_asset_ids"] = shot["refs"]["image_asset_ids"][:max_refs]
        warnings.append(
            f"image refs truncated to {max_refs}: model {model_id} reference limit"
        )

    return {
        "shot": shot,
        "requested_mode": requested_mode,
        "effective_mode": effective_mode,
        "model_id": model_id,
        "draft_mode": draft_mode,
        "warnings": warnings,
    }


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
        default_model_id = generate_cfg.get("model_id", "doubao-seedance-1-5-pro-251215")
        engine = generate_cfg.get("engine", "seedance-api")
        default_draft_mode = bool(generate_cfg.get("draft_mode", True))
        default_fallback_mode = generate_cfg.get("fallback_mode", "i2v")

        for shot in timeline["shots"]:
            shot_id = shot["shot_id"]
            normalized = normalize_shot_for_model(
                shot=shot,
                default_model_id=default_model_id,
                default_draft_mode=default_draft_mode,
                default_fallback_mode=default_fallback_mode,
            )

            effective_mode = normalized["effective_mode"]
            shot_out = output_base / "shots" / f"{shot_id}.mp4"
            shot_out.write_text(
                "MOCK_VIDEO\n"
                f"shot={shot_id}\n"
                f"mode={effective_mode}\n"
                f"requested_mode={normalized['requested_mode']}\n"
                f"model_id={normalized['model_id']}\n"
                f"draft_mode={normalized['draft_mode']}\n"
                f"duration={shot['duration_sec']}\n",
                encoding="utf-8",
            )
            shot_paths.append(shot_out)
            logs.append(
                {
                    "shot_id": shot_id,
                    "status": "completed",
                    "engine": engine,
                    "model_id": normalized["model_id"],
                    "draft_mode": normalized["draft_mode"],
                    "requested_control_mode": normalized["requested_mode"],
                    "effective_control_mode": effective_mode,
                    "duration_sec": shot["duration_sec"],
                    "attempt": 1,
                    "warnings": normalized["warnings"],
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

# DD-002｜`timeline.v1.json` 规范与样例（v0.1）

> 目标：把 DD-001 的“时间线 + 控制层”落到可执行数据协议，供 OpenClaw workflow 与 Seedance 执行器统一消费。

## 1. 设计目标

- 单一事实源（Single Source of Truth）：整片视频由一个 timeline 文件驱动
- 可分段生成：天然支持 Seedance 4-15s 的生成约束
- 可控可回炉：每个 shot 可独立重试，不必全片重做
- 可审计：每个镜头的模式选择与约束可追踪

---

## 2. 文件命名与版本

- 标准文件名：`timeline.v1.json`
- Schema 文件：`specs/timeline.v1.schema.json`
- 示例文件：`specs/examples/timeline.v1.sample.json`

版本策略：
- 破坏性变更：`v1 -> v2`
- 非破坏性字段新增：`v1.x` 通过 `meta.schema_version` 标注

---

## 3. 顶层结构

```json
{
  "meta": { ... },
  "project": { ... },
  "global_style": { ... },
  "assets": { ... },
  "characters": [ ... ],
  "shots": [ ... ],
  "audio_plan": { ... },
  "qa_policy": { ... }
}
```

### 3.1 `meta`

- `schema`: 固定 `timeline.v1`
- `schema_version`: 如 `1.0.0`
- `created_at`: ISO 时间
- `generated_by`: 生成器标识（如 `gpt-5.3-codex`）
- `language`: 默认 `zh-CN`

### 3.2 `project`

- `project_id`: 全局唯一 ID
- `title`: 项目名
- `idea`: 原始想法
- `target_duration_sec`: 目标总时长
- `aspect_ratio`: `16:9 | 9:16 | 1:1`
- `fps`: 默认 24
- `resolution`: 如 `1920x1080`

### 3.3 `global_style`

- `genre`: 如 `都市轻喜剧`
- `tone`: 如 `幽默、轻快`
- `visual_style`: 如 `国漫、电影感`
- `palette`: 色彩倾向
- `negative_prompt_global`: 全局负向约束

### 3.4 `assets`

- `images[]`: 可引用图片素材池
- `videos[]`: 可引用视频素材池
- `audios[]`: 可引用音频素材池

每个 asset 建议字段：
- `asset_id`
- `type`
- `path`
- `usage_tags[]`

### 3.5 `characters[]`

- `character_id`
- `name`
- `profile`
- `look`
- `refs.image_asset_ids[]`
- `continuity_priority`（0-100）

### 3.6 `shots[]`（核心）

每个 shot 必填：
- `shot_id`
- `start_sec`
- `end_sec`
- `duration_sec`
- `narrative_purpose`（铺垫/冲突/反转/收束）
- `scene`
- `subjects[]`
- `action`
- `camera`（景别/机位/运动/速度）
- `transition_to_next`（`cut | continuous | morph | fade`）
- `control_mode`（`t2v | i2v | keyframes | multiref`）
- `refs`（图片/视频/音频引用）
- `prompt_cn`
- `negative_prompt`
- `seedance_plan`（执行参数）
- `retry_policy`

### 3.7 `audio_plan`

- `tts_enabled`
- `bgm_asset_id`
- `sfx_strategy`（`minimal | balanced | rich`）
- `dialogue_tracks[]`（可按 shot 对齐）

### 3.8 `qa_policy`

- `score_threshold`（默认 75）
- `weights`
  - `narrative`
  - `consistency`
  - `motion_naturalness`
  - `style_unity`
  - `av_sync`
- `auto_regen.max_rounds`

---

## 4. 控制模式选择规则（可执行）

1) 若 `同场景 + 同主体 + 动作连续`：
- `control_mode = keyframes`
- `transition_to_next = continuous`

2) 若 `跨场景/跨景别/跨机位`：
- `control_mode = i2v`
- `transition_to_next = cut`

3) 若 `氛围探索段`：
- `control_mode = t2v`

4) 若 `角色一致性要求高`：
- 优先使用 `i2v/keyframes` + 固定角色参考图；`multiref` 仅在模型支持 Reference Images 时启用（详见 `specs/seedance-api-mapping.v1.md`）

---

## 5. Seedance 执行映射（v0.1）

`seedance_plan` 推荐字段：
- `model_id`（默认 `doubao-seedance-1-5-pro-251215`）
- `draft_mode`（仅 Seedance 1.5 Pro 支持；用于快速草稿预览）
- `duration_sec`（4-15）
- `aspect_ratio`
- `resolution_hint`
- `ref_binding`：
  - `images`: 映射到 `@图片1..9`
  - `videos`: 映射到 `@视频1..3`
  - `audios`: 映射到 `@音频1..3`
- `timeline_prompt_segments[]`：支持 `0-3s / 4-8s / ...`
- `continuity_note`：与前后镜头衔接说明

---

## 6. 验证规则（关键）

- `shots` 必须按时间升序
- `duration_sec = end_sec - start_sec`
- shot 不允许时间重叠
- `seedance_plan.duration_sec` 必须落在 4-15
- 若 `draft_mode=true`，建议仅用于低成本预览，终版使用 HD 重渲
- 总时长应接近 `project.target_duration_sec`（可设容差 ±1.0s）

---

## 7. 样例说明

样例文件：`specs/examples/timeline.v1.sample.json`

场景：
- 题材：都市轻喜剧
- idea：社恐程序员误入相亲大会
- 总时长：45s
- 镜头数：5
- 包含 `i2v + keyframes + multiref` 混合模式

---

## 8. 下一步（DD-003 输入）

- 产出 `workflow.v1`：`plan -> generate -> assemble -> eval`
- 定义 `shot-level regeneration` 接口契约
- 引入质量评分器的自动标注格式

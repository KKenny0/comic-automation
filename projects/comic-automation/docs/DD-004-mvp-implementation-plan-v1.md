# DD-004｜v1 MVP 流程打通实施计划（执行前方案）

## 0. 目标与范围

本计划用于打通 `plan -> generate -> assemble -> eval` 的 v1 MVP 流程，目标是从一句 idea 稳定产出可观看的 30-60 秒短片，并支持基础回炉。

**本阶段目标（MVP）**
- 单项目单次运行可成功出片
- 使用 `timeline.v1.json` 驱动全流程
- 支持 shot 级失败重试与最小回炉
- 产出可审计日志与质量评分报告

**不在本阶段（延后）**
- 大规模并发批量出片
- 高级角色资产管理后台
- 自动化成本优化策略（仅做基础限额）

---

## 1. 实施总览（4 条主线并行）

1) **流程主线**：把四阶段串起来并保证状态流转正确
2) **执行主线**：把 timeline/shot 配置映射为可执行任务
3) **质量主线**：建立 eval 评分 + regen_queue
4) **工程主线**：日志、错误码、可观测性、可复现性

---

## 2. 分阶段计划与交付

## Phase A（P0）流程骨架打通（1-2 天）

### 任务
- 建立 workflow runner（按 DD-003）
- 统一 run_id 与产物目录 `outputs/<run_id>/`
- 落地阶段状态机（pending/running/failed/completed）

### 交付
- `workflows/workflow.v1.runner.md`（运行说明）
- `workflows/workflow.v1.template.json`（可填充模板）
- 首个 dry-run（不调 Seedance，仅验证状态与产物路径）

### 验收标准
- 能按顺序执行四阶段
- 每阶段输入输出路径可追踪
- 失败能终止并记录 error

---

## Phase B（P0）Plan/Generate 可执行化（2-3 天）

### 任务
- `plan`：把 idea 生成 `timeline.v1.json`（可先模板化）
- `generate`：逐 shot 调用执行器（先 mock，再接真接口）
- 实现 shot 级 retry（按 `retry_policy`）

### 交付
- `scripts/step-1-plan.*`
- `scripts/step-2-generate.*`
- `outputs/<run_id>/shots/Sxx.mp4`（mock 或真片段）

### 验收标准
- 每个 shot 都能生成输出（或明确失败码）
- 失败 shot 能独立重试，不重跑全部
- 生成日志含模式、参数、耗时、重试次数

---

## Phase C（P0）Assemble/Eval 闭环（2 天）

### 任务
- `assemble`：按 timeline 顺序拼接 + 音轨混合
- `eval`：输出五维评分与 `regen_queue`
- 低分触发最小回炉（重跑指定 shot + 重新 assemble/eval）

### 交付
- `scripts/step-3-assemble.*`
- `scripts/step-4-eval.*`
- `reports/eval.json` + `reports/eval.md`
- `reports/regen_queue.json`

### 验收标准
- 成片时长误差在 ±1s 内
- 评分结构完整且可读
- 回炉最多 `max_rounds` 次并可终止

---

## Phase D（P1）真机联调与稳定性（2-3 天）

### 任务
- 接入真实 Seedance API 参数映射
- 引入基础限流/超时/退避重试
- 补齐关键错误码（auth/timeout/quota/invalid_ref）

### 交付
- `specs/seedance-api-mapping.v1.md`
- `specs/error-codes.v1.md`
- 最小稳定运行样例（2-3 个不同题材）

### 验收标准
- 真实 API 可稳定跑通 2 次以上
- 失败可定位（日志 + 错误码）
- 输出质量达到阈值（>=75）

---

## 3. 技术实现策略

## 3.1 模式路由（必须规则先行）
- 同场景+同主体+连续动作 -> `keyframes`
- 跨场景/跨机位 -> `i2v + cut`
- 氛围探索 -> `t2v`
- 一致性高优先 -> 叠加 `multiref`

## 3.2 生成策略（降风险）
- 两阶段生成：低成本预览 -> 目标清晰后高清终渲
- 先 cut 类镜头并行，continuous 链路串行

## 3.3 回炉策略（控成本）
- 仅重跑低分 shot
- 同 shot 最多 N 次重试，超过阈值自动 fallback mode

---

## 4. 目录与文件增量规划

本阶段预计新增：

- `docs/DD-004-mvp-implementation-plan-v1.md`（当前文档）
- `specs/seedance-api-mapping.v1.md`
- `specs/error-codes.v1.md`
- `workflows/workflow.v1.template.json`
- `workflows/workflow.v1.runner.md`
- `scripts/step-1-plan.*`
- `scripts/step-2-generate.*`
- `scripts/step-3-assemble.*`
- `scripts/step-4-eval.*`

---

## 5. 里程碑与验收 Gate

### Gate-1（骨架通）
- dry-run 全绿
- 产物路径一致

### Gate-2（片段通）
- 5-shot 样例可产出全部片段
- shot 级 retry 可用

### Gate-3（成片通）
- 成片可播放
- eval 输出完整

### Gate-4（闭环通）
- 低分触发回炉
- 回炉后完成第二轮评估

---

## 6. 风险与应对

- **API 不稳定/网络波动**：超时 + 退避 + 可恢复重试
- **角色一致性不足**：提高 multiref 权重，必要时降镜头复杂度
- **成本超预算**：限制重试轮数，优先局部回炉
- **日志不可用**：统一 run_id + stage_id + shot_id 追踪键

---

## 7. 执行顺序建议（从下一步开始）

1. 先做 Phase A（流程骨架）
2. 立刻做 Phase B（plan/generate）并引入 mock
3. 接着做 Phase C（assemble/eval）形成闭环
4. 最后做 Phase D（Seedance 真接口联调）

> 结论：先把“可运行闭环”做出来，再追求“更聪明的生成质量”。

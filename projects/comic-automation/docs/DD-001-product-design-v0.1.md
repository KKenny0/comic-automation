# DD-001｜OpenClaw「漫剧自动化」产品化设计文档（v0.1）

## 0) 背景与目标

目标不是“生成一段视频”，而是可产品化的 **idea -> 成片** 自动化系统。

核心定位：

- **Seedance 1.5 Pro（`doubao-seedance-1-5-pro-251215`）**：默认视频生成执行引擎（当前 API 可用）
- **GPT-5.3-codex**：流程编排/策略引擎
- **产品核心**：时间线 + 控制层（不是单次 prompt 抽奖）

---

## 1) 设计原则

### P1. 时间线优先，不做黑盒一把梭
先规划镜头结构，再调用生成。

### P2. 控制层分离
四层控制：

- 方向层：T2V（氛围/叙事方向）
- 构图层：I2V 首帧（开场画面）
- 过渡层：Keyframes（A->B 连续）
- 一致性层：Multi-ref（角色/服装/道具/风格稳定；仅在模型支持 reference images 时启用）

### P3. 镜头语法先于模型能力
先判断“切还是连”，再选模式：

- 要切：I2V（首帧）+ 硬切
- 要连：Keyframes（首尾帧）

### P4. 先可控、后自动
第一阶段优先可控与复现，不追求一键全自动。

---

## 2) 产品范围

## MVP（2-4周）
输入一句漫剧 idea，输出 30-60 秒成片（可带配音/BGM），包含：

- 自动剧本扩写
- 自动分镜时间线
- 自动模式选择（T2V/I2V/Keyframes/Multi-ref）
- 分段生成 + 拼接 + 音轨合成
- 基础失败重试与人工审核点

## P1（产品化）

- 角色库（角色一致性资产）
- 模板库（题材/节奏/镜头语言）
- 批量出片（同剧本多版本）
- 质量评分器（自动筛片）

---

## 3) 系统架构

`Idea -> Script Planner -> Timeline Planner -> Control Policy Engine -> Seedance Segment Generator -> Assembler -> QA/Export`

### 3.1 核心模块

- Script Planner（GPT-5.3-codex）
  - 生成剧情节拍、角色卡、场景卡

- Timeline Planner（GPT-5.3-codex）
  - 输出结构化 timeline JSON（秒级）

- Control Policy Engine（规则 + LLM）
  - 为每个 shot 选择生成模式与约束

- Seedance Executor
  - 按段调用 Seedance API（默认 Seedance 1.5 Pro）
  - 管理参考素材映射（@图片1/@视频1/@音频1）

- Assembler（ffmpeg）
  - 拼接镜头、加转场、音画同步、字幕

- QA Gate
  - 自动质量检查（连贯性、角色一致性、节奏）
  - 失败段回炉重生成

---

## 4) 数据协议（关键）

统一定义 `timeline.v1.json`，核心字段：

- `project_id`
- `global_style`（题材、镜头风格、色调）
- `characters`（角色ID、服装、道具、参考图）
- `shots[]`：
  - `shot_id`
  - `start_sec` / `end_sec`
  - `narrative_purpose`（铺垫/冲突/反转/收束）
  - `scene` / `subject` / `action`
  - `camera`（景别、机位、运动）
  - `transition_to_next`（cut / continuous / morph）
  - `mode`（t2v / i2v / keyframes / multiref）
  - `refs`（images/videos/audio）
  - `prompt_cn`
  - `negative_prompt`
  - `retry_policy`

该 JSON 作为流程事实源。

---

## 5) 模式选择策略（核心算法）

对每个镜头先判关系，再选模式：

- 同场景 + 同主体 + 动作连续
  - 首选 Keyframes（连）
- 跨场景 / 跨景别 / 跨机位
  - 首选 I2V（切）
- 概念段、氛围段、无资产段
  - T2V 探索
- 角色反复出现、系列化要求
  - 叠加 Multi-ref

附加原则：

- 首尾帧接力仅用于局部连续段，不作为全片主引擎
- 约束过多会僵，约束不足会飘；按镜头类型动态调节

---

## 6) Prompt 体系

分三层 prompt：

- L1：项目级（全局）
  - 题材、风格、色彩、禁用项（无水印/无字幕等）

- L2：镜头级（shot）
  - 镜头内容、动作、机位、节奏、台词/音效意图

- L3：执行级（Seedance语法）
  - `@图片N / @视频N / @音频N` 映射
  - 时段分配（0-3s, 4-8s, ...）
  - 超 15 秒自动分段 + continuity note

---

## 7) Seedance API 接入约束（默认 Seedance 1.5 Pro）

编排器强校验：

- 单次时长：4-15 秒
- 图片：最多 9 张，单张 <30MB
- 视频：最多 3 段，总 2-15 秒，单段 <50MB，480p-720p
- 音频：最多 3 段，总 <=15 秒，单段 <15MB
- 总文件数 <=12
- 输出最高 2K
- 平台限制：真实人脸素材可能被拦截（产品规则中前置提示）

---

## 8) 质量评估体系

总分（0-100）：

- 叙事连贯（25）
- 角色一致性（25）
- 运动自然度（20）
- 画面风格统一（15）
- 音画同步与可看性（15）

低于阈值（例如 75）自动回炉指定镜头，不全片重做。

---

## 9) OpenClaw 落地方案

建议 skill 包：`comic-video-gen`

- `step-1-plan`：剧本 + 时间线 JSON
- `step-2-generate`：按镜头策略生成片段
- `step-3-assemble`：合成与导出
- `step-4-eval`：质量评分与回炉

并行策略：

- 可并行：无依赖的 cut 类镜头
- 串行：有前后依赖的 continuous 类镜头

---

## 10) 风险与应对

- 风险1：角色飘
  - 应对：Multi-ref + 角色资产库 + 一致性评分

- 风险2：镜头僵硬（AI 感）
  - 应对：减少不必要约束，明确“该切就切”

- 风险3：成本失控
  - 应对：两阶段生成（低成本预览 -> 高质量终渲）

- 风险4：合规
  - 应对：前置内容审查、敏感题材规则、素材合法性声明

---

## 11) 里程碑建议

- M0（3-5天）：打通最小链路（10-15秒，单角色）
- M1（1-2周）：30-60秒，多镜头，自动模式选择
- M2（2-4周）：角色库 + 质量评分 + 回炉机制
- M3（4-6周）：模板化批量出片 + A/B版本生成

---

## 12) 下一步

- DD-002：`timeline.v1.json` 字段规范 + 可运行样例
- MVP 工作流：plan -> generate -> assemble -> eval
- 明确 Seedance 执行接口与鉴权方式

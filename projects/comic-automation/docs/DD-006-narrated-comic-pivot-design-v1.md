# DD-006｜comic-automation 向「解说漫自动生成」改造设计文档（v1）

## 0) 改造目标（Pivot）

将 `comic-automation` 从通用漫剧流水线，改造为**面向解说漫（1-3分钟竖屏短视频）**的工业化自动生成系统，核心目标：

- **高产能**：支持日更、多集连续产出
- **高可控**：角色一致、节奏稳定、爽点密度可配置
- **低成本**：优先局部回炉与模板复用
- **可运营**：针对抖音/快手的完播、追更、转化优化

---

## 1) 业务定义与成功指标

### 1.1 内容定义
解说漫 = 小说剧情的“说书式旁白推进” + AI动态镜头 + 快节奏反转。

### 1.2 目标成片规格（默认）
- 比例：9:16
- 单集时长：60-180 秒
- 分镜数：5-8（默认 6）
- 音频优先：先旁白出 SRT，再驱动镜头时长

### 1.3 KPI（MVP）
- TTFV（从 idea 到首版可看视频）<= 30 分钟
- 单集完整成功率 >= 85%
- 关键角色一致性评分 >= 80/100
- 首 30 秒节奏通过率（内部规则）>= 90%

---

## 2) 核心产品原则（解说漫特化）

1. **音频先行**：先生成解说音频与字幕时间轴，再生成画面（避免嘴型/节奏错位）
2. **爽点密度约束**：每 8-12 秒至少一个钩子、反转或情绪抬升
3. **角色卡强绑定**：角色外观与声线配置必须可复用
4. **低成本回炉**：仅回炉低分镜头，不全片重做
5. **平台导向输出**：默认产出封面帧、标题建议、连载钩子句

---

## 3) 新架构（Narrated Comic Pipeline）

`Idea -> Script Refiner -> Narration TTS -> SRT Aligner -> Shot Planner -> Visual Generator -> Assembler -> Evaluator -> Publish Pack`

### 3.1 模块说明

- **Script Refiner**
  - 输入小说片段/大纲
  - 输出 60-180 秒“说书体”解说稿（短句口语化）

- **Narration TTS**
  - 生成旁白音频（可选多人对话音色）
  - 输出 `narration.wav`

- **SRT Aligner**
  - 基于音频生成或校准 `narration.srt`
  - 作为 shot 切分与时长控制依据

- **Shot Planner**
  - 将脚本切分为 5-8 个分镜
  - 每个分镜绑定目的：hook/progress/payoff/cliffhanger

- **Visual Generator（Seedance）**
  - 按 shot 模式（t2v/i2v/keyframes/multiref）生成片段

- **Assembler**
  - 合成画面 + 旁白 + BGM + 动态字幕

- **Evaluator**
  - 评估节奏、一致性、可看性，输出回炉队列

- **Publish Pack**
  - 导出平台发布包（视频、封面、标题备选、简介）

---

## 4) 数据协议升级（timeline.v2 建议）

在 `timeline.v1` 基础上新增解说漫字段：

- `episode_meta`
  - `episode_no`, `series_id`, `target_platform`, `duration_target_sec`
- `narration`
  - `voice_id`, `speed`, `emotion_curve`, `srt_path`
- `hooks`
  - `open_hook`, `mid_hook[]`, `ending_cliffhanger`
- `shots[].story_beat`
  - `hook/progress/reversal/payoff/cliffhanger`
- `shots[].subtitle_window`
  - 与 SRT 对齐的起止区间
- `shots[].continuity_anchor`
  - 角色/服装/场景锚点
- `qa_policy`
  - `min_scores`, `regen_budget`, `max_rounds`

---

## 5) 关键策略

### 5.1 分镜策略（解说漫默认）
- 固定镜头预算：6 镜头（可配 5-8）
- 开头 3 秒必须是强钩子画面
- 每镜头 8-20 秒，避免过短碎片化

### 5.2 模式路由
- 连续动作/同场景：`keyframes`
- 跨场景强切换：`i2v + cut`
- 氛围补位镜头：`t2v`
- 主角反复出场：`multiref` 强制加权

### 5.3 音画同步
- 先音频后画面
- 每个 shot 绑定 `subtitle_window`
- 允许 ±300ms 容差；超阈值进入回炉

---

## 6) 工作流改造计划（OpenClaw）

新增/改造步骤：

1. `step-0-ingest`：读取小说段落/idea，抽取剧情骨架
2. `step-1-script`：生成解说稿（说书体）
3. `step-1.5-audio`：生成旁白 + SRT
4. `step-2-plan`：生成 timeline（绑定音频时轴）
5. `step-3-generate`：按分镜生成视频片段
6. `step-4-assemble`：合成字幕/BGM/转场
7. `step-5-eval`：质量评分与局部回炉
8. `step-6-export`：导出发布包

---

## 7) 评估体系（解说漫版）

总分 100：

- 节奏与钩子密度（30）
- 角色一致性（25）
- 音画同步（20）
- 视觉可看性（15）
- 平台适配度（10）

回炉条件（任一命中）：
- 总分 < 78
- 节奏与钩子密度 < 22
- 音画同步 < 14

---


## 8) Seedance 模型策略（2026-02）

由于 Seedance 2.0 暂无 API 能力，当前开发默认采用 **Seedance 1.5 Pro**。

### 8.1 默认模型
- `model_id`: `doubao-seedance-1-5-pro-251215`
- 默认能力：Text-to-video、Image-to-video（首帧/首尾帧）、Audio 支持、Draft 模式

### 8.2 模式选择建议
- **草稿探索阶段**：开启 `draft_mode=true`（低成本快速出预览）
- **终版导出阶段**：关闭 draft，使用 1.5 Pro HD 重生成

### 8.3 兼容模型（兜底）
- `doubao-seedance-1-0-pro-250428`：T2V + I2V（首帧/首尾帧）
- `doubao-seedance-1-0-pro-fast-250528`：T2V + I2V（仅首帧）
- `doubao-seedance-1-0-lite-t2v-250219`：仅 T2V
- `doubao-seedance-1-0-lite-i2v-250219`：I2V（含参考图 1-4）

### 8.4 运行期兼容策略（已实现）
- 不支持的 `control_mode` 自动降级为 fallback（默认 `i2v`）
- 不支持 Draft 的模型自动关闭 `draft_mode`
- 不支持 Audio 的模型自动移除 shot 级 audio refs
- `multiref` 在默认 1.5 Pro 上按非原生能力处理，自动回退

---

## 9) 实施里程碑

### M1（3-5天）
- 打通 `script -> tts -> srt -> timeline`
- 可输出 1 分钟样片（5-6 镜头）

### M2（1-2周）
- 接入稳定的 shot 级回炉
- 角色卡/声线卡可复用

### M3（2-3周）
- 连载化：同一 `series_id` 连续产出 5 集
- 导出发布包（标题钩子 + 封面）

### M4（4周+）
- 批量 A/B 版本
- 数据闭环（完播反馈反哺脚本）

---

## 10) 本分支交付范围（当前）

本次先完成“方案阶段”交付，不直接改执行代码：

- 新增本设计文档（DD-006）
- 建立 `comic-automation` 独立迭代记忆文档（项目 memory）
- 明确下一步改造任务清单

---

## 11) 下一步执行清单

1. 定义 `timeline.v2` schema 草案（兼容 v1）
2. 增加 `step-1.5-audio` 工作流规范
3. 增加“解说漫脚本模板”与“角色卡模板”
4. 新增评估规则：钩子密度与音画同步
5. 产出第一条 60-90 秒端到端样片

---

## 附：与旧方案（DD-001）的差异

- 从“通用漫剧”切到“解说漫优先”
- 从“镜头先行”升级为“音频+字幕先行”
- 从“可生成”升级为“可连载、可运营、可迭代”

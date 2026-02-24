# comic-automation 项目记忆

> 此文档存储 `comic-automation` 项目的重要上下文信息，便于快速回忆项目状态、决策和关键细节。

## 项目基本信息

- **GitHub:** `KKenny0/comic-automation`
- **类型:** 公开仓库
- **创建时间:** 2026-02-22
- **项目定位:** 漫剧生成自动化（更具体：**解说漫生成的自动化**）

---

## 核心理念

> 不是"能生成一段视频"，而是一个可产品化的 **idea → 成片** 自动化系统

**技术组合：**
- **Seedance 2.0** → 视频生成执行引擎
- **GPT-5.3-codex** → 流程编排/策略引擎

---

## 设计原则

| 原则 | 说明 |
|------|------|
| P1. 时间线优先 | 先规划镜头结构，再调用生成，不是"扔一句 prompt 抽奖" |
| P2. 控制层分离 | 方向层(T2V) → 构图层(I2V首帧) → 过渡层(Keyframes) → 一致性层(Multi-ref) |
| P3. 镜头语法优先 | 先判断"该切还是该连"，再选模式 |
| P4. 先可控后自动 | 第一阶段优先"可控 + 可复现"，不是追求一键全自动 |

---

## 系统架构

```
Idea → Script Planner → Timeline Planner → Control Policy Engine
     → Seedance Segment Generator → Assembler → QA/Export
```

### 核心模块

| 模块 | 职责 |
|------|------|
| Script Planner | 生成剧情节拍、角色卡、场景卡 |
| Timeline Planner | 输出结构化 timeline JSON（秒级） |
| Control Policy Engine | 为每个 shot 选择生成模式与约束 |
| Seedance Executor | 按段调用 Seedance 2.0，管理参考素材映射 |
| Assembler | 拼接镜头、加转场、音画同步、字幕 |
| QA Gate | 自动质量检查、失败段回炉重生成 |

---

## 模式选择策略

| 场景 | 首选模式 |
|------|----------|
| 同场景 + 同主体 + 动作连续 | Keyframes（连） |
| 跨场景 / 跨景别 / 跨机位 | I2V（切） |
| 概念段、氛围段、无资产段 | T2V 探索 |
| 角色反复出现、系列化要求 | 叠加 Multi-ref |

---

## 产品路线图

### MVP（2-4周）
输入一句漫剧 idea，输出 30-60 秒成片：
- 自动剧本扩写
- 自动分镜时间线
- 自动模式选择
- 分段生成 + 拼接 + 音轨合成
- 基础失败重试与人工审核点

### P1（产品化）
- 角色库（角色一致性资产）
- 模板库（题材/节奏/镜头语言）
- 批量出片（同剧本多版本）
- 质量评分器（自动筛片）

---

## 里程碑

| 里程碑 | 时间 | 目标 |
|--------|------|------|
| M0 | 3-5天 | 打通最小链路（10-15秒，单角色） |
| M1 | 1-2周 | 30-60秒，多镜头，含自动模式选择 |
| M2 | 2-4周 | 角色库 + 质量评分 + 回炉机制 |
| M3 | 4-6周 | 模板化批量出片 + A/B版本生成 |

---

## OpenClaw 落地方案

做成 skill 包：`comic-video-gen`

| 步骤 | 功能 |
|------|------|
| step-1-plan | 剧本 + 时间线 JSON |
| step-2-generate | 按镜头策略生成片段 |
| step-3-assemble | 合成与导出 |
| step-4-eval | 质量评分与回炉 |

**并行策略：**
- 可并行：无依赖的"cut类镜头"
- 串行：需要前后依赖的"continuous类镜头"

---

## 数据协议

核心文件：`timeline.v1.json`

```json
{
  "project_id": "...",
  "global_style": { "题材、镜头风格、色调" },
  "characters": [ { "角色ID、服装、道具、参考图" } ],
  "shots": [
    {
      "shot_id": "...",
      "start_sec": 0,
      "end_sec": 5,
      "narrative_purpose": "铺垫/冲突/反转/收束",
      "scene": "...",
      "subject": "...",
      "action": "...",
      "camera": { "景别、机位、运动" },
      "transition_to_next": "cut / continuous / morph",
      "mode": "t2v / i2v / keyframes / multiref",
      "refs": { "images/videos/audio" },
      "prompt_cn": "...",
      "negative_prompt": "...",
      "retry_policy": { ... }
    }
  ]
}
```

---

## Seedance 2.0 约束

| 约束项 | 限制 |
|--------|------|
| 单次时长 | 4-15 秒 |
| 图片 | 最多 9 张，单张 <30MB |
| 视频 | 最多 3 段，总 2-15 秒，单段 <50MB，480p-720p |
| 音频 | 最多 3 段，总 <=15 秒，单段 <15MB |
| 总文件数 | <=12 |
| 输出最高 | 2K |
| 平台限制 | 真实人脸素材可能被拦截 |

---

## 质量评估体系

每条片子打分（0-100）：

| 维度 | 分值 |
|------|------|
| 叙事连贯 | 25 |
| 角色一致性 | 25 |
| 运动自然度 | 20 |
| 画面风格统一 | 15 |
| 音画同步与可看性 | 15 |

低于 75 分自动回炉重生成指定镜头。

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| 角色飘 | Multi-ref + 角色资产库 + 角色一致性评分 |
| 镜头僵硬（AI感） | 减少不必要约束，明确"该切就切" |
| 成本失控 | 两阶段生成（低成本预览 → 高质量终渲） |
| 合规 | 前置内容审查、敏感题材规则、素材合法性声明 |

---

## 参考资料

- https://github.com/songguoxs/seedance-prompt-skill
- https://mp.weixin.qq.com/s/ynHQjO-B-TW3JSIYQuzGrQ
- https://mp.weixin.qq.com/s/PaFOHU7HRtQcQkBN7RHPGw

---

## 开发记录

### 2026-02-24
- 删除远程分支 `feat/timeline-creator-panel-v1`
- 创建项目 memory 文档
- 新增独立迭代记忆日志：`memory/projects/comic-automation-iteration-log.md`
- 新增解说漫改造设计文档：`projects/comic-automation/docs/DD-006-narrated-comic-pivot-design-v1.md`

---

## 项目独立记忆入口

- 主记忆（背景/架构）：`memory/projects/comic-automation.md`
- 迭代日志（升级轨迹）：`memory/projects/comic-automation-iteration-log.md`

---

## 待办事项

- [ ] 定义 `timeline.v2` schema（兼容 v1）
- [ ] 补充 `step-1.5-audio` 工作流规范
- [ ] 跑通首条 60-90 秒端到端样片

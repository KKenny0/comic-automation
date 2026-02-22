# Comic Automation (漫剧自动化)

本项目用于落地“idea -> 成片”的漫剧自动化流程，基于：

- **GPT-5.3-codex**：流程编排、剧本/分镜/时间线规划、控制策略决策
- **Seedance 2.0**：视频片段生成执行引擎
- **OpenClaw**：工作流编排、任务执行、自动化集成

## 当前文档

- `docs/DD-001-product-design-v0.1.md`：首版设计文档（项目主脉络）

## 目录结构

- `docs/`：设计文档（Design Docs）
- `specs/`：数据协议、schema、接口规范
- `prompts/`：提示词模板与策略
- `workflows/`：OpenClaw 工作流定义
- `scripts/`：执行脚本（后续补充）
- `assets/`：角色/场景参考素材（本地）
- `outputs/`：生成结果与中间产物
- `status/`：里程碑、任务状态、变更记录

## 下一步

1. 输出 DD-002：`timeline.v1.json` 字段规范与样例
2. 形成 MVP 工作流（plan -> generate -> assemble -> eval）
3. 明确与 Seedance 的执行接口与约束校验

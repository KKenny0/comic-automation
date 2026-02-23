# OpenClaw 操作手册：让 AI 自动搭建 Mission Control（可复用模板）

> 这不是“代码实现说明书”，而是一份 **给读者直接照做的 OpenClaw 使用手册**。  
> 目标：你只需要按步骤给 OpenClaw 下指令，就能搭建一套完整的 Mission Control。

---

## 1. 这份手册适合谁

- 想用 OpenClaw 做一个「任务 + 日历 + 记忆」的运营中台
- 不想自己手敲太多代码，希望 AI 帮你从 0 到可上线
- 希望最终可外网访问，并且有可审计的数据链路

---

## 2. 最终你会得到什么

四个独立应用：

1. `task-board`：任务看板（状态、负责人、自动事件）
2. `calendar`：排程/cron 审计（定义同步 + 运行结果回填）
3. `memory`：记忆文档库（卡片展示 + 搜索 + 同步）
4. `portal`：跨模块总览入口

并且支持：

- 自动化桥接 API（不是纯手工 CRUD）
- Convex 实时数据
- Vercel 外网访问

---

## 3. 使用前准备

### 本机准备

- Node.js 20+
- npm
- Git
- OpenClaw 可正常执行 shell

### 账号准备（上线时需要）

- Convex 账号
- Vercel 账号

---

## 4. 你可以直接复制的“主提示词”

把下面这段发给 OpenClaw（建议一次性发完整）：

```text
请你帮我在 /Users/kenny/.openclaw/workspace/mission-control 下搭建 Mission Control，要求：
1) 4 个独立 Next.js + Convex 应用：portal、task-board、calendar、memory
2) task-board 要有任务状态、负责人、实时更新、自动任务 upsert API
3) calendar 要有 cron/scheduled item 同步 API + run result 回填 API
4) memory 要有文档卡片、搜索、从 MEMORY.md 和 memory/*.md 同步 API
5) portal 要读取三个模块的 /api/summary 做跨模块总览
6) 每个应用都要有统一 Convex URL 解析（CONVEX_URL + NEXT_PUBLIC_CONVEX_URL）
7) 给出一键启动脚本，支持并行开发
8) 完成后必须运行完整验证（lint/build/API 实测）并汇报结果
```

> 这段提示词是“目标定义”。之后你只要按阶段给它继续下命令。

---

## 5. 分阶段操作（你对 OpenClaw 的指令模板）

## 阶段 A：先搭骨架

发给 OpenClaw：

```text
先完成目录初始化和四个应用脚手架，然后把目录树和 package scripts 发我确认。
```

你应该看到：

- `mission-control/portal`
- `mission-control/task-board`
- `mission-control/calendar`
- `mission-control/memory`
- `mission-control/scripts/start.sh`

---

## 阶段 B：实现业务与自动桥接

发给 OpenClaw：

```text
继续实现三模块核心功能和自动桥接 API，并在 README 里写出每个 API 的请求示例。
```

验收点：

- task-board: `POST /api/automation/tasks/upsert`
- calendar: `POST /api/automation/calendar/sync-cron`
- calendar: `POST /api/automation/calendar/upsert-scheduled`
- calendar: `POST /api/automation/calendar/record-run`
- memory: `POST /api/automation/memory/upsert`
- memory: `POST /api/memory/sync`
- 三模块均有 `GET /api/summary`

---

## 阶段 C：解决“看不到数据”问题（关键）

发给 OpenClaw：

```text
请确保前后端不会连错 Convex 实例：
1) 统一 CONVEX_URL/NEXT_PUBLIC_CONVEX_URL
2) 页面加服务端 fallback 数据接口
3) UI 上标注当前数据来源并提供 force reload
```

这一步是高频坑位，必须做。

---

## 阶段 D：部署为外网可访问（A 方案）

发给 OpenClaw：

```text
现在执行 A 方案：
1) 为 task-board/calendar/memory 各自绑定固定 Convex cloud deployment
2) 部署 4 个应用到 Vercel
3) 配置 Portal 指向三个模块的线上 URL
4) 最后给我可访问链接和验收结果
```

> 如果 OpenClaw 提示你提供 token，再提供即可。建议私聊发送，不要发群聊。

---

## 6. 线上配置清单（读者必须知道）

### 三个业务应用（task-board/calendar/memory）

至少要有：

- `NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud`
- `CONVEX_URL=https://xxx.convex.cloud`

### Portal

需要指向三个线上模块：

- `NEXT_PUBLIC_TASK_BOARD_URL=https://...`
- `NEXT_PUBLIC_CALENDAR_URL=https://...`
- `NEXT_PUBLIC_MEMORY_URL=https://...`

---

## 7. 你应该让 OpenClaw 输出的“最终交付物”

发给 OpenClaw：

```text
请按以下格式给我最终交付：
1) 四个线上 URL
2) 三个 Convex deployment URL
3) 每个模块的 summary 返回样例
4) 自动桥接 API 最小调用示例（curl）
5) 验收结论（通过/不通过 + 原因）
```

这样你的文章就有可验证证据链，而不是“看起来能跑”。

---

## 8. 一键验收指令（可直接复制）

让 OpenClaw 执行：

```text
请执行完整功能验证：
- task-board/calendar/memory/portal 分别 lint + build
- 调用三个模块 /api/summary
- 调用 memory /api/memory/sync
- 调用 calendar /api/automation/calendar/sync-cron 与 record-run（可用测试数据）
- 最后输出一份验收报告
```

---

## 9. 常见问题（给读者）

### Q1：本地能看，外网看不到？

因为你还在 `next dev` + 本地 Convex。要上 Vercel + Convex cloud。

### Q2：同步成功但页面还是 0？

通常是前后端连到不同 Convex URL。统一环境变量并加 server fallback。

### Q3：token 泄露怎么办？

马上在对应平台 revoke，并生成新 token。不要把长期 token 发公开频道。

---

## 10. 你发布到 Twitter / 公众号时的建议结构

1. 痛点：为什么你需要 Mission Control（而不是 4 个散落脚本）
2. 方法：用 OpenClaw 分阶段下指令
3. 结果：4 个应用 + 自动桥接 + 外网可访问
4. 关键经验：统一 Convex 环境、可审计 API、验收先行
5. CTA：附上你自己的 Prompt 模板

---

## 11. 给读者的“最短操作路径”

如果读者只想快速复现，让他们按这个顺序：

1) 发“主提示词”给 OpenClaw  
2) 按 A/B/C/D 四阶段推进  
3) 提供 Convex + Vercel token（私密）  
4) 要求 OpenClaw 输出验收报告  
5) 拿最终 URL 验证并发布

---

## 12. 安全提醒（建议原文保留）

- 不要在公开群聊贴 token
- token 只给最小范围、最短生命周期
- 发布前检查是否把 `.env.local`、密钥、内部 URL 提交进仓库

---

如果你愿意，我还可以再给你一版：

- **公众号叙事版**（故事化、适合长文阅读）
- **Twitter 线程版**（10~12 条 Thread，偏传播）

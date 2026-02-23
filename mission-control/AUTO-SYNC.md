# Mission Control Auto-Sync

自动同步 OpenClaw 数据到 Mission Control 面板。

## 功能

- **Memory 同步**：自动同步 `MEMORY.md` 和 `memory/` 目录下的所有 Markdown 文档到 Memory 面板
- **Calendar 同步**：自动同步 OpenClaw cron 任务到 Calendar 面板

## 同步频率

每小时整点自动执行一次（可通过 OpenClaw cron 配置调整）

## 手动触发

```bash
/Users/kenny/.openclaw/workspace/mission-control/scripts/sync-mission-control.sh
```

## 前置条件

同步脚本需要以下服务运行中：

- **Memory 面板**：`http://localhost:3003`
  ```bash
  cd /Users/kenny/.openclaw/workspace/mission-control
  ./scripts/start.sh memory
  ```

- **Calendar 面板**：`http://localhost:3002`
  ```bash
  cd /Users/kenny/.openclaw/workspace/mission-control
  ./scripts/start.sh calendar
  ```

## Cron 任务配置

自动同步通过 OpenClaw cron 管理：

- **任务名称**：Mission Control Auto-Sync
- **Cron 表达式**：`0 * * * *` (每小时整点)
- **时区**：America/Los_Angeles
- **超时**：300 秒

### 修改同步频率

```bash
# 查看当前 cron 任务
openclaw cron list

# 更新同步频率（例如每 6 小时）
openclaw cron update 2a5fe39a-b8b1-473f-804a-d48737e8618b --expr "0 */6 * * *"
```

## 同步日志

同步结果会自动发送到 Discord `#memory-system-v2` 频道。

## 故障排查

### Memory 同步失败

1. 检查 Memory 服务是否运行：`curl http://localhost:3003`
2. 检查 Convex 连接：确保 `.env.local` 中配置了正确的 `NEXT_PUBLIC_CONVEX_URL`
3. 检查文档格式：确保所有 `.md` 文件都是有效的 Markdown

### Calendar 同步失败

1. 检查 Calendar 服务是否运行：`curl http://localhost:3002`
2. 检查 OpenClaw CLI：确保 `openclaw` 命令可用
3. 检查 Convex 连接：确保 `.env.local` 中配置了正确的 `NEXT_PUBLIC_CONVEX_URL`

## 架构说明

```
OpenClaw Cron (每小时)
    ↓
同步脚本 (sync-mission-control.sh)
    ├─> Memory Sync API (localhost:3003/api/memory/sync)
    │   └─> Convex Database (valiant-frog-441)
    │
    └─> Calendar Sync API (localhost:3002/api/automation/calendar/sync-cron)
        └─> Convex Database (glad-frog-983)
```

## 文件说明

- `scripts/sync-mission-control.sh` - 主同步脚本
- `calendar/src/app/api/automation/calendar/sync-cron/route.ts` - Calendar 同步 API
- `memory/src/app/api/memory/sync/route.ts` - Memory 同步 API

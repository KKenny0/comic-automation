# Seedance API Mapping v1

> 更新时间：2026-02-24
> 默认模型：`doubao-seedance-1-5-pro-251215`（Seedance 1.5 Pro）

## 1) 模型能力矩阵

| Model | Model ID | T2V | I2V 首帧 | I2V 首尾帧 | Audio | Draft | Reference Images |
|---|---|---|---|---|---|---|---|
| Seedance 1.5 Pro | `doubao-seedance-1-5-pro-251215` | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Seedance 1.0 Pro | `doubao-seedance-1-0-pro-250428` | ✅ | ✅ | ✅ | ❌ | ❌ | - |
| Seedance 1.0 Pro Fast | `doubao-seedance-1-0-pro-fast-250528` | ✅ | ✅ | ❌ | ❌ | ❌ | - |
| Seedance 1.0 Lite T2V | `doubao-seedance-1-0-lite-t2v-250219` | ✅ | ❌ | ❌ | ❌ | ❌ | - |
| Seedance 1.0 Lite I2V | `doubao-seedance-1-0-lite-i2v-250219` | ❌ | ✅ | ✅ | ❌ | ❌ | 1-4 |

---

## 2) control_mode 到能力的映射

- `t2v` -> 需要模型支持 T2V
- `i2v` -> 需要模型支持 I2V（首帧）
- `keyframes` -> 需要模型支持 I2V（首尾帧）
- `multiref` -> 需要模型支持 I2V + Reference Images

> 注：在默认模型 Seedance 1.5 Pro 上，`multiref` 视为**非原生模式**，运行器会自动降级到 `retry_policy.fallback_mode`（默认 `i2v`）。

---

## 3) 运行期自动修正策略

执行器在每个 shot 会做以下兼容性修正：

1. 若 `control_mode` 不被当前 `model_id` 支持：
   - 优先切到 `retry_policy.fallback_mode`
   - fallback 也不支持时，自动挑选一个可用模式

2. 若 `draft_mode=true` 但模型不支持 Draft：
   - 自动改为 `false`

3. 若存在 `refs.audio_asset_ids` 但模型不支持 Audio：
   - 自动清空该 shot 音频引用

4. 若 `multiref` 引用图超过模型上限（如 Lite I2V 上限 4）：
   - 自动截断到上限，并记录 warning

---

## 4) 推荐生产策略

- 预览阶段：`Seedance 1.5 Pro + draft_mode=true`
- 终版阶段：`Seedance 1.5 Pro + draft_mode=false`
- 兼容降级：
  - 无首尾帧能力时，避免 `keyframes`
  - 无 audio 能力时，将音频在 assemble 阶段统一混入

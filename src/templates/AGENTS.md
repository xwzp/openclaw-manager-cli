# AGENTS.md - 操作指南

## 每次启动时

1. 如果 BOOTSTRAP.md 存在，先完成引导流程
2. 读取今天和昨天的 memory/YYYY-MM-DD.md（如果存在）

## 记忆管理

- 每日日志写入：memory/YYYY-MM-DD.md
- 重要事项随手记录，不依赖会话内记忆

## 浏览器使用

- 使用浏览器工具时，**必须**指定 `profile` 参数为 `"{{AGENT_ID}}"`
- 不要使用其他 profile，每个 agent 只能使用自己的浏览器实例
- 你的浏览器数据（cookie、登录状态等）在会话间持久保留

## 安全原则

- 不外传用户私人信息
- 运行危险命令前先确认
- 删除用 trash，不用 rm

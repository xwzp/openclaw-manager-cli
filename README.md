# openclaw-manager-cli

OpenClaw 安装和 Agent 管理的命令行工具。

## 使用方式

需要 Node.js >= 18。

```bash
# 安装 OpenClaw
npx github:xwzp/openclaw-manager-cli#main install

# 管理 Agent
npx github:xwzp/openclaw-manager-cli#main agent

# 卸载
npx github:xwzp/openclaw-manager-cli#main uninstall
```

## 命令

### install

安装 OpenClaw 及所有依赖。

```bash
# 交互式选择安装模式
openclaw-manager-cli install

# 直接指定模式
openclaw-manager-cli install --mode std       # 标准模式
openclaw-manager-cli install --mode sandbox   # 沙箱模式
```

安装流程会自动：
1. 检测并安装依赖（Homebrew、Docker、mise、Node.js、fzf、OpenClaw）
2. 初始化 OpenClaw（onboard + doctor）
3. 生成配置文件
4. [沙箱模式] 构建 Docker 沙箱镜像
5. 安装全局 Skills（rag、video-summarizer）
6. 启用 Skills 和 Hooks

安装中断后重新运行会从断点继续。

### agent

交互式管理 Agent。

```bash
openclaw-manager-cli agent
```

进入交互界面后可以：
- **添加 Agent** — 输入 Agent ID、名称、API Key、模型、飞书配置
- **删除 Agent** — 选择要删除的 Agent（数据移到废纸篓）
- **编辑 Agent** — 修改 API Key、模型、飞书配置

添加 Agent 时：
- Agent ID 不允许重复
- API Key 和飞书 App ID 重复会提示警告
- 敏感信息输入后显示脱敏值（前后各 6 位）
- 默认模型为 Claude Opus 4.5
- 默认 Provider 为 ai.nebulatrip.com

### uninstall

卸载 OpenClaw 组件。

```bash
# 交互式选择要卸载的组件
openclaw-manager-cli uninstall

# 卸载全部
openclaw-manager-cli uninstall --all
```

可卸载的组件：
- OpenClaw npm 包
- Sandbox Docker 镜像和容器
- ~/.openclaw 目录
- ~/.config/openclaw-manager 目录

## 开发

```bash
npm install          # 安装依赖
npm test             # 运行测试
npm run test:watch   # 监听模式
npm run build        # 构建
```

## 项目结构

```
src/
├── commands/     # UI 层：用户交互 + 流程编排
├── core/         # 业务层：定义接口(Port) + 业务逻辑
├── adapters/     # 适配层：实现业务层接口
├── utils/        # 工具函数
└── templates/    # Agent 工作区模板 + 全局 Skills
```

架构采用六边形（Ports and Adapters）模式，业务层定义接口，适配层实现，UI 层组装。

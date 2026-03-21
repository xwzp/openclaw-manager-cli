# 🧠 RAG Skill for OpenClaw

[English](#english) | [中文](#中文)

---

<a id="中文"></a>

## 中文

### 这是什么？

一个 OpenClaw 技能（Skill），让你的 Agent 能够检索本地文档来回答问题，而不是只靠模型自带的知识。

**解决的问题：** OpenClaw 在回答冷门领域的问题时（比如特定项目文档、内部知识库），经常不准确或编造内容。RAG（检索增强生成）让 Agent 先从你提供的文档中查找相关内容，再基于这些内容回答。

### 工作原理

```
你的文档（Markdown）
    ↓
OpenClaw memorySearch 自动索引（向量 + BM25）
    ↓
Agent 回答问题时自动检索相关片段
    ↓
基于真实文档内容生成回答
```

每个 Agent 在自己的 workspace 下有一个 `rag/` 文件夹，放进去的 Markdown 文档会被自动索引。

### 安装

**方式一：直接复制（推荐）**

```bash
# 克隆仓库到 OpenClaw 全局技能目录
git clone https://github.com/xwzp/openclaw-skill-rag.git ~/.openclaw/skills/rag
```

**方式二：手动安装**

1. 下载 `SKILL.md` 文件
2. 放到 `~/.openclaw/skills/rag/SKILL.md`

**配置 OpenClaw：**

在 `~/.openclaw/openclaw.json` 中添加：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        enabled: true,
        extraPaths: ["rag"]  // 指向每个 workspace 下的 rag/ 目录
      }
    }
  }
}
```

重启 Gateway 生效。

### 使用方法

**添加知识源：**

直接告诉你的 Agent：
- "帮我加个 Cardano 的文档到知识库"
- "你对 XX 的回答不准，帮我补充一下相关知识"
- "给我建个 RAG"

Agent 会：
1. 跟你确认操作方案
2. 把文档 clone 到 `<workspace>/rag/` 下
3. 帮你建立定时更新任务
4. 提示你重启 Gateway

**手动添加：**

```bash
cd ~/.openclaw/workspaces/<agent>/rag
git clone --depth 1 https://github.com/some-org/some-docs.git
# 重启 Gateway，等待索引完成
```

### 注意事项

- 只有 `.md` 文件会被索引
- 建议用 `--depth 1` 浅克隆节省空间
- 每个 Agent 的索引是独立的
- `rag/` 目录建议加到 `.gitignore`

---

<a id="english"></a>

## English

### What is this?

An OpenClaw skill that enables your Agent to retrieve local documents when answering questions, instead of relying solely on the model's built-in knowledge.

**Problem it solves:** OpenClaw often gives inaccurate or fabricated answers for niche topics (specific project docs, internal knowledge bases). RAG (Retrieval-Augmented Generation) makes the Agent search your provided documents first, then answer based on the actual content.

### How it works

```
Your documents (Markdown)
    ↓
OpenClaw memorySearch auto-indexes (vector + BM25)
    ↓
Agent automatically retrieves relevant snippets when answering
    ↓
Generates answers based on real document content
```

Each Agent has a `rag/` folder in its workspace. Markdown documents placed there are automatically indexed.

### Installation

**Option 1: Clone directly (recommended)**

```bash
# Clone to OpenClaw global skills directory
git clone https://github.com/xwzp/openclaw-skill-rag.git ~/.openclaw/skills/rag
```

**Option 2: Manual install**

1. Download the `SKILL.md` file
2. Place it at `~/.openclaw/skills/rag/SKILL.md`

**Configure OpenClaw:**

Add to `~/.openclaw/openclaw.json`:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        enabled: true,
        extraPaths: ["rag"]  // Points to rag/ under each workspace
      }
    }
  }
}
```

Restart the Gateway to apply.

### Usage

**Adding knowledge sources:**

Just tell your Agent:
- "Add Cardano docs to the knowledge base"
- "Your answers about XX are inaccurate, add some reference docs"
- "Set up a RAG for me"

The Agent will:
1. Confirm the plan with you
2. Clone docs into `<workspace>/rag/`
3. Set up a cron job for auto-updates
4. Remind you to restart the Gateway

**Manual setup:**

```bash
cd ~/.openclaw/workspaces/<agent>/rag
git clone --depth 1 https://github.com/some-org/some-docs.git
# Restart Gateway and wait for indexing
```

### Notes

- Only `.md` files are indexed
- Use `--depth 1` shallow clone to save space
- Each Agent's index is independent
- Add `rag/` to your `.gitignore`

---

## License

MIT

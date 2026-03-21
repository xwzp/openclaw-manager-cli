---
name: rag
description: >
  Manage RAG (Retrieval-Augmented Generation) knowledge sources for agents.
  Add external documentation (GitHub repos, doc sites) to an agent's local
  knowledge base so memory_search can retrieve domain-specific information.
  Triggers when: user says agent's knowledge is inaccurate, user wants agent
  to learn about a topic, user asks to add/remove/list RAG sources, user
  mentions "RAG", "知识库", "加个文档", "学习一下", "知识不准",
  "回答不对", "补充知识".
---

# RAG Knowledge Source Management

Manage local RAG knowledge sources for OpenClaw agents. Sources are stored in
each agent's `<workspace>/rag/` directory and automatically indexed by
OpenClaw's memorySearch via `extraPaths: ["rag"]`.

## How It Works

- Each agent has a `rag/` folder in its workspace
- OpenClaw's memorySearch indexes all `.md` files in this folder
- Sources are typically git repos cloned with `--depth 1` (shallow)
- A single cron job per agent periodically `git pull` all sources
- After adding/removing sources, a gateway restart triggers reindexing

## Add a RAG Source

### Step 1: Confirm with User

Before doing anything, send a briefing to the user:

```
📚 RAG 知识库建立方案

要给 [agent名称] 添加 [topic] 的知识库，具体操作如下：

1️⃣ 下载文档
   将 [repo/source] 克隆到 <workspace>/rag/ 目录下
   预计包含约 X 个 Markdown 文件

2️⃣ 建立定时更新
   [如果该 agent 还没有 rag-auto-update 定时任务]
   创建每日自动更新任务，定期拉取最新文档
   [如果已有 rag-auto-update 任务]
   将新源合并到现有的 rag-auto-update 定时任务中

3️⃣ 重启生效
   需要重启 gateway，等待索引完成即可

是否继续？
```

**等用户确认后再执行。不要跳过这一步。**

### Step 2: Clone the Source

```bash
mkdir -p <workspace>/rag
cd <workspace>/rag
git clone --depth 1 <repo-url> [folder-name]
```

Verify useful `.md` files exist:
```bash
find <workspace>/rag/<folder> -name "*.md" | wc -l
```

### Step 3: Set Up or Update Cron Job

**关键规则：每个 agent 只有一个 `rag-auto-update` 定时任务。**

Check if the agent already has a `rag-auto-update` cron job:
```bash
cat ~/.openclaw/cron/jobs.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
for j in d['jobs']:
    if j.get('agentId')=='<AGENT_ID>' and j['name']=='rag-auto-update':
        print('FOUND:', j['id'])
        print(j['payload']['message'])
"
```

**If no existing job:** Create one that covers all sources in `<workspace>/rag/`:

The cron job message should:
1. List all `rag/` subdirectories
2. Run `git pull` on each one
3. Report which ones had updates

Example cron payload message:
```
执行 RAG 知识源更新。

1. 获取所有 RAG 源目录：ls <workspace>/rag/
2. 对每个目录执行 git pull
3. 收集更新结果：
   - 如果全部 "Already up to date." → 回复 NO_REPLY
   - 如果有更新 → 汇总变更，用 message 发简报给用户（target: <USER_ID>）：
     📦 RAG 知识源更新
     📂 [source1]: 更新了 X 个文件
     📂 [source2]: 无变化
     发完回复 NO_REPLY
4. 记录到 memory/YYYY-MM-DD.md
```

Cron job settings:
- `name`: `rag-auto-update`
- `schedule`: `0 3 * * *` (每天凌晨 3:00)
- `sessionTarget`: `isolated`
- `wakeMode`: `now`
- `delivery.mode`: `announce`
- `delivery.channel`: `telegram`
- `delivery.to`: user's Telegram ID

**If job already exists:** Update its payload message to scan all directories
under `rag/` dynamically. Since the job already lists and iterates all `rag/`
subdirectories, it will automatically pick up new sources. Only update the
job if it hardcodes specific folder names instead of scanning dynamically.

### Step 4: Notify User

Tell the user:
- ✅ 文档已下载到 `<workspace>/rag/<folder>/`
- ✅ 定时更新已配置（每天凌晨 3:00 自动拉取）
- ⚠️ 请重启 gateway，等待索引完成即可

## List RAG Sources

```bash
ls <workspace>/rag/
```

For each source, show:
- Folder name
- Git remote URL: `git -C <path> remote get-url origin`
- Last update: `git -C <path> log -1 --format="%ai"`
- File count: `find <path> -name "*.md" | wc -l`

## Remove a RAG Source

1. Confirm with user before removing
2. Remove: `rm -rf <workspace>/rag/<source-name>`
3. No need to update cron job (it scans dynamically)
4. Tell user to restart gateway to update the index

## Update a RAG Source (Manual)

```bash
cd <workspace>/rag/<source-name> && git pull
```

The memorySearch file watcher detects changes and reindexes automatically.

## Notes

- Only `.md` files are indexed by memorySearch
- Git repos use `--depth 1` to save space
- `rag/` directories are gitignored per workspace (`workspaces/*/rag/`)
- Each agent's index is separate (`~/.openclaw/memory/<agentId>.sqlite`)
- For non-git sources, manually download markdown files into `rag/`

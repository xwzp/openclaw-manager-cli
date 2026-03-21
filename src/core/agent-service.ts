import { homedir } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ConfigRepo, ManagerConfigRepo, FsPort } from './ports.js'
import type { AgentAddParams, AgentEditParams, AgentInfo, OpenClawConfig } from '../types.js'
import { DEFAULT_MODELS, BROWSER_COLORS } from './configgen.js'

const CDP_PORT_START = 18800
const CDP_PORT_MAX = 18899

const TEMPLATES = ['BOOTSTRAP.md', 'SOUL.md', 'TOOLS.md', 'USER.md', 'AGENTS.md']

export function createAgentService(
  configRepo: ConfigRepo,
  mgrConfigRepo: ManagerConfigRepo,
  fsPort: FsPort,
) {
  async function nextCdpPort(cfg: OpenClawConfig): Promise<number> {
    const profiles = cfg.browser?.profiles ?? {}
    const usedPorts = Object.values(profiles).map((p: any) => p.cdpPort as number)
    for (let port = CDP_PORT_START; port <= CDP_PORT_MAX; port++) {
      if (!usedPorts.includes(port)) return port
    }
    throw new Error(`CDP port exhausted (max ${CDP_PORT_MAX})`)
  }

  function nextColor(cfg: OpenClawConfig): string {
    const profiles = cfg.browser?.profiles ?? {}
    const count = Object.keys(profiles).length
    return BROWSER_COLORS[count % BROWSER_COLORS.length]
  }

  return {
    async isAgentIdDuplicate(id: string): Promise<boolean> {
      const cfg = await configRepo.load()
      return cfg.agents.list.some(a => a.id === id)
    },

    async isApiKeyDuplicate(apiKey: string): Promise<boolean> {
      const cfg = await configRepo.load()
      return Object.values(cfg.models.providers).some(p => p.apiKey === apiKey)
    },

    async isFeishuAppIdDuplicate(appId: string): Promise<boolean> {
      const cfg = await configRepo.load()
      const accounts = cfg.channels?.feishu?.accounts ?? {}
      return Object.values(accounts).some((a: any) => a.appId === appId)
    },

    async addAgent(params: AgentAddParams): Promise<void> {
      const cfg = await configRepo.load()
      const home = homedir()

      // Provider
      cfg.models.providers[`nebula-${params.id}`] = {
        baseUrl: 'https://ai.nebulatrip.com',
        apiKey: params.apiKey,
        api: 'anthropic-messages',
        models: [...DEFAULT_MODELS],
      }

      // Agent entry
      const workspace = path.join(home, '.openclaw', 'workspaces', params.id)
      cfg.agents.list.push({
        id: params.id,
        name: params.name,
        workspace,
        model: `nebula-${params.id}/${params.modelId}`,
        memorySearch: {
          provider: 'gemini',
          model: 'gemini-embedding-001',
          remote: {
            baseUrl: 'https://ai.nebulatrip.com/v1beta',
            apiKey: params.apiKey,
          },
          extraPaths: ['rag'],
        },
      })

      // Binding
      cfg.bindings.push({
        agentId: params.id,
        match: { channel: 'feishu', accountId: params.id },
      })

      // Feishu account
      if (!cfg.channels.feishu) cfg.channels.feishu = { enabled: true, accounts: {} }
      if (!cfg.channels.feishu.accounts) cfg.channels.feishu.accounts = {}
      cfg.channels.feishu.accounts[params.id] = {
        appId: params.feishuAppId,
        appSecret: params.feishuAppSecret,
        botName: params.name,
      }

      // Browser profile
      if (!cfg.browser) cfg.browser = { enabled: true, profiles: {} }
      if (!cfg.browser.profiles) cfg.browser.profiles = {}
      cfg.browser.profiles[params.id] = {
        driver: 'openclaw',
        cdpPort: await nextCdpPort(cfg),
        color: nextColor(cfg),
      }

      await configRepo.save(cfg)

      // Create workspace directories
      await fsPort.mkdir(path.join(workspace, 'memory'))
      await fsPort.mkdir(path.join(home, '.openclaw', 'agents', params.id, 'sessions'))

      // Copy templates
      const templateDir = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..', 'templates',
      )
      for (const tpl of TEMPLATES) {
        const srcPath = path.join(templateDir, tpl)
        try {
          let content = await fsPort.readFile(srcPath)
          content = content.replaceAll('{{AGENT_NAME}}', params.name)
          content = content.replaceAll('{{AGENT_ID}}', params.id)
          await fsPort.writeFile(path.join(workspace, tpl), content)
        } catch {
          // template file may not exist in test env, skip
        }
      }
    },

    async removeAgent(id: string): Promise<void> {
      const cfg = await configRepo.load()

      delete cfg.models.providers[`nebula-${id}`]
      cfg.agents.list = cfg.agents.list.filter(a => a.id !== id)
      cfg.bindings = cfg.bindings.filter(b => b.agentId !== id)

      if (cfg.channels?.feishu?.accounts) {
        delete cfg.channels.feishu.accounts[id]
      }

      if (cfg.browser?.profiles) {
        delete cfg.browser.profiles[id]
      }

      await configRepo.save(cfg)
    },

    async editAgent(id: string, params: AgentEditParams): Promise<void> {
      const cfg = await configRepo.load()

      if (params.apiKey) {
        const provider = cfg.models.providers[`nebula-${id}`]
        if (provider) provider.apiKey = params.apiKey
        const agent = cfg.agents.list.find(a => a.id === id)
        if (agent?.memorySearch) {
          agent.memorySearch.remote.apiKey = params.apiKey
        }
      }

      if (params.modelId) {
        const agent = cfg.agents.list.find(a => a.id === id)
        if (agent) agent.model = `nebula-${id}/${params.modelId}`
      }

      if (params.feishuAppId) {
        const account = cfg.channels?.feishu?.accounts?.[id]
        if (account) account.appId = params.feishuAppId
      }

      if (params.feishuAppSecret) {
        const account = cfg.channels?.feishu?.accounts?.[id]
        if (account) account.appSecret = params.feishuAppSecret
      }

      await configRepo.save(cfg)
    },

    async listAgents(): Promise<AgentInfo[]> {
      const cfg = await configRepo.load()
      return cfg.agents.list.map(agent => {
        const modelId = agent.model.split('/').pop() ?? agent.model
        const binding = cfg.bindings.find(b => b.agentId === agent.id)
        return {
          id: agent.id,
          name: agent.name,
          model: modelId,
          channel: binding?.match.channel ?? '',
        }
      })
    },
  }
}

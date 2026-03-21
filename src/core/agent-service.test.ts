import { describe, it, expect, beforeEach } from 'vitest'
import { createAgentService } from './agent-service.js'
import type { ConfigRepo, ManagerConfigRepo, FsPort } from './ports.js'
import type { OpenClawConfig, ManagerConfig } from '../types.js'

function createMemConfigRepo(initial: OpenClawConfig): ConfigRepo & { data: OpenClawConfig } {
  const repo = {
    data: structuredClone(initial),
    async load() { return structuredClone(repo.data) },
    async save(cfg: OpenClawConfig) { repo.data = structuredClone(cfg) },
    async exists() { return true },
  }
  return repo
}

function createMemManagerConfigRepo(mode: 'standard' | 'sandbox'): ManagerConfigRepo {
  const cfg: ManagerConfig = { install_mode: mode, openclaw_version: '2026.3.13', installed_at: '' }
  return {
    async load() { return cfg },
    async save() {},
    async exists() { return true },
  }
}

function createMemFsPort(): FsPort & { dirs: string[]; files: Map<string, string> } {
  const port = {
    dirs: [] as string[],
    files: new Map<string, string>(),
    async mkdir(p: string) { port.dirs.push(p) },
    async copyFile(s: string, d: string) { port.files.set(d, s) },
    async readFile(p: string) { return port.files.get(p) ?? '' },
    async writeFile(p: string, c: string) { port.files.set(p, c) },
    async remove(p: string) { port.files.delete(p) },
    async exists(p: string) { return port.files.has(p) },
  }
  return port
}

const emptyConfig: OpenClawConfig = {
  models: { providers: {} },
  agents: { defaults: {}, list: [] },
  bindings: [],
  channels: { feishu: { enabled: true, accounts: {} } },
  browser: { enabled: true, profiles: {} },
  tools: {},
  commands: {},
  session: {},
  gateway: {},
  plugins: {},
}

describe('AgentService', () => {
  let configRepo: ReturnType<typeof createMemConfigRepo>
  let mgrRepo: ReturnType<typeof createMemManagerConfigRepo>
  let fsPort: ReturnType<typeof createMemFsPort>

  beforeEach(() => {
    configRepo = createMemConfigRepo(emptyConfig)
    mgrRepo = createMemManagerConfigRepo('standard')
    fsPort = createMemFsPort()
  })

  describe('isAgentIdDuplicate', () => {
    it('returns false for new ID', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      expect(await svc.isAgentIdDuplicate('alice')).toBe(false)
    })

    it('returns true for existing ID', async () => {
      configRepo.data.agents.list.push({ id: 'alice', name: 'Alice', workspace: '', model: '' })
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      expect(await svc.isAgentIdDuplicate('alice')).toBe(true)
    })
  })

  describe('isApiKeyDuplicate', () => {
    it('returns false for new key', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      expect(await svc.isApiKeyDuplicate('sk-new')).toBe(false)
    })

    it('returns true for existing key', async () => {
      configRepo.data.models.providers['nebula-alice'] = {
        baseUrl: '', apiKey: 'sk-existing', api: '', models: [],
      }
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      expect(await svc.isApiKeyDuplicate('sk-existing')).toBe(true)
    })
  })

  describe('isFeishuAppIdDuplicate', () => {
    it('returns true for existing app id', async () => {
      configRepo.data.channels = { feishu: { accounts: { alice: { appId: 'cli_123' } } } }
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      expect(await svc.isFeishuAppIdDuplicate('cli_123')).toBe(true)
    })
  })

  describe('addAgent', () => {
    it('adds provider with all 4 models', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({
        id: 'bob', name: 'Bob', apiKey: 'sk-key',
        modelId: 'claude-opus-4-5', feishuAppId: 'cli_x', feishuAppSecret: 'secret',
      })
      const cfg = configRepo.data
      expect(cfg.models.providers['nebula-bob']).toBeDefined()
      expect(cfg.models.providers['nebula-bob'].models).toHaveLength(4)
      expect(cfg.models.providers['nebula-bob'].apiKey).toBe('sk-key')
    })

    it('adds agent entry with memorySearch', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({
        id: 'bob', name: 'Bob', apiKey: 'sk-key',
        modelId: 'claude-opus-4-5', feishuAppId: 'cli_x', feishuAppSecret: 'secret',
      })
      const agent = configRepo.data.agents.list[0]
      expect(agent.id).toBe('bob')
      expect(agent.model).toBe('nebula-bob/claude-opus-4-5')
      expect(agent.memorySearch?.provider).toBe('gemini')
      expect(agent.memorySearch?.remote.apiKey).toBe('sk-key')
    })

    it('adds binding, feishu account, and browser profile', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({
        id: 'bob', name: 'Bob', apiKey: 'sk-key',
        modelId: 'claude-opus-4-5', feishuAppId: 'cli_x', feishuAppSecret: 'secret',
      })
      const cfg = configRepo.data
      expect(cfg.bindings[0].agentId).toBe('bob')
      expect(cfg.channels.feishu.accounts.bob.appId).toBe('cli_x')
      expect(cfg.browser.profiles.bob.cdpPort).toBe(18800)
      expect(cfg.browser.profiles.bob.color).toBe('#FF4500')
    })

    it('assigns incrementing CDP ports', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'a', name: 'A', apiKey: 'k1', modelId: 'claude-opus-4-5', feishuAppId: 'c1', feishuAppSecret: 's1' })
      await svc.addAgent({ id: 'b', name: 'B', apiKey: 'k2', modelId: 'claude-opus-4-5', feishuAppId: 'c2', feishuAppSecret: 's2' })
      expect(configRepo.data.browser.profiles.a.cdpPort).toBe(18800)
      expect(configRepo.data.browser.profiles.b.cdpPort).toBe(18801)
    })

    it('cycles colors', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      for (let i = 0; i < 9; i++) {
        await svc.addAgent({ id: `a${i}`, name: `A${i}`, apiKey: `k${i}`, modelId: 'claude-opus-4-5', feishuAppId: `c${i}`, feishuAppSecret: `s${i}` })
      }
      expect(configRepo.data.browser.profiles.a8.color).toBe('#FF4500')
    })

    it('creates workspace and sessions directories', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'bob', name: 'Bob', apiKey: 'k', modelId: 'claude-opus-4-5', feishuAppId: 'c', feishuAppSecret: 's' })
      expect(fsPort.dirs).toContain(`${process.env.HOME}/.openclaw/workspaces/bob/memory`)
      expect(fsPort.dirs).toContain(`${process.env.HOME}/.openclaw/agents/bob/sessions`)
    })
  })

  describe('removeAgent', () => {
    it('removes all agent artifacts from config', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'bob', name: 'Bob', apiKey: 'k', modelId: 'claude-opus-4-5', feishuAppId: 'c', feishuAppSecret: 's' })
      await svc.removeAgent('bob')
      const cfg = configRepo.data
      expect(cfg.models.providers['nebula-bob']).toBeUndefined()
      expect(cfg.agents.list).toHaveLength(0)
      expect(cfg.bindings).toHaveLength(0)
      expect(cfg.channels.feishu.accounts.bob).toBeUndefined()
      expect(cfg.browser.profiles.bob).toBeUndefined()
    })
  })

  describe('editAgent', () => {
    it('updates API key in provider and memorySearch', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'bob', name: 'Bob', apiKey: 'old', modelId: 'claude-opus-4-5', feishuAppId: 'c', feishuAppSecret: 's' })
      await svc.editAgent('bob', { apiKey: 'new-key' })
      expect(configRepo.data.models.providers['nebula-bob'].apiKey).toBe('new-key')
      expect(configRepo.data.agents.list[0].memorySearch?.remote.apiKey).toBe('new-key')
    })

    it('updates model in agent entry', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'bob', name: 'Bob', apiKey: 'k', modelId: 'claude-opus-4-5', feishuAppId: 'c', feishuAppSecret: 's' })
      await svc.editAgent('bob', { modelId: 'claude-sonnet-4-6' })
      expect(configRepo.data.agents.list[0].model).toBe('nebula-bob/claude-sonnet-4-6')
    })
  })

  describe('listAgents', () => {
    it('returns agent info with channel', async () => {
      const svc = createAgentService(configRepo, mgrRepo, fsPort)
      await svc.addAgent({ id: 'bob', name: 'Bob', apiKey: 'k', modelId: 'claude-opus-4-5', feishuAppId: 'c', feishuAppSecret: 's' })
      const list = await svc.listAgents()
      expect(list).toHaveLength(1)
      expect(list[0]).toEqual({ id: 'bob', name: 'Bob', model: 'claude-opus-4-5', channel: 'feishu' })
    })
  })
})

export interface ManagerConfig {
  install_mode: 'standard' | 'sandbox'
  openclaw_version: string
  installed_at: string
}

export interface InstallProgress {
  current_step: number
  mode: 'standard' | 'sandbox'
  updated_at: string
}

export interface OpenClawConfig {
  models: { providers: Record<string, ProviderEntry> }
  agents: { defaults: Record<string, any>; list: AgentEntry[] }
  bindings: BindingEntry[]
  channels: Record<string, any>
  browser: Record<string, any>
  tools: Record<string, any>
  commands: Record<string, any>
  session: Record<string, any>
  gateway: Record<string, any>
  plugins: Record<string, any>
  acp?: Record<string, any>
}

export interface ProviderEntry {
  baseUrl: string
  apiKey: string
  api: string
  models: ModelEntry[]
}

export interface ModelEntry {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  reasoning: boolean
  input: string[]
}

export interface AgentEntry {
  id: string
  name: string
  workspace: string
  model: string
  memorySearch?: {
    provider: string
    model: string
    remote: { baseUrl: string; apiKey: string }
    extraPaths: string[]
  }
}

export interface BindingEntry {
  agentId: string
  match: { channel: string; accountId: string }
}

export interface AgentAddParams {
  id: string
  name: string
  apiKey: string
  modelId: string
  feishuAppId: string
  feishuAppSecret: string
}

export interface AgentEditParams {
  apiKey?: string
  modelId?: string
  feishuAppId?: string
  feishuAppSecret?: string
}

export interface AgentInfo {
  id: string
  name: string
  model: string
  channel: string
}

export interface DepInfo {
  name: string
  binary: string
  versionArg: string
  installCmd: string
}

export interface SkillSpec {
  name: string
  kind: 'brew' | 'go' | 'env' | 'none'
  formula?: string
  binary?: string
  os?: 'darwin'
}

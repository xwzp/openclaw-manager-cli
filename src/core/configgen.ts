import { randomBytes } from 'crypto'
import type { OpenClawConfig, SkillSpec } from '../types.js'

export function generateAuthToken(): string {
  return randomBytes(24).toString('hex')
}

export function generateBaseConfig(): OpenClawConfig {
  return {
    models: { providers: {} },
    agents: {
      defaults: { thinkingDefault: 'high', elevatedDefault: 'full' },
      list: [],
    },
    bindings: [],
    commands: { native: 'auto', nativeSkills: 'auto', restart: true, ownerDisplay: 'raw' },
    session: { dmScope: 'per-channel-peer' },
    channels: { feishu: { enabled: true, accounts: { default: { dmPolicy: 'pairing' } } } },
    gateway: {
      port: 18789,
      mode: 'local',
      bind: 'loopback',
      auth: { mode: 'token', token: generateAuthToken() },
      tailscale: { mode: 'off', resetOnExit: false },
    },
    plugins: { entries: { feishu: { enabled: true } } },
    browser: {},
    tools: {},
  }
}

export function applyStandardMode(cfg: OpenClawConfig): void {
  cfg.tools = {
    profile: 'full',
    elevated: { enabled: true, allowFrom: { feishu: ['*'] } },
  }
  cfg.acp = {
    enabled: true,
    dispatch: { enabled: true },
    backend: 'acpx',
    defaultAgent: 'claude',
    allowedAgents: ['claude', 'codex', 'gemini'],
  }
  cfg.browser = { enabled: true, profiles: {} }
}

export function applySandboxMode(cfg: OpenClawConfig): void {
  cfg.agents.defaults.sandbox = {
    mode: 'all',
    workspaceAccess: 'rw',
    scope: 'agent',
    docker: {
      network: 'bridge',
      setupCommand: 'apt-get update && apt-get install -y curl git python3',
    },
    browser: { enabled: false, allowHostControl: true, autoStart: false },
  }
  cfg.tools = {
    profile: 'full',
    deny: ['gateway', 'nodes'],
    elevated: { enabled: false, allowFrom: { feishu: ['*'] } },
    fs: { workspaceOnly: true },
    sandbox: {
      tools: {
        allow: [
          'exec', 'process', 'read', 'write', 'edit', 'apply_patch',
          'sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn',
          'session_status', 'browser',
        ],
        deny: ['canvas', 'nodes', 'cron', 'gateway'],
      },
    },
  }
  cfg.browser = { enabled: true, profiles: {} }
}

export const DEFAULT_MODELS = [
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', contextWindow: 200_000, maxTokens: 64_000, reasoning: true, input: ['text', 'image'] },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', contextWindow: 1_000_000, maxTokens: 128_000, reasoning: true, input: ['text', 'image'] },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 1_000_000, maxTokens: 64_000, reasoning: true, input: ['text', 'image'] },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 1_000_000, maxTokens: 128_000, reasoning: true, input: ['text', 'image'] },
] as const

export const BROWSER_COLORS = [
  '#FF4500', '#00AA00', '#1E90FF', '#FF69B4',
  '#FFD700', '#9400D3', '#00CED1', '#8844FF',
]

export const STANDARD_SKILLS: SkillSpec[] = [
  { name: 'obsidian', kind: 'brew', formula: 'yakitrak/yakitrak/obsidian-cli', binary: 'obsidian-cli' },
  { name: 'notion', kind: 'env' },
  { name: 'apple-notes', kind: 'brew', formula: 'antoniorodr/memo/memo', binary: 'memo', os: 'darwin' },
  { name: 'bear-notes', kind: 'go', formula: 'github.com/tylerwince/grizzly/cmd/grizzly@latest', binary: 'grizzly', os: 'darwin' },
  { name: 'openai-whisper', kind: 'brew', formula: 'openai-whisper', binary: 'whisper' },
  { name: 'video-frames', kind: 'brew', formula: 'ffmpeg', binary: 'ffmpeg' },
  { name: 'camsnap', kind: 'brew', formula: 'steipete/tap/camsnap', binary: 'camsnap' },
  { name: 'gemini', kind: 'brew', formula: 'gemini-cli', binary: 'gemini' },
  { name: 'acp-router', kind: 'none' },
  { name: 'healthcheck', kind: 'none' },
  { name: 'session-logs', kind: 'brew', formula: 'jq', binary: 'jq' },
  { name: 'skill-creator', kind: 'none' },
  { name: 'things-mac', kind: 'go', formula: 'github.com/ossianhempel/things3-cli/cmd/things@latest', binary: 'things', os: 'darwin' },
  { name: 'apple-reminders', kind: 'brew', formula: 'steipete/tap/remindctl', binary: 'remindctl', os: 'darwin' },
]

export const SANDBOX_SKILLS: SkillSpec[] = [
  { name: 'openai-whisper', kind: 'brew', formula: 'openai-whisper', binary: 'whisper' },
  { name: 'video-frames', kind: 'brew', formula: 'ffmpeg', binary: 'ffmpeg' },
  { name: 'camsnap', kind: 'brew', formula: 'steipete/tap/camsnap', binary: 'camsnap' },
  { name: 'gemini', kind: 'brew', formula: 'gemini-cli', binary: 'gemini' },
  { name: 'session-logs', kind: 'brew', formula: 'jq', binary: 'jq' },
  { name: 'skill-creator', kind: 'none' },
]

export const DEFAULT_HOOKS = ['session-memory', 'command-logger', 'boot-md']

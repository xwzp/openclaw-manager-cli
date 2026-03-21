import { describe, it, expect } from 'vitest'
import { generateBaseConfig, applyStandardMode, applySandboxMode, generateAuthToken } from './configgen.js'

describe('generateAuthToken', () => {
  it('returns a 48-char hex string', () => {
    const token = generateAuthToken()
    expect(token).toHaveLength(48)
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('returns different values each call', () => {
    expect(generateAuthToken()).not.toBe(generateAuthToken())
  })
})

describe('generateBaseConfig', () => {
  it('creates config with empty providers and agents', () => {
    const cfg = generateBaseConfig()
    expect(cfg.models.providers).toEqual({})
    expect(cfg.agents.list).toEqual([])
    expect(cfg.agents.defaults.thinkingDefault).toBe('high')
    expect(cfg.agents.defaults.elevatedDefault).toBe('full')
  })

  it('sets gateway on port 18789', () => {
    const cfg = generateBaseConfig()
    expect(cfg.gateway.port).toBe(18789)
    expect(cfg.gateway.auth.mode).toBe('token')
    expect(cfg.gateway.auth.token).toHaveLength(48)
  })

  it('enables feishu channel', () => {
    const cfg = generateBaseConfig()
    expect(cfg.channels.feishu.enabled).toBe(true)
  })
})

describe('applyStandardMode', () => {
  it('sets tools profile full and ACP enabled', () => {
    const cfg = generateBaseConfig()
    applyStandardMode(cfg)
    expect(cfg.tools.profile).toBe('full')
    expect(cfg.acp?.enabled).toBe(true)
    expect(cfg.browser.enabled).toBe(true)
  })
})

describe('applySandboxMode', () => {
  it('sets sandbox defaults with docker config', () => {
    const cfg = generateBaseConfig()
    applySandboxMode(cfg)
    expect(cfg.agents.defaults.sandbox.mode).toBe('all')
    expect(cfg.agents.defaults.sandbox.docker.network).toBe('bridge')
    expect(cfg.tools.deny).toContain('gateway')
    expect(cfg.tools.fs.workspaceOnly).toBe(true)
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import {
  createFsConfigRepo,
  createFsManagerConfigRepo,
  createFsInstallProgressRepo,
} from './fs-config-repo.js'
import type { OpenClawConfig, ManagerConfig } from '../types.js'

const minimalConfig: OpenClawConfig = {
  models: { providers: {} },
  agents: { defaults: {}, list: [] },
  bindings: [],
  channels: {},
  browser: {},
  tools: {},
  commands: {},
  session: {},
  gateway: {},
  plugins: {},
}

describe('FsConfigRepo', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'ocm-cfg-'))
  })
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('save and load roundtrip', async () => {
    const repo = createFsConfigRepo(path.join(testDir, 'openclaw.json'))
    await repo.save(minimalConfig)
    const loaded = await repo.load()
    expect(loaded).toEqual(minimalConfig)
  })

  it('save creates .bak of existing file', async () => {
    const filePath = path.join(testDir, 'openclaw.json')
    const repo = createFsConfigRepo(filePath)
    await repo.save(minimalConfig)
    const updated = { ...minimalConfig, browser: { enabled: true } }
    await repo.save(updated)
    const backup = JSON.parse(await readFile(filePath + '.bak', 'utf-8'))
    expect(backup).toEqual(minimalConfig)
  })

  it('exists returns false when no file', async () => {
    const repo = createFsConfigRepo(path.join(testDir, 'nope.json'))
    expect(await repo.exists()).toBe(false)
  })

  it('load throws on missing file', async () => {
    const repo = createFsConfigRepo(path.join(testDir, 'nope.json'))
    await expect(repo.load()).rejects.toThrow()
  })

  it('load throws on malformed JSON', async () => {
    const filePath = path.join(testDir, 'bad.json')
    await writeFile(filePath, '{not json', 'utf-8')
    const repo = createFsConfigRepo(filePath)
    await expect(repo.load()).rejects.toThrow()
  })
})

describe('FsManagerConfigRepo', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'ocm-mgr-'))
  })
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('save and load roundtrip', async () => {
    const repo = createFsManagerConfigRepo(path.join(testDir, 'config.json'))
    const cfg: ManagerConfig = {
      install_mode: 'standard',
      openclaw_version: '2026.3.13',
      installed_at: '2026-03-21T00:00:00Z',
    }
    await repo.save(cfg)
    expect(await repo.load()).toEqual(cfg)
  })
})

describe('FsInstallProgressRepo', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'ocm-prog-'))
  })
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('returns null when no progress file', async () => {
    const repo = createFsInstallProgressRepo(path.join(testDir, 'progress.json'))
    expect(await repo.load()).toBeNull()
  })

  it('save and load roundtrip', async () => {
    const repo = createFsInstallProgressRepo(path.join(testDir, 'progress.json'))
    const progress = { current_step: 3, mode: 'sandbox' as const, updated_at: '2026-03-21T00:00:00Z' }
    await repo.save(progress)
    expect(await repo.load()).toEqual(progress)
  })

  it('remove deletes the file', async () => {
    const filePath = path.join(testDir, 'progress.json')
    const repo = createFsInstallProgressRepo(filePath)
    await repo.save({ current_step: 1, mode: 'standard', updated_at: '' })
    await repo.remove()
    expect(await repo.load()).toBeNull()
  })
})

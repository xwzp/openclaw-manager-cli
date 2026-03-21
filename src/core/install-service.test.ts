import { describe, it, expect } from 'vitest'
import { createInstallService } from './install-service.js'
import type { ConfigRepo, ManagerConfigRepo, InstallProgressRepo, ShellPort, FsPort } from './ports.js'

function createMockShell(): ShellPort & { calls: string[] } {
  const mock = {
    calls: [] as string[],
    async exec(cmd: string) {
      mock.calls.push(cmd)
      return { stdout: '', stderr: '', code: 0 }
    },
  }
  return mock
}

function createMockConfigRepo(): ConfigRepo {
  let data: any = null
  return {
    async load() { return data },
    async save(cfg) { data = cfg },
    async exists() { return data !== null },
  }
}

function createMockManagerConfigRepo(): ManagerConfigRepo {
  let data: any = null
  return {
    async load() { return data },
    async save(cfg) { data = cfg },
    async exists() { return data !== null },
  }
}

function createMockProgressRepo(): InstallProgressRepo & { data: any; removed: boolean } {
  const mock = {
    data: null as any,
    removed: false,
    async load() { return mock.data },
    async save(p: any) { mock.data = p },
    async remove() { mock.removed = true; mock.data = null },
  }
  return mock
}

function createMockFsPort(): FsPort {
  return {
    async mkdir() {},
    async copyFile() {},
    async readFile() { return '' },
    async writeFile() {},
    async remove() {},
    async exists() { return false },
  }
}

describe('InstallService', () => {
  it('standard mode skips sandbox build step', () => {
    const svc = createInstallService(
      createMockShell(), createMockConfigRepo(), createMockManagerConfigRepo(),
      createMockProgressRepo(), createMockFsPort(),
    )
    const steps = svc.getSteps('standard')
    const stepNames = steps.map(s => s.name)
    expect(stepNames).not.toContain('sandbox-build')
  })

  it('sandbox mode includes sandbox build step', () => {
    const svc = createInstallService(
      createMockShell(), createMockConfigRepo(), createMockManagerConfigRepo(),
      createMockProgressRepo(), createMockFsPort(),
    )
    const steps = svc.getSteps('sandbox')
    const stepNames = steps.map(s => s.name)
    expect(stepNames).toContain('sandbox-build')
  })

  it('step order is correct', () => {
    const svc = createInstallService(
      createMockShell(), createMockConfigRepo(), createMockManagerConfigRepo(),
      createMockProgressRepo(), createMockFsPort(),
    )
    const steps = svc.getSteps('sandbox')
    const names = steps.map(s => s.name)
    expect(names.indexOf('deps')).toBeLessThan(names.indexOf('onboard'))
    expect(names.indexOf('onboard')).toBeLessThan(names.indexOf('doctor'))
    expect(names.indexOf('doctor')).toBeLessThan(names.indexOf('config'))
    expect(names.indexOf('config')).toBeLessThan(names.indexOf('sandbox-build'))
    expect(names.indexOf('sandbox-build')).toBeLessThan(names.indexOf('skills'))
  })

  it('resume skips completed steps', () => {
    const svc = createInstallService(
      createMockShell(), createMockConfigRepo(), createMockManagerConfigRepo(),
      createMockProgressRepo(), createMockFsPort(),
    )
    const steps = svc.getSteps('standard')
    const remaining = svc.getStepsFromProgress(steps, { current_step: 2, mode: 'standard', updated_at: '' })
    expect(remaining[0].name).toBe(steps[2].name)
  })

  it('onboard step runs correct command', async () => {
    const shell = createMockShell()
    const svc = createInstallService(
      shell, createMockConfigRepo(), createMockManagerConfigRepo(),
      createMockProgressRepo(), createMockFsPort(),
    )
    const steps = svc.getSteps('standard')
    const onboardStep = steps.find(s => s.name === 'onboard')!
    await onboardStep.run('standard')
    expect(shell.calls.some(c => c.includes('openclaw onboard --non-interactive'))).toBe(true)
  })

  it('progress is removed on completion', async () => {
    const progressRepo = createMockProgressRepo()
    const svc = createInstallService(
      createMockShell(), createMockConfigRepo(), createMockManagerConfigRepo(),
      progressRepo, createMockFsPort(),
    )
    await svc.completeInstall()
    expect(progressRepo.removed).toBe(true)
  })
})

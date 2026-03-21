import { describe, it, expect } from 'vitest'
import { createUninstallService, UNINSTALL_COMPONENTS } from './uninstall-service.js'
import type { ShellPort, FsPort } from './ports.js'

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

function createMockFsPort(): FsPort & { removed: string[] } {
  const mock = {
    removed: [] as string[],
    async mkdir() {},
    async copyFile() {},
    async readFile() { return '' },
    async writeFile() {},
    async remove(p: string) { mock.removed.push(p) },
    async exists() { return true },
  }
  return mock
}

describe('UninstallService', () => {
  it('UNINSTALL_COMPONENTS has 4 items', () => {
    expect(UNINSTALL_COMPONENTS).toHaveLength(4)
  })

  it('stopGateway runs openclaw gateway stop', async () => {
    const shell = createMockShell()
    const svc = createUninstallService(shell, createMockFsPort())
    await svc.stopGateway()
    expect(shell.calls).toContain('openclaw gateway stop')
  })

  it('uninstallNpm runs npm uninstall', async () => {
    const shell = createMockShell()
    const svc = createUninstallService(shell, createMockFsPort())
    await svc.uninstallComponent('openclaw-npm')
    expect(shell.calls).toContain('npm uninstall -g openclaw')
  })

  it('uninstallDocker removes containers and images', async () => {
    const shell = createMockShell()
    const svc = createUninstallService(shell, createMockFsPort())
    await svc.uninstallComponent('sandbox-docker')
    expect(shell.calls.some(c => c.includes('docker'))).toBe(true)
  })

  it('uninstall openclaw-dir removes ~/.openclaw', async () => {
    const fsPort = createMockFsPort()
    const svc = createUninstallService(createMockShell(), fsPort)
    await svc.uninstallComponent('openclaw-dir')
    expect(fsPort.removed.some(p => p.endsWith('.openclaw'))).toBe(true)
  })

  it('uninstall manager-config removes ~/.config/openclaw-manager', async () => {
    const fsPort = createMockFsPort()
    const svc = createUninstallService(createMockShell(), fsPort)
    await svc.uninstallComponent('manager-config')
    expect(fsPort.removed.some(p => p.endsWith('openclaw-manager'))).toBe(true)
  })
})

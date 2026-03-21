import { describe, it, expect } from 'vitest'
import { createDepService, KNOWN_DEPS } from './dep-service.js'
import type { ShellPort } from './ports.js'

function createMockShell(results: Record<string, number>): ShellPort {
  return {
    async exec(cmd) {
      const code = results[cmd] ?? 1
      return { stdout: '', stderr: '', code }
    },
  }
}

describe('DepService', () => {
  it('checkDep returns installed when binary found', async () => {
    const shell = createMockShell({ 'which brew': 0, 'brew --version': 0 })
    const svc = createDepService(shell)
    const result = await svc.checkDep(KNOWN_DEPS[0])
    expect(result.installed).toBe(true)
  })

  it('checkDep returns not installed when binary missing', async () => {
    const shell = createMockShell({ 'which brew': 1 })
    const svc = createDepService(shell)
    const result = await svc.checkDep(KNOWN_DEPS[0])
    expect(result.installed).toBe(false)
  })

  it('installDep runs the install command', async () => {
    const calls: string[] = []
    const shell: ShellPort = {
      async exec(cmd) {
        calls.push(cmd)
        return { stdout: '', stderr: '', code: 0 }
      },
    }
    const svc = createDepService(shell)
    await svc.installDep(KNOWN_DEPS[2]) // mise
    expect(calls).toContain('brew install mise')
  })

  it('installDep throws on failure', async () => {
    const shell = createMockShell({})
    const svc = createDepService(shell)
    await expect(svc.installDep(KNOWN_DEPS[2])).rejects.toThrow()
  })

  it('getOrderedDeps returns deps in correct order for standard mode', () => {
    const svc = createDepService(createMockShell({}))
    const deps = svc.getOrderedDeps('standard')
    const names = deps.map(d => d.name)
    expect(names).toEqual(['Homebrew', 'mise', 'Node.js', 'fzf', 'OpenClaw'])
  })

  it('getOrderedDeps includes Docker for sandbox mode', () => {
    const svc = createDepService(createMockShell({}))
    const deps = svc.getOrderedDeps('sandbox')
    const names = deps.map(d => d.name)
    expect(names).toEqual(['Homebrew', 'Docker', 'mise', 'Node.js', 'fzf', 'OpenClaw'])
  })
})

import { describe, it, expect } from 'vitest'
import { createSkillService } from './skill-service.js'
import type { ShellPort } from './ports.js'

describe('SkillService', () => {
  it('installs brew dependency before enabling skill', async () => {
    const calls: string[] = []
    const shell: ShellPort = {
      async exec(cmd) {
        calls.push(cmd)
        if (cmd === 'which whisper') return { stdout: '', stderr: '', code: 1 }
        return { stdout: '', stderr: '', code: 0 }
      },
    }
    const svc = createSkillService(shell)
    await svc.enableSkill({ name: 'openai-whisper', kind: 'brew', formula: 'openai-whisper', binary: 'whisper' })
    expect(calls).toContain('brew install openai-whisper')
    expect(calls).toContain('openclaw skills enable openai-whisper')
  })

  it('skips install if binary already exists', async () => {
    const calls: string[] = []
    const shell: ShellPort = {
      async exec(cmd) {
        calls.push(cmd)
        return { stdout: '', stderr: '', code: 0 }
      },
    }
    const svc = createSkillService(shell)
    await svc.enableSkill({ name: 'openai-whisper', kind: 'brew', formula: 'openai-whisper', binary: 'whisper' })
    expect(calls).not.toContain('brew install openai-whisper')
    expect(calls).toContain('openclaw skills enable openai-whisper')
  })

  it('enables hook via openclaw hooks enable', async () => {
    const calls: string[] = []
    const shell: ShellPort = {
      async exec(cmd) { calls.push(cmd); return { stdout: '', stderr: '', code: 0 } },
    }
    const svc = createSkillService(shell)
    await svc.enableHook('session-memory')
    expect(calls).toContain('openclaw hooks enable session-memory')
  })

  it('skill with kind=none skips dependency install', async () => {
    const calls: string[] = []
    const shell: ShellPort = {
      async exec(cmd) { calls.push(cmd); return { stdout: '', stderr: '', code: 0 } },
    }
    const svc = createSkillService(shell)
    await svc.enableSkill({ name: 'acp-router', kind: 'none' })
    expect(calls).toEqual(['openclaw skills enable acp-router'])
  })
})

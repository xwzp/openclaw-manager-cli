import type { ShellPort } from './ports.js'
import type { SkillSpec } from '../types.js'

export function createSkillService(shell: ShellPort) {
  async function installDependency(spec: SkillSpec): Promise<void> {
    if (spec.kind === 'none' || spec.kind === 'env') return

    if (spec.binary) {
      const check = await shell.exec(`which ${spec.binary}`)
      if (check.code === 0) return
    }

    if (spec.kind === 'brew' && spec.formula) {
      await shell.exec(`brew install ${spec.formula}`, { timeout: 300_000 })
    } else if (spec.kind === 'go' && spec.formula) {
      await shell.exec(`go install ${spec.formula}`, { timeout: 300_000 })
    }
  }

  return {
    async enableSkill(spec: SkillSpec): Promise<void> {
      await installDependency(spec)
      await shell.exec(`openclaw skills enable ${spec.name}`)
    },

    async enableHook(name: string): Promise<void> {
      await shell.exec(`openclaw hooks enable ${name}`)
    },
  }
}

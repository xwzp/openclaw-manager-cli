import type { ShellPort } from './ports.js'
import type { DepInfo } from '../types.js'

export const KNOWN_DEPS: DepInfo[] = [
  { name: 'Homebrew', binary: 'brew', versionArg: '--version', installCmd: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
  { name: 'Docker', binary: 'docker', versionArg: '--version', installCmd: 'brew install --cask docker' },
  { name: 'mise', binary: 'mise', versionArg: '--version', installCmd: 'brew install mise' },
  { name: 'Node.js', binary: 'node', versionArg: '--version', installCmd: 'mise install node@25 && mise use -g node@25' },
  { name: 'fzf', binary: 'fzf', versionArg: '--version', installCmd: 'brew install fzf' },
  { name: 'OpenClaw', binary: 'openclaw', versionArg: '--version', installCmd: 'npm install -g openclaw@latest' },
]

export function createDepService(shell: ShellPort) {
  return {
    async checkDep(dep: DepInfo): Promise<{ installed: boolean; version?: string }> {
      const result = await shell.exec(`which ${dep.binary}`)
      if (result.code !== 0) return { installed: false }
      const versionResult = await shell.exec(`${dep.binary} ${dep.versionArg}`)
      return { installed: true, version: versionResult.stdout }
    },

    async installDep(dep: DepInfo): Promise<void> {
      const result = await shell.exec(dep.installCmd, { timeout: 600_000 })
      if (result.code !== 0) {
        throw new Error(`Failed to install ${dep.name}: ${result.stderr}`)
      }
    },

    getOrderedDeps(mode: 'standard' | 'sandbox'): DepInfo[] {
      const deps: DepInfo[] = [KNOWN_DEPS[0]] // Homebrew
      if (mode === 'sandbox') deps.push(KNOWN_DEPS[1]) // Docker
      deps.push(KNOWN_DEPS[2]) // mise
      deps.push(KNOWN_DEPS[3]) // Node.js
      deps.push(KNOWN_DEPS[4]) // fzf
      deps.push(KNOWN_DEPS[5]) // OpenClaw
      return deps
    },
  }
}

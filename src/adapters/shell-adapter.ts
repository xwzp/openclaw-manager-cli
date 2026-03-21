import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import type { ShellPort } from '../core/ports.js'

const execAsync = promisify(execCb)

export function createShellAdapter(): ShellPort {
  return {
    async exec(cmd, opts) {
      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: opts?.cwd,
          timeout: opts?.timeout,
          shell: '/bin/bash',
          env: { ...process.env, PATH: process.env.PATH },
        })
        return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 }
      } catch (error: any) {
        return {
          stdout: (error.stdout ?? '').trim(),
          stderr: (error.stderr ?? '').trim(),
          code: error.code ?? 1,
        }
      }
    },
  }
}

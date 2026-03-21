import type { ConfigRepo, ManagerConfigRepo, InstallProgressRepo, ShellPort, FsPort } from './ports.js'
import type { InstallProgress } from '../types.js'
import { generateBaseConfig, applyStandardMode, applySandboxMode, STANDARD_SKILLS, SANDBOX_SKILLS, DEFAULT_HOOKS } from './configgen.js'
import { createDepService } from './dep-service.js'
import { createSkillService } from './skill-service.js'

export interface InstallStep {
  name: string
  label: string
  run: (mode: 'standard' | 'sandbox') => Promise<void>
}

export function createInstallService(
  shell: ShellPort,
  configRepo: ConfigRepo,
  mgrConfigRepo: ManagerConfigRepo,
  progressRepo: InstallProgressRepo,
  _fsPort: FsPort,
) {
  const depService = createDepService(shell)
  const skillService = createSkillService(shell)

  function getSteps(mode: 'standard' | 'sandbox'): InstallStep[] {
    const steps: InstallStep[] = [
      {
        name: 'deps',
        label: '检测并安装依赖',
        async run(m) {
          const deps = depService.getOrderedDeps(m)
          for (const dep of deps) {
            const result = await depService.checkDep(dep)
            if (!result.installed) {
              await depService.installDep(dep)
            }
          }
        },
      },
      {
        name: 'onboard',
        label: '初始化 OpenClaw',
        async run() {
          const cmd = [
            'openclaw onboard --non-interactive',
            '--mode local',
            '--auth-choice skip',
            '--flow quickstart',
            '--gateway-port 18789',
            '--gateway-bind loopback',
            '--gateway-auth token',
            '--install-daemon',
            '--skip-channels --skip-skills --skip-search --skip-health',
            '--accept-risk',
          ].join(' ')
          const result = await shell.exec(cmd, { timeout: 120_000 })
          if (result.code !== 0) throw new Error(`onboard failed: ${result.stderr}`)
        },
      },
      {
        name: 'doctor',
        label: '运行 openclaw doctor',
        async run() {
          const result = await shell.exec('openclaw doctor --yes', { timeout: 60_000 })
          if (result.code !== 0) throw new Error(`doctor failed: ${result.stderr}`)
        },
      },
      {
        name: 'config',
        label: '生成配置文件',
        async run(m) {
          const cfg = generateBaseConfig()
          if (m === 'standard') applyStandardMode(cfg)
          else applySandboxMode(cfg)
          await configRepo.save(cfg)
        },
      },
    ]

    if (mode === 'sandbox') {
      steps.push({
        name: 'sandbox-build',
        label: '构建沙箱镜像',
        async run() {
          const home = process.env.HOME ?? ''
          const srcDir = `${home}/.openclaw/src/openclaw`
          await shell.exec(
            `git clone --depth 1 https://github.com/openclaw/openclaw.git ${srcDir}`,
            { timeout: 300_000 },
          )
          await shell.exec(
            'git checkout 61d171ab0b2fe4abc9afe89c518586274b4b76c2',
            { cwd: srcDir },
          )
          const result = await shell.exec('bash scripts/sandbox-setup.sh', {
            cwd: srcDir,
            timeout: 600_000,
          })
          if (result.code !== 0) throw new Error(`Sandbox build failed: ${result.stderr}`)
        },
      })
    }

    steps.push({
      name: 'skills',
      label: '启用 Skills 和 Hooks',
      async run(m) {
        const skills = m === 'standard' ? STANDARD_SKILLS : SANDBOX_SKILLS
        for (const skill of skills) {
          await skillService.enableSkill(skill)
        }
        for (const hook of DEFAULT_HOOKS) {
          await skillService.enableHook(hook)
        }
      },
    })

    steps.push({
      name: 'save-config',
      label: '保存安装配置',
      async run(m) {
        await mgrConfigRepo.save({
          install_mode: m,
          openclaw_version: 'latest',
          installed_at: new Date().toISOString(),
        })
      },
    })

    return steps
  }

  return {
    getSteps,

    getStepsFromProgress(steps: InstallStep[], progress: InstallProgress | null): InstallStep[] {
      if (!progress) return steps
      return steps.slice(progress.current_step)
    },

    async saveProgress(stepIndex: number, mode: 'standard' | 'sandbox'): Promise<void> {
      await progressRepo.save({
        current_step: stepIndex + 1,
        mode,
        updated_at: new Date().toISOString(),
      })
    },

    async loadProgress(): Promise<InstallProgress | null> {
      return progressRepo.load()
    },

    async completeInstall(): Promise<void> {
      await progressRepo.remove()
    },
  }
}

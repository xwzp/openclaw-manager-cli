import { select, confirm } from '@inquirer/prompts'
import ora from 'ora'
import { homedir } from 'os'
import path from 'path'
import { log } from '../utils/logger.js'
import { createShellAdapter } from '../adapters/shell-adapter.js'
import { createFsAdapter } from '../adapters/fs-adapter.js'
import { createFsConfigRepo, createFsManagerConfigRepo, createFsInstallProgressRepo } from '../adapters/fs-config-repo.js'
import { createInstallService } from '../core/install-service.js'
import { createDepService } from '../core/dep-service.js'
import { createSkillService } from '../core/skill-service.js'
import { STANDARD_SKILLS, SANDBOX_SKILLS, DEFAULT_HOOKS } from '../core/configgen.js'

export async function installCommand(options: { mode?: string }) {
  const home = homedir()

  // Pre-check: if ~/.openclaw already exists (and not a resume), block install
  const fsPort = createFsAdapter()
  const openclawDir = path.join(home, '.openclaw')
  const progressFile = path.join(home, '.config', 'openclaw-manager', 'install-progress.json')
  if (await fsPort.exists(openclawDir) && !(await fsPort.exists(progressFile))) {
    log.error('检测到 ~/.openclaw 已存在，请先运行 uninstall 卸载后再安装')
    process.exit(1)
  }

  // Resolve mode
  let mode: 'standard' | 'sandbox'
  if (options.mode) {
    mode = options.mode === 'std' ? 'standard' : options.mode as 'standard' | 'sandbox'
  } else {
    mode = await select({
      message: '选择安装模式',
      choices: [
        { name: '标准模式 (Standard)', value: 'standard' as const },
        { name: '沙箱模式 (Sandbox)', value: 'sandbox' as const },
      ],
    })
  }

  // Create adapters and service
  const shell = createShellAdapter()
  const configRepo = createFsConfigRepo(path.join(home, '.openclaw', 'openclaw.json'))
  const mgrConfigRepo = createFsManagerConfigRepo(
    path.join(home, '.config', 'openclaw-manager', 'config.json'),
  )
  const progressRepo = createFsInstallProgressRepo(
    path.join(home, '.config', 'openclaw-manager', 'install-progress.json'),
  )
  const installService = createInstallService(shell, configRepo, mgrConfigRepo, progressRepo, fsPort)
  const depService = createDepService(shell)
  const skillService = createSkillService(shell)

  // Check for resume
  const existingProgress = await installService.loadProgress()
  let startFromStep = 0
  if (existingProgress) {
    const shouldResume = await confirm({
      message: `发现未完成的安装 (${existingProgress.mode} 模式, 步骤 ${existingProgress.current_step})，是否继续？`,
      default: true,
    })
    if (shouldResume) {
      mode = existingProgress.mode
      startFromStep = existingProgress.current_step
    }
  }

  const allSteps = installService.getSteps(mode)
  const progress = startFromStep > 0 ? { current_step: startFromStep, mode, updated_at: '' } : null
  const steps = installService.getStepsFromProgress(allSteps, progress)

  log.info(`开始${mode === 'standard' ? '标准' : '沙箱'}模式安装...`)
  console.log()

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const globalIndex = startFromStep + i
    const stepPrefix = `[${globalIndex + 1}/${allSteps.length}]`

    try {
      if (step.name === 'deps') {
        // Deps step: show per-dependency status
        console.log(`${stepPrefix} ${step.label}`)
        const deps = depService.getOrderedDeps(mode)
        for (const dep of deps) {
          const spinner = ora(`  ${dep.name}...`).start()
          const result = await depService.checkDep(dep)
          if (result.installed) {
            spinner.succeed(`  ${dep.name} 已安装${result.version ? ` (${result.version.split('\n')[0]})` : ''}`)
          } else {
            spinner.text = `  正在安装 ${dep.name}...`
            await depService.installDep(dep)
            spinner.succeed(`  ${dep.name} 安装完成`)
          }
        }
      } else if (step.name === 'skills') {
        // Skills step: show per-skill and per-hook status
        const skills = mode === 'standard' ? STANDARD_SKILLS : SANDBOX_SKILLS
        console.log(`${stepPrefix} ${step.label}`)
        for (const skill of skills) {
          const spinner = ora(`  [Skill] ${skill.name}${skill.kind !== 'none' ? ` (${skill.kind}: ${skill.formula ?? ''})` : ''}`).start()
          await skillService.enableSkill(skill)
          spinner.succeed(`  [Skill] ${skill.name}`)
        }
        for (const hook of DEFAULT_HOOKS) {
          const spinner = ora(`  [Hook] ${hook}`).start()
          await skillService.enableHook(hook)
          spinner.succeed(`  [Hook] ${hook}`)
        }
      } else {
        // Normal step: single spinner
        const spinner = ora(`${stepPrefix} ${step.label}`).start()
        await step.run(mode)
        spinner.succeed(`${stepPrefix} ${step.label}`)
      }
      await installService.saveProgress(globalIndex, mode)
    } catch (error: any) {
      log.error(error.message)
      log.info('可以重新运行 install 命令从断点继续')
      process.exit(1)
    }
  }

  await installService.completeInstall()
  console.log()
  log.success('安装完成！')
  log.info('运行 openclaw-manager-cli agent 添加你的第一个 Agent')
}

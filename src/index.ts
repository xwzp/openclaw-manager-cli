import { Command } from 'commander'
import { ExitPromptError } from '@inquirer/core'
import { installCommand } from './commands/install.js'
import { uninstallCommand } from './commands/uninstall.js'
import { agentCommand } from './commands/agent.js'

const program = new Command()

program
  .name('openclaw-manager-cli')
  .description('CLI tool for managing OpenClaw installation and agents')
  .version('0.1.0')

program
  .command('install')
  .description('安装 OpenClaw 及依赖')
  .option('--mode <mode>', '安装模式: std 或 sandbox')
  .action(installCommand)

program
  .command('uninstall')
  .description('卸载 OpenClaw 组件')
  .option('--all', '卸载所有组件')
  .action(uninstallCommand)

program
  .command('agent')
  .description('管理 Agent (添加/删除/编辑)')
  .action(agentCommand)

program.parseAsync().catch((err) => {
  if (err instanceof ExitPromptError) {
    process.exit(0)
  }
  console.error(err)
  process.exit(1)
})

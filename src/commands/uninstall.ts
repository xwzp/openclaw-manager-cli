import { checkbox, confirm } from '@inquirer/prompts'
import ora from 'ora'
import { log } from '../utils/logger.js'
import { createShellAdapter } from '../adapters/shell-adapter.js'
import { createFsAdapter } from '../adapters/fs-adapter.js'
import { createUninstallService, UNINSTALL_COMPONENTS } from '../core/uninstall-service.js'

export async function uninstallCommand(options: { all?: boolean }) {
  const shell = createShellAdapter()
  const fsPort = createFsAdapter()
  const svc = createUninstallService(shell, fsPort)

  let selectedIds: string[]

  if (options.all) {
    selectedIds = UNINSTALL_COMPONENTS.map(c => c.id)
  } else {
    selectedIds = await checkbox({
      message: '选择要卸载的组件 (空格选择, a 全选, 回车确认)',
      choices: UNINSTALL_COMPONENTS.map(c => ({
        name: c.label,
        value: c.id,
      })),
    })

    if (selectedIds.length === 0) {
      log.info('未选择任何组件，取消卸载')
      return
    }
  }

  // Show what will be removed
  console.log()
  log.info('将要卸载:')
  for (const id of selectedIds) {
    const comp = UNINSTALL_COMPONENTS.find(c => c.id === id)!
    console.log(`  - ${comp.label}`)
  }
  console.log()

  if (!options.all) {
    const confirmed = await confirm({
      message: '确认删除以上选中的组件？',
      default: false,
    })
    if (!confirmed) {
      log.info('取消卸载')
      return
    }
  }

  // Stop gateway first
  const gwSpinner = ora('停止 Gateway...').start()
  try {
    await svc.stopGateway()
    gwSpinner.succeed('Gateway 已停止')
  } catch {
    gwSpinner.warn('Gateway 停止失败（可能未运行）')
  }

  // Execute uninstall
  for (const id of selectedIds) {
    const comp = UNINSTALL_COMPONENTS.find(c => c.id === id)!
    const spinner = ora(`卸载 ${comp.label}...`).start()
    try {
      await svc.uninstallComponent(id)
      spinner.succeed(`${comp.label} 已卸载`)
    } catch (error: any) {
      spinner.warn(`${comp.label} 卸载失败: ${error.message}`)
    }
  }

  console.log()
  log.success('卸载完成')
}

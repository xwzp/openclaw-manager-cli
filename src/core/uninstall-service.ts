import { homedir } from 'os'
import path from 'path'
import type { ShellPort, FsPort } from './ports.js'

export interface UninstallComponent {
  id: string
  label: string
}

export const UNINSTALL_COMPONENTS: UninstallComponent[] = [
  { id: 'openclaw-npm', label: 'OpenClaw npm 包' },
  { id: 'sandbox-docker', label: 'Sandbox 镜像和容器' },
  { id: 'launchagent', label: '自动提交 LaunchAgent' },
  { id: 'openclaw-dir', label: '~/.openclaw 目录' },
  { id: 'manager-config', label: '~/.config/openclaw-manager 目录' },
]

export function createUninstallService(shell: ShellPort, fsPort: FsPort) {
  const home = homedir()

  return {
    async stopGateway(): Promise<void> {
      await shell.exec('openclaw gateway stop')
    },

    async uninstallComponent(id: string): Promise<void> {
      switch (id) {
        case 'openclaw-npm':
          await shell.exec('npm uninstall -g openclaw')
          break
        case 'sandbox-docker':
          await shell.exec('docker ps -a --filter "name=openclaw" -q | xargs docker rm -f 2>/dev/null')
          await shell.exec('docker images --filter "reference=*openclaw*" -q | xargs docker rmi -f 2>/dev/null')
          break
        case 'launchagent': {
          const plist = path.join(home, 'Library', 'LaunchAgents', 'com.openclaw.autocommit.plist')
          await shell.exec(`launchctl unload "${plist}" 2>/dev/null`)
          await fsPort.remove(plist)
          break
        }
        case 'openclaw-dir':
          await fsPort.remove(path.join(home, '.openclaw'))
          break
        case 'manager-config':
          await fsPort.remove(path.join(home, '.config', 'openclaw-manager'))
          break
      }
    },
  }
}

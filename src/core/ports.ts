import type { OpenClawConfig, ManagerConfig, InstallProgress } from '../types.js'

export interface ConfigRepo {
  load(): Promise<OpenClawConfig>
  save(config: OpenClawConfig): Promise<void>
  exists(): Promise<boolean>
}

export interface ManagerConfigRepo {
  load(): Promise<ManagerConfig>
  save(config: ManagerConfig): Promise<void>
  exists(): Promise<boolean>
}

export interface InstallProgressRepo {
  load(): Promise<InstallProgress | null>
  save(progress: InstallProgress): Promise<void>
  remove(): Promise<void>
}

export interface ShellPort {
  exec(cmd: string, opts?: { cwd?: string; timeout?: number }): Promise<{
    stdout: string
    stderr: string
    code: number
  }>
}

export interface FsPort {
  mkdir(path: string): Promise<void>
  copyFile(src: string, dest: string): Promise<void>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  remove(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

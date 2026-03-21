import * as fs from 'fs/promises'
import * as path from 'path'
import type { ConfigRepo, ManagerConfigRepo, InstallProgressRepo } from '../core/ports.js'
import type { OpenClawConfig, ManagerConfig, InstallProgress } from '../types.js'

export function createFsConfigRepo(filePath: string): ConfigRepo {
  return {
    async load() {
      const raw = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as OpenClawConfig
    },
    async save(config) {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      try {
        await fs.access(filePath)
        await fs.copyFile(filePath, filePath + '.bak')
      } catch {
        // no existing file to back up
      }
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
    },
    async exists() {
      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    },
  }
}

export function createFsManagerConfigRepo(filePath: string): ManagerConfigRepo {
  return {
    async load() {
      const raw = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as ManagerConfig
    },
    async save(config) {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
    },
    async exists() {
      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    },
  }
}

export function createFsInstallProgressRepo(filePath: string): InstallProgressRepo {
  return {
    async load() {
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(raw) as InstallProgress
      } catch {
        return null
      }
    },
    async save(progress) {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf-8')
    },
    async remove() {
      try {
        await fs.unlink(filePath)
      } catch {
        // already gone
      }
    },
  }
}

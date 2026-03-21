import * as fsNode from 'fs/promises'
import * as path from 'path'
import type { FsPort } from '../core/ports.js'

export function createFsAdapter(): FsPort {
  return {
    async mkdir(dirPath) {
      await fsNode.mkdir(dirPath, { recursive: true })
    },
    async copyFile(src, dest) {
      await fsNode.copyFile(src, dest)
    },
    async readFile(filePath) {
      return fsNode.readFile(filePath, 'utf-8')
    },
    async writeFile(filePath, content) {
      await fsNode.mkdir(path.dirname(filePath), { recursive: true })
      await fsNode.writeFile(filePath, content, 'utf-8')
    },
    async remove(targetPath) {
      await fsNode.rm(targetPath, { recursive: true, force: true })
    },
    async exists(targetPath) {
      try {
        await fsNode.access(targetPath)
        return true
      } catch {
        return false
      }
    },
  }
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { createFsAdapter } from './fs-adapter.js'

describe('FsAdapter', () => {
  let testDir: string
  let fs: ReturnType<typeof createFsAdapter>

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'ocm-test-'))
    fs = createFsAdapter()
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('mkdir creates nested directories', async () => {
    const dir = path.join(testDir, 'a', 'b', 'c')
    await fs.mkdir(dir)
    expect(await fs.exists(dir)).toBe(true)
  })

  it('writeFile and readFile roundtrip', async () => {
    const file = path.join(testDir, 'test.txt')
    await fs.writeFile(file, 'hello')
    expect(await fs.readFile(file)).toBe('hello')
  })

  it('exists returns false for missing file', async () => {
    expect(await fs.exists(path.join(testDir, 'nope'))).toBe(false)
  })

  it('remove deletes file', async () => {
    const file = path.join(testDir, 'test.txt')
    await fs.writeFile(file, 'hello')
    await fs.remove(file)
    expect(await fs.exists(file)).toBe(false)
  })

  it('remove deletes directory recursively', async () => {
    const dir = path.join(testDir, 'sub')
    await fs.mkdir(dir)
    await fs.writeFile(path.join(dir, 'f.txt'), 'x')
    await fs.remove(dir)
    expect(await fs.exists(dir)).toBe(false)
  })

  it('copyFile copies content', async () => {
    const src = path.join(testDir, 'src.txt')
    const dest = path.join(testDir, 'dest.txt')
    await fs.writeFile(src, 'content')
    await fs.copyFile(src, dest)
    expect(await fs.readFile(dest)).toBe('content')
  })
})

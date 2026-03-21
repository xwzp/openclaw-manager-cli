import { describe, it, expect } from 'vitest'
import { maskSecret } from './mask.js'

describe('maskSecret', () => {
  it('masks middle of normal-length string (default 4+3)', () => {
    expect(maskSecret('sk-abcdefghijklmnop')).toBe('sk-a...nop')
  })

  it('masks cli_ prefixed string', () => {
    expect(maskSecret('cli_a1b2c3d4')).toBe('cli_...3d4')
  })

  it('returns stars if too short to mask', () => {
    expect(maskSecret('short')).toBe('*****')
  })

  it('handles exactly 8 chars', () => {
    expect(maskSecret('abcdefgh')).toBe('abcd...fgh')
  })

  it('handles empty string', () => {
    expect(maskSecret('')).toBe('')
  })

  it('supports custom head and tail length', () => {
    expect(maskSecret('sk-abcdefghijklmnop', 6, 6)).toBe('sk-abc...klmnop')
  })

  it('returns stars when value shorter than head+tail', () => {
    expect(maskSecret('abc', 6, 6)).toBe('***')
  })
})

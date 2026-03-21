import { describe, it, expect } from 'vitest'
import { maskSecret } from './mask.js'

describe('maskSecret', () => {
  it('masks middle of normal-length string', () => {
    expect(maskSecret('sk-abcdefghijklmnop')).toBe('sk-a...nop')
  })

  it('masks cli_ prefixed string', () => {
    expect(maskSecret('cli_a1b2c3d4')).toBe('cli_...3d4')
  })

  it('returns stars if too short to mask (<=7 chars)', () => {
    expect(maskSecret('short')).toBe('*****')
  })

  it('handles exactly 8 chars', () => {
    expect(maskSecret('abcdefgh')).toBe('abcd...fgh')
  })

  it('handles empty string', () => {
    expect(maskSecret('')).toBe('')
  })
})

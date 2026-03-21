export function maskSecret(value: string, headLen = 4, tailLen = 3): string {
  if (!value) return ''
  if (value.length <= headLen + tailLen) return '*'.repeat(value.length)
  const prefix = value.slice(0, headLen)
  const suffix = value.slice(-tailLen)
  return `${prefix}...${suffix}`
}

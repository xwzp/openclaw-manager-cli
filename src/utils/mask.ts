export function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 7) return '*'.repeat(value.length)
  const prefix = value.slice(0, 4)
  const suffix = value.slice(-3)
  return `${prefix}...${suffix}`
}

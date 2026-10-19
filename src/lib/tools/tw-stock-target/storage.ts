import type { TrackedStock } from './types'

/** Validate persisted input before it reaches rendering or quote requests. */
export function loadTrackedStocks(raw: string | null): TrackedStock[] {
  if (!raw) return []
  let saved: unknown
  try { saved = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(saved)) return []
  const seen = new Set<string>()
  const result: TrackedStock[] = []
  for (const item of saved) {
    if (!item || typeof item.symbol !== 'string') continue
    const symbol = item.symbol.trim().toUpperCase()
    if (!/^\d{4,6}[A-Z]?(?:\.TW|\.TWO)?$/.test(symbol) || seen.has(symbol)) continue
    seen.add(symbol)
    result.push({
      symbol, name: typeof item.name === 'string' ? item.name : symbol,
      targets: Array.isArray(item.targets) ? item.targets.filter((target: unknown) => {
        if (!target || typeof target !== 'object') return false
        const entry = target as Record<string, unknown>
        return typeof entry.id === 'string' && typeof entry.label === 'string'
          && typeof entry.price === 'number' && Number.isFinite(entry.price) && entry.price > 0
      }) : [],
    })
    if (result.length === 50) break
  }
  return result
}

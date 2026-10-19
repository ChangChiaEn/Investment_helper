/**
 * 決策樹執行結果本機記憶：切換分頁後可還原，避免重複執行。
 */

import type { RunSessionSnapshot } from './types'

const STORAGE_KEY = 'sagafisc_decision_run_session'

/** 空快照 */
export function createEmptyRunSession(): RunSessionSnapshot {
  return {
    treeId: null,
    selectedSymbols: [],
    results: [],
    running: false,
    updatedAt: 0,
  }
}

/**
 * 讀取上次執行工作階段。
 * @returns 快照
 */
export function loadRunSession(): RunSessionSnapshot {
  if (typeof window === 'undefined') return createEmptyRunSession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyRunSession()
    const parsed = JSON.parse(raw) as Partial<RunSessionSnapshot>
    return {
      ...createEmptyRunSession(),
      ...parsed,
      // 重整後不應卡在 running
      running: false,
      results: Array.isArray(parsed.results) ? parsed.results : [],
      selectedSymbols: Array.isArray(parsed.selectedSymbols) ? parsed.selectedSymbols : [],
    }
  } catch {
    return createEmptyRunSession()
  }
}

/**
 * 寫入執行工作階段。
 * @param session - 快照
 */
export function saveRunSession(session: RunSessionSnapshot): void {
  if (typeof window === 'undefined') return
  const next: RunSessionSnapshot = {
    ...session,
    updatedAt: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

/**
 * 清除執行記憶。
 */
export function clearRunSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

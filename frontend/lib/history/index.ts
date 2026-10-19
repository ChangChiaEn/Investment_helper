/**
 * 今日 History 模組匯出。
 */

export type { HistoryEntry } from './store'
export {
  clearTodayHistory,
  dataSourceLabel,
  getHistoryByParts,
  getHistoryEntry,
  listTodayHistory,
  purgeExpired,
  putHistoryEntry,
  removeHistoryEntry,
} from './store'

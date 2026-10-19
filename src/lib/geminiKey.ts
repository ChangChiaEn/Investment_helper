/**
 * Gemini API Key 管理工具
 * 支援 localStorage（使用者手動輸入）與環境變數兩種來源
 */

const STORAGE_KEY = 'gemini_api_key'

/** 取得 Gemini API Key（優先使用 localStorage） */
export function getGeminiApiKey(): string {
  // 1. 瀏覽器環境：優先從 localStorage 取得使用者設定的 key
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem(STORAGE_KEY)
    if (userKey) return userKey
  }
  // 2. 從環境變數取得
  const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY
  if (envKey) return envKey

  return ''
}

/** 儲存 Gemini API Key 至 localStorage */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
}

/** 檢查是否已設定 API Key */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0
}

/** 清除 localStorage 中的 API Key */
export function clearGeminiApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

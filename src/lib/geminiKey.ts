/**
 * Gemini API Key 管理工具
 * AI Studio 雲端託管模式：全自動由伺服端環境變數提供，免手動輸入
 */

export function getGeminiApiKey(): string {
  return ''
}

export function setGeminiApiKey(_key: string): void {
  // No-op in AI Studio managed environment
}

export function hasGeminiApiKey(): boolean {
  return true
}

export function clearGeminiApiKey(): void {
  // No-op
}

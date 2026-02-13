/**
 * 導航工具函數
 * 用於在不同工具間傳遞標的資料
 */

export interface TargetData {
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
}

/**
 * 導航到指定工具並帶入標的資料
 */
export function navigateToTool(
  toolId: string,
  target?: TargetData
): string {
  const baseUrl = `/tools/${toolId}`
  
  if (!target) {
    return baseUrl
  }

  const params = new URLSearchParams({
    symbol: target.symbol,
    name: encodeURIComponent(target.name),
    type: target.type,
  })

  if (target.source) {
    params.set('source', target.source)
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * 根據標的類型決定應該導向哪個深度分析工具
 */
export function getAnalysisTool(type: 'stock' | 'fund'): string {
  return type === 'stock' ? 'gemini-stock-prophet' : 'fund-risk-analysis'
}


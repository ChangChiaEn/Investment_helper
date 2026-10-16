/**
 * 上班摸魚／偽裝模式：中性文案與品牌顯示規則。
 * 與主題色票分離；開啟時通常搭配 chat 主題色。
 */

/** localStorage：是否開啟偽裝（'1' / 其他） */
export const DISGUISE_STORAGE_KEY = 'app_disguise'

/** 開啟偽裝前記住的主題，關閉時還原 */
export const DISGUISE_PREV_THEME_KEY = 'app_theme_before_disguise'

/** 寫入 html[data-disguise] 的值 */
export const DISGUISE_DATA_VALUE = 'chat'

/** 偽裝品牌顯示名（避免使用官方商標字樣） */
export const DISGUISE_BRAND = 'Chat'

/** 分頁標題 */
export const DISGUISE_DOCUMENT_TITLE = 'Chat'

/** 導覽區塊標籤（真實 → 偽裝） */
export const DISGUISE_NAV_LABELS = {
  home: '新對話',
  mainSection: '對話',
  advancedSection: '專案',
  watchlist: '釘選',
  settings: '設定',
  stockType: '專案',
  fundType: '文件',
  analyze: '開啟',
  remove: '移除',
} as const

/**
 * 各工具在偽裝模式下的顯示名稱與描述。
 * 未列出的工具維持原名。
 */
export const DISGUISE_TOOL_LABELS: Record<
  string,
  { name: string; description: string }
> = {
  'trend-dashboard': {
    name: '產業報告草稿',
    description: '整理產業與市場重點',
  },
  'ai-stock-analyst': {
    name: '案例研究助手',
    description: '產出研究摘要與建議',
  },
  'gemini-stock-prophet': {
    name: '趨勢摘要',
    description: '長文重點與走向整理',
  },
  'tw-stock-target': {
    name: '專案里程碑表',
    description: '追蹤里程碑與進度差距',
  },
  'fund-assistant': {
    name: '預算規劃助手',
    description: '進出場節奏與配置建議',
  },
  'fund-risk-analysis': {
    name: '合規風險檢查',
    description: '風險與新聞面向檢視',
  },
  'asset-analysis': {
    name: '資源配置檢視',
    description: '年度資源分布健診',
  },
  'decision-tree': {
    name: '流程決策 SOP',
    description: '自訂指標與決策流程圖',
  },
  alphastrategist: {
    name: '綜合助理',
    description: '跨主題問答與整理',
  },
  'fund-insight': {
    name: '文獻整理',
    description: '重疊項目與重點摘錄',
  },
}

/**
 * 取得工具在目前模式下的顯示名稱與描述。
 * @param toolId 工具 ID
 * @param realName 真實名稱
 * @param realDescription 真實描述
 * @param disguise 是否開啟偽裝
 */
export function getToolDisplayLabels(
  toolId: string,
  realName: string,
  realDescription: string,
  disguise: boolean,
): { name: string; description: string } {
  if (!disguise) return { name: realName, description: realDescription }
  const fake = DISGUISE_TOOL_LABELS[toolId]
  return fake ?? { name: realName, description: realDescription }
}

/**
 * 從 localStorage 字串解析是否開啟偽裝。
 * @param value localStorage 原始值
 */
export function resolveDisguiseEnabled(
  value: string | null | undefined,
): boolean {
  return value === '1' || value === 'true'
}

/**
 * 套用或清除 html[data-disguise]。
 * @param enabled 是否開啟
 * @param el 目標元素
 */
export function applyDisguiseAttribute(
  enabled: boolean,
  el: HTMLElement = document.documentElement,
): void {
  if (enabled) {
    el.setAttribute('data-disguise', DISGUISE_DATA_VALUE)
  } else {
    el.removeAttribute('data-disguise')
  }
}

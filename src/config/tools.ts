/**
 * 工具配置：定義可用工具、投資流程導覽分組與標的類型標籤。
 */

/** 投資流程導覽分組（側欄／首頁順序） */
export type NavGroupId =
  | 'shared'
  | 'explore'
  | 'discover'
  | 'research'
  | 'execute'
  | 'portfolio'

/** 標的類型標籤（僅顯示用） */
export type AssetTag = '產業' | '台美股' | '基金' | '個人資產' | '系統'

export interface ToolConfig {
  id: string
  name: string
  description: string
  /** @deprecated 請優先使用 navGroup；保留相容舊邏輯 */
  category: 'trend' | 'stock' | 'fund' | 'asset' | 'advanced'
  localPath: string
  /** 是否出現在側欄導覽（綜合助理改為 FAB，為 false） */
  inNavigation: boolean
  /** 投資流程分組；null 表示不進導覽分組（如懸浮助理） */
  navGroup: NavGroupId | null
  /** 標的類型標籤 */
  assetTag?: AssetTag
}

/** 分組定義（有序） */
export interface NavGroupDef {
  id: NavGroupId
  /** 側欄／首頁標題 */
  title: string
}

/** 投資順序分組清單 */
export const NAV_GROUPS: NavGroupDef[] = [
  { id: 'shared', title: '共用基建' },
  { id: 'explore', title: '找方向' },
  { id: 'discover', title: '找標的' },
  { id: 'research', title: '深入分析' },
  { id: 'execute', title: '追蹤與決策' },
  { id: 'portfolio', title: '部位與資產' },
]

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  inventory: {
    id: 'inventory',
    name: '庫存',
    description: '持股、關注分類與資金參數；跨工具共用標的庫',
    category: 'stock',
    localPath: 'inventory',
    inNavigation: true,
    navGroup: 'shared',
    assetTag: '系統',
  },
  history: {
    id: 'history',
    name: '今日 History',
    description: '查看今日 OpenAPI 與 AI 查詢快取，避免重複消耗',
    category: 'stock',
    localPath: 'history',
    inNavigation: true,
    navGroup: 'shared',
    assetTag: '系統',
  },
  'trend-dashboard': {
    id: 'trend-dashboard',
    name: 'Trend Dashboard',
    description: '全產業大勢分析',
    category: 'trend',
    localPath: 'global-investment-trend-dashboard',
    inNavigation: true,
    navGroup: 'explore',
    assetTag: '產業',
  },
  'ai-stock-analyst': {
    id: 'ai-stock-analyst',
    name: 'AI 潛力股分析師',
    description: '分析某趨勢的潛力台美股票',
    category: 'stock',
    localPath: 'ai-stock-analyst',
    inNavigation: true,
    navGroup: 'discover',
    assetTag: '台美股',
  },
  'fund-insight': {
    id: 'fund-insight',
    name: '鉅亨基金智庫',
    description: '分析基金成分股重疊的優質股票',
    category: 'fund',
    localPath: 'anue-fund-insight',
    inNavigation: true,
    navGroup: 'discover',
    assetTag: '基金',
  },
  'gemini-stock-prophet': {
    id: 'gemini-stock-prophet',
    name: 'Gemini Stock Prophet',
    description: '台美股走勢預測與深度分析',
    category: 'stock',
    localPath: 'gemini-stock-prophet',
    inNavigation: true,
    navGroup: 'research',
    assetTag: '台美股',
  },
  'fund-assistant': {
    id: 'fund-assistant',
    name: '智能基金分析助手',
    description: '判斷最佳進出場時機，最大化投資收益',
    category: 'fund',
    localPath: 'anue-fund-genius',
    inNavigation: true,
    navGroup: 'research',
    assetTag: '基金',
  },
  'fund-risk-analysis': {
    id: 'fund-risk-analysis',
    name: '即時基金風險分析',
    description: '分析基金最新持股，評估新聞風險與市場走向',
    category: 'fund',
    localPath: 'fundscope-ai',
    inNavigation: true,
    navGroup: 'research',
    assetTag: '基金',
  },
  'tw-stock-target': {
    id: 'tw-stock-target',
    name: '台股目標價追蹤器',
    description: '追蹤多組目標價與外資買超潛力股',
    category: 'stock',
    localPath: 'tw-stock-target',
    inNavigation: true,
    navGroup: 'execute',
    assetTag: '台美股',
  },
  'decision-tree': {
    id: 'decision-tree',
    name: '決策樹',
    description: '自訂指標與視覺化決策樹，輸出進出場建議',
    category: 'stock',
    localPath: 'decision-tree',
    inNavigation: true,
    navGroup: 'execute',
    assetTag: '台美股',
  },
  'asset-analysis': {
    id: 'asset-analysis',
    name: '財產分布分析',
    description: '個人資產健診',
    category: 'asset',
    localPath: 'wealthvision---yearly-asset-analysis',
    inNavigation: true,
    navGroup: 'portfolio',
    assetTag: '個人資產',
  },
  /** 綜合助理：共用基建；可全頁或右下角小視窗，對話共用 */
  alphastrategist: {
    id: 'alphastrategist',
    name: 'AlphaStrategist AI',
    description: '綜合幫助管家；可全頁或懸浮小視窗',
    category: 'advanced',
    localPath: 'alphastrategist-ai',
    inNavigation: true,
    navGroup: 'shared',
    assetTag: '系統',
  },
}

/**
 * 導覽列工具：僅 inNavigation 且有 navGroup，依 NAV_GROUPS 順序排列。
 */
export const NAVIGATION_TOOLS: ToolConfig[] = NAV_GROUPS.flatMap((group) =>
  Object.values(TOOL_CONFIGS).filter(
    (tool) => tool.inNavigation && tool.navGroup === group.id
  )
)

/**
 * 依導覽分組取得工具列表。
 * @param groupId - 分組 id
 * @returns 該組工具（已過濾 inNavigation）
 */
export function getToolsByNavGroup(groupId: NavGroupId): ToolConfig[] {
  return Object.values(TOOL_CONFIGS).filter(
    (tool) => tool.inNavigation && tool.navGroup === groupId
  )
}

/**
 * 所有有工具的導覽分組（跳過空組）。
 * @returns { group, tools }[]
 */
export function getNavGroupsWithTools(): {
  group: NavGroupDef
  tools: ToolConfig[]
}[] {
  return NAV_GROUPS.map((group) => ({
    group,
    tools: getToolsByNavGroup(group.id),
  })).filter((entry) => entry.tools.length > 0)
}

/** @deprecated 進階區已取消；保留空陣列避免舊 import 爆掉 */
export const ADVANCED_TOOLS: ToolConfig[] = []

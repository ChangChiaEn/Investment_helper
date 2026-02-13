/**
 * 工具配置
 * 定義所有可用的工具及其屬性
 */

export interface ToolConfig {
  id: string
  name: string
  description: string
  category: 'trend' | 'stock' | 'fund' | 'asset' | 'advanced'
  localPath: string // 本地工具路徑
  inNavigation: boolean // 是否出現在導覽列
}

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'trend-dashboard': {
    id: 'trend-dashboard',
    name: 'Trend Dashboard',
    description: '全產業大勢分析',
    category: 'trend',
    localPath: 'global-investment-trend-dashboard',
    inNavigation: true,
  },
  'ai-stock-analyst': {
    id: 'ai-stock-analyst',
    name: 'AI 潛力股分析師',
    description: '分析某趨勢的潛力台美股票',
    category: 'stock',
    localPath: 'ai-stock-analyst',
    inNavigation: true,
  },
  'gemini-stock-prophet': {
    id: 'gemini-stock-prophet',
    name: 'Gemini Stock Prophet',
    description: '台美股走勢預測與深度分析',
    category: 'stock',
    localPath: 'gemini-stock-prophet',
    inNavigation: true,
  },
  'fund-assistant': {
    id: 'fund-assistant',
    name: '智能基金分析助手',
    description: '判斷最佳進出場時機，最大化投資收益',
    category: 'fund',
    localPath: 'anue-fund-genius',
    inNavigation: true,
  },
  'fund-risk-analysis': {
    id: 'fund-risk-analysis',
    name: '即時基金風險分析',
    description: '分析基金最新持股，評估新聞風險與市場走向',
    category: 'fund',
    localPath: 'fundscope-ai',
    inNavigation: true,
  },
  'asset-analysis': {
    id: 'asset-analysis',
    name: '財產分布分析',
    description: '個人資產健診',
    category: 'asset',
    localPath: 'wealthvision---yearly-asset-analysis',
    inNavigation: true,
  },
  // 進階功能（不在導覽列）
  'alphastrategist': {
    id: 'alphastrategist',
    name: 'AlphaStrategist AI',
    description: '綜合幫助管家',
    category: 'advanced',
    localPath: 'alphastrategist-ai',
    inNavigation: false,
  },
  'fund-insight': {
    id: 'fund-insight',
    name: '鉅亨基金智庫',
    description: '分析基金成分股重疊的優質股票',
    category: 'advanced',
    localPath: 'anue-fund-insight',
    inNavigation: false,
  },
}

// 導覽列工具（按順序）
export const NAVIGATION_TOOLS = Object.values(TOOL_CONFIGS)
  .filter(tool => tool.inNavigation)
  .sort((a, b) => {
    const order = ['trend', 'stock', 'fund', 'asset']
    return order.indexOf(a.category) - order.indexOf(b.category)
  })

// 進階功能工具
export const ADVANCED_TOOLS = Object.values(TOOL_CONFIGS)
  .filter(tool => tool.category === 'advanced')
  .sort((a, b) => a.name.localeCompare(b.name))


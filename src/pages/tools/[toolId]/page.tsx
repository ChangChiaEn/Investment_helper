'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, type ComponentType } from 'react'
import { TOOL_CONFIGS } from '@/config/tools'
import { useToolData } from '@/contexts/ToolDataContext'
import { ToolWrapper } from '@/components/ToolWrapper'

import AIStockAnalystPage from '@/pages/tools/ai-stock-analyst/page'
import AlphaStrategistPage from '@/pages/tools/alphastrategist/page'
import AssetAnalysisPage from '@/pages/tools/asset-analysis/page'
import DecisionTreePage from '@/pages/tools/decision-tree/page'
import FundAssistantPage from '@/pages/tools/fund-assistant/page'
import FundInsightPage from '@/pages/tools/fund-insight/page'
import FundRiskAnalysisPage from '@/pages/tools/fund-risk-analysis/page'
import GeminiStockProphetPage from '@/pages/tools/gemini-stock-prophet/page'
import HistoryPage from '@/pages/tools/history/page'
import InventoryPage from '@/pages/tools/inventory/page'
import TrendDashboardPage from '@/pages/tools/trend-dashboard/page'
import TaiwanStockTargetPage from '@/pages/tools/tw-stock-target/page'

/** 各工具專用頁面的對照（供 [toolId] 後備路由使用） */
const TOOL_PAGE_COMPONENTS: Record<string, ComponentType<any>> = {
  'ai-stock-analyst': AIStockAnalystPage,
  'gemini-stock-prophet': GeminiStockProphetPage,
  'tw-stock-target': TaiwanStockTargetPage,
  'trend-dashboard': TrendDashboardPage,
  'fund-assistant': FundAssistantPage,
  'fund-risk-analysis': FundRiskAnalysisPage,
  'asset-analysis': AssetAnalysisPage,
  'decision-tree': DecisionTreePage,
  alphastrategist: AlphaStrategistPage,
  'fund-insight': FundInsightPage,
  history: HistoryPage,
  inventory: InventoryPage,
}

/**
 * 工具後備路由：依 toolId 載入對應專用頁，並從 URL 寫入標的 Context。
 * 主要導覽通常走各工具專用 path；此頁作為相容與動態載入入口。
 * @returns 工具內容或錯誤提示
 */
export default function ToolPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const toolId = params.toolId as string
  const toolConfig = TOOL_CONFIGS[toolId]
  const { setToolData } = useToolData()

  // 從 URL 參數讀取標的資料並設定到 Context
  useEffect(() => {
    const symbol = searchParams.get('symbol')
    const name = searchParams.get('name')
    const type = searchParams.get('type') as 'stock' | 'fund' | null
    const source = searchParams.get('source')

    if (symbol && name && type) {
      setToolData(toolId, {
        symbol,
        name: decodeURIComponent(name),
        type,
        source: source || undefined,
      })
    }
  }, [searchParams, toolId, setToolData])

  if (!toolConfig) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-danger">工具不存在</h1>
      </div>
    )
  }

  const ToolComponent = toolConfig.localPath ? TOOL_PAGE_COMPONENTS[toolId] : null

  if (ToolComponent) {
    return (
      <ToolWrapper toolId={toolId}>
        <ToolComponent />
      </ToolWrapper>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{toolConfig.name}</h1>
      <p className="text-muted-fg">工具載入中或尚未整合...</p>
    </div>
  )
}

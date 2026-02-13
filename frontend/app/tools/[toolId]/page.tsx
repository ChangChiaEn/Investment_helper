'use client'

import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { TOOL_CONFIGS } from '@/config/tools'
import { useToolData } from '@/contexts/ToolDataContext'
import { ToolWrapper } from '@/components/ToolWrapper'
import { Loader } from '@/components/Loader'

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
        <h1 className="text-2xl font-bold text-red-600">工具不存在</h1>
      </div>
    )
  }

  // 如果有本地路徑，直接載入工具組件
  if (toolConfig.localPath) {
    let ToolComponent: any = null
    
    const loadingComponent = (
      <div className="h-full w-full flex items-center justify-center">
        <Loader size="lg" text="載入工具中..." />
      </div>
    )
    
    // 統一使用專用頁面組件載入工具
    const toolPageMap: Record<string, () => Promise<any>> = {
      'ai-stock-analyst': () => import('@/app/tools/ai-stock-analyst/page'),
      'gemini-stock-prophet': () => import('@/app/tools/gemini-stock-prophet/page'),
      'trend-dashboard': () => import('@/app/tools/trend-dashboard/page'),
      'fund-assistant': () => import('@/app/tools/fund-assistant/page'),
      'fund-risk-analysis': () => import('@/app/tools/fund-risk-analysis/page'),
      'asset-analysis': () => import('@/app/tools/asset-analysis/page'),
      'alphastrategist': () => import('@/app/tools/alphastrategist/page'),
      'fund-insight': () => import('@/app/tools/fund-insight/page'),
    }

    const pageLoader = toolPageMap[toolId]
    if (pageLoader) {
      ToolComponent = dynamic(pageLoader, {
        ssr: false,
        loading: () => loadingComponent
      })
    }
    
    if (ToolComponent) {
      return (
        <ToolWrapper toolId={toolId}>
          <ToolComponent />
        </ToolWrapper>
      )
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{toolConfig.name}</h1>
      <p className="text-surface-400">工具載入中或尚未整合...</p>
    </div>
  )
}


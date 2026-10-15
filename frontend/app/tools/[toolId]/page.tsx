'use client'

import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEffect, type ComponentType } from 'react'
import { TOOL_CONFIGS } from '@/config/tools'
import { useToolData } from '@/contexts/ToolDataContext'
import { ToolWrapper } from '@/components/ToolWrapper'
import { Loader } from '@/components/Loader'

/** 動態載入工具頁時的全高載入畫面 */
function ToolChunkLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

/**
 * 建立客戶端動態工具頁元件（模組層級建立，避免每次 render 重建）。
 * @param loader - 對應工具 page 的 dynamic import
 * @returns Next.js dynamic 元件
 */
function createToolPage(loader: () => Promise<{ default: ComponentType }>) {
  return dynamic(loader, {
    ssr: false,
    loading: () => <ToolChunkLoading />,
  })
}

/** 各工具專用頁面的動態載入對照（僅供 [toolId] 後備路由使用） */
const TOOL_PAGE_COMPONENTS: Record<string, ComponentType> = {
  'ai-stock-analyst': createToolPage(() => import('@/app/tools/ai-stock-analyst/page')),
  'gemini-stock-prophet': createToolPage(() => import('@/app/tools/gemini-stock-prophet/page')),
  'trend-dashboard': createToolPage(() => import('@/app/tools/trend-dashboard/page')),
  'fund-assistant': createToolPage(() => import('@/app/tools/fund-assistant/page')),
  'fund-risk-analysis': createToolPage(() => import('@/app/tools/fund-risk-analysis/page')),
  'asset-analysis': createToolPage(() => import('@/app/tools/asset-analysis/page')),
  alphastrategist: createToolPage(() => import('@/app/tools/alphastrategist/page')),
  'fund-insight': createToolPage(() => import('@/app/tools/fund-insight/page')),
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
        <h1 className="text-2xl font-bold text-red-600">工具不存在</h1>
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
      <p className="text-surface-400">工具載入中或尚未整合...</p>
    </div>
  )
}

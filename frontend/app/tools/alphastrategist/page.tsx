'use client'

/**
 * 綜合助理全頁：與懸浮小視窗共用 AssistantContext 對話。
 */

import { useEffect } from 'react'
import { Bot, PanelRightOpen, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel'
import { useAssistant } from '@/contexts/AssistantContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getToolDisplayLabels } from '@/config/disguise'
import { TOOL_CONFIGS } from '@/config/tools'

/**
 * 全畫面綜合助理；進入時關閉小視窗避免雙重 UI。
 */
export default function AlphaStrategistPage() {
  const router = useRouter()
  const { closePanel, openPanel, clearChat, isLoading } = useAssistant()
  const { disguise } = useTheme()
  const tool = TOOL_CONFIGS.alphastrategist
  const labels = getToolDisplayLabels(
    tool.id,
    tool.name,
    tool.description,
    disguise,
  )

  // 全頁時關閉抽屜，避免與主畫面重複顯示同一聊天
  useEffect(() => {
    closePanel()
  }, [closePanel])

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] min-h-0">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary shrink-0">
            <Bot className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-fg truncate">{labels.name}</h1>
            <p className="text-sm text-muted-fg truncate">{labels.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clearChat}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-muted-fg hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-40"
            title="清空對話"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">清空</span>
          </button>
          <button
            type="button"
            onClick={() => {
              openPanel()
              router.push('/')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary-soft text-primary border border-primary/30 hover:opacity-90 transition-opacity"
            title="改為懸浮小視窗"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span className="hidden sm:inline">小視窗</span>
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto">
        <AssistantChatPanel />
      </div>
    </div>
  )
}

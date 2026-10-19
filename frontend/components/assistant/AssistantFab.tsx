'use client'

/**
 * 右下角綜合助理 FAB 與右側抽屜；與全頁共用 AssistantContext 對話。
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, X, Trash2, Maximize2 } from 'lucide-react'
import { useAssistant } from '@/contexts/AssistantContext'
import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel'
import { useTheme } from '@/contexts/ThemeContext'
import { DISGUISE_NAV_LABELS, getToolDisplayLabels } from '@/config/disguise'
import { TOOL_CONFIGS } from '@/config/tools'

/**
 * 全域懸浮綜合助理：FAB + 右側面板。
 * 在全頁 `/tools/alphastrategist` 時隱藏，避免雙重 UI。
 */
export function AssistantFab() {
  const pathname = usePathname()
  const { open, toggle, closePanel, clearChat, isLoading } = useAssistant()
  const { disguise } = useTheme()
  const tool = TOOL_CONFIGS.alphastrategist
  const labels = getToolDisplayLabels(
    tool.id,
    tool.name,
    tool.description,
    disguise,
  )
  const fabLabel = disguise ? DISGUISE_NAV_LABELS.assistantFab : '綜合助理'
  // 全頁模式不顯示 FAB／抽屜
  const onFullPage = pathname === '/tools/alphastrategist'

  if (onFullPage) return null

  return (
    <>
      <div
        className={`
          fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] max-w-full
          flex flex-col bg-bg border-l border-border shadow-2xl
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}
        `}
        role="dialog"
        aria-label={labels.name}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-soft text-primary">
              <Bot className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-fg truncate">{labels.name}</h2>
              <p className="text-xs text-muted-fg truncate">{labels.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/tools/alphastrategist"
              onClick={() => closePanel()}
              className="p-2 rounded-lg text-muted-fg hover:text-primary hover:bg-primary-soft transition-colors"
              title="展開全頁"
              aria-label="展開全頁"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={clearChat}
              disabled={isLoading}
              className="p-2 rounded-lg text-muted-fg hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-40"
              title="清空對話"
              aria-label="清空對話"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="p-2 rounded-lg text-muted-fg hover:text-fg hover:bg-muted transition-colors"
              title="關閉"
              aria-label="關閉綜合助理"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <AssistantChatPanel />
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-bg/40 sm:hidden"
          aria-label="關閉助理遮罩"
          onClick={closePanel}
        />
      )}

      {!open && (
        <button
          type="button"
          onClick={toggle}
          className="
            fixed bottom-6 right-6 z-40
            flex items-center gap-2 px-4 py-3
            rounded-full bg-primary text-primary-fg shadow-lg
            hover:opacity-90 transition-opacity
          "
          title={fabLabel}
          aria-label={fabLabel}
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">{fabLabel}</span>
        </button>
      )}
    </>
  )
}

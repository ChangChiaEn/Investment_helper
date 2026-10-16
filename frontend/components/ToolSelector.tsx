'use client'

import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useTheme } from '@/contexts/ThemeContext'
import { getToolDisplayLabels } from '@/config/disguise'

interface ToolSelectorProps {
  /** 選取工具時回呼（傳入 tool id） */
  onSelect: (toolId: string) => void
}

/**
 * 工具卡片選擇器：以語意色呈現可點選的工具列表。
 * 偽裝模式下改顯示中性對話名稱。
 */
export function ToolSelector({ onSelect }: ToolSelectorProps) {
  const { disguise } = useTheme()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {NAVIGATION_TOOLS.map((tool) => {
        const labels = getToolDisplayLabels(
          tool.id,
          tool.name,
          tool.description,
          disguise,
        )
        return (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          className="group p-6 bg-card/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-left border border-border/50 hover:border-primary hover:-translate-y-1"
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary-soft rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 text-card-fg group-hover:text-primary transition-colors">
                {labels.name}
              </h3>
              <p className="text-sm text-muted-fg">{labels.description}</p>
            </div>
          </div>
        </button>
        )
      })}
    </div>
  )
}

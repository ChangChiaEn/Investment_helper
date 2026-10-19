'use client'

import { getNavGroupsWithTools } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useTheme } from '@/contexts/ThemeContext'
import { getNavGroupTitle, getToolDisplayLabels } from '@/config/disguise'

interface ToolSelectorProps {
  /** 選取工具時回呼（傳入 tool id） */
  onSelect: (toolId: string) => void
}

/**
 * 工具卡片選擇器：依投資流程分組呈現。
 * 偽裝模式下改顯示中性對話名稱。
 */
export function ToolSelector({ onSelect }: ToolSelectorProps) {
  const { disguise } = useTheme()
  const grouped = getNavGroupsWithTools()

  return (
    <div className="space-y-8">
      {grouped.map(({ group, tools }) => (
        <div key={group.id}>
          <h3 className="text-sm font-semibold text-muted-fg uppercase tracking-wider mb-3">
            {getNavGroupTitle(group.id, group.title, disguise)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => {
              const labels = getToolDisplayLabels(
                tool.id,
                tool.name,
                tool.description,
                disguise,
              )
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelect(tool.id)}
                  className="group p-6 bg-card/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-left border border-border/50 hover:border-primary hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary-soft rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-card-fg group-hover:text-primary transition-colors truncate">
                          {labels.name}
                        </h3>
                        {tool.assetTag && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-fg border border-border">
                            {tool.assetTag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-fg">{labels.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

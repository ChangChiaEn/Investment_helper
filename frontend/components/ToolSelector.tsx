'use client'

import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'

interface ToolSelectorProps {
  onSelect: (toolId: string) => void
}

export function ToolSelector({ onSelect }: ToolSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {NAVIGATION_TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          className="group p-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-left border border-surface-200/50 hover:border-primary-400 hover:-translate-y-1"
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 text-gray-800 group-hover:text-primary-600 transition-colors">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600">{tool.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVIGATION_TOOLS, ADVANCED_TOOLS } from '@/config/tools'
import { Home, Settings } from 'lucide-react'
import { ToolIcon } from '@/components/ToolIcons'

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col h-screen shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
            FinBuddy
          </span>
        </Link>
      </div>

      {/* 主要導覽 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <Link
            href="/"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>首頁</span>
          </Link>
        </div>

        <div className="mb-2">
          <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            主要功能
          </h3>
        </div>

        <div className="space-y-1">
          {NAVIGATION_TOOLS.map((tool) => {
            const isActive = pathname === `/tools/${tool.id}`
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 font-medium shadow-sm border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                }`}
              >
                <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{tool.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {tool.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <>
            <div className="mt-6 mb-2">
              <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                進階功能
              </h3>
            </div>
            <div className="space-y-1">
              {ADVANCED_TOOLS.map((tool) => {
                const isActive = pathname === `/tools/${tool.id}`
                return (
                  <Link
                    key={tool.id}
                    href={`/tools/${tool.id}`}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{tool.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {tool.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 底部設定 */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>設定</span>
        </Link>
      </div>
    </nav>
  )
}


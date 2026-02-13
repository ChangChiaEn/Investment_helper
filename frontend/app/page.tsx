'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HomeDashboard } from '@/components/HomeDashboard'
import { ToolSelector } from '@/components/ToolSelector'
import { ADVANCED_TOOLS, NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { Loader } from '@/components/Loader'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [homepageTool, setHomepageTool] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // 從 localStorage 讀取使用者設定的 homepage
    const savedHomepage = localStorage.getItem('homepage_tool')
    if (savedHomepage) {
      setHomepageTool(savedHomepage)
      // 在 useEffect 中進行導向，避免在渲染期間更新 Router
      setIsRedirecting(true)
      router.push(`/tools/${savedHomepage}`)
    }
  }, [router])

  // 如果正在導向，顯示載入狀態
  if (isRedirecting) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader size="lg" text="載入中..." />
      </div>
    )
  }

  // 預設顯示 Dashboard 或工具選擇器
  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
            歡迎使用 Sagafisc 理財小能手
          </h1>
          <p className="text-gray-600">整合多個 AI 分析工具的個人理財平台</p>
        </div>
        
        {/* 快速入口 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">快速開始</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NAVIGATION_TOOLS.slice(0, 3).map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-primary-400 hover:-translate-y-1"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 text-gray-800 group-hover:text-primary-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-600">{tool.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <HomeDashboard />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">選擇您的首頁</h2>
          <ToolSelector onSelect={(toolId) => {
            localStorage.setItem('homepage_tool', toolId)
            router.push(`/tools/${toolId}`)
          }} />
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">進階功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ADVANCED_TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-primary-400 hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <ToolIcon toolId={tool.id} className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 text-gray-800 group-hover:text-purple-600 transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-gray-600">{tool.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


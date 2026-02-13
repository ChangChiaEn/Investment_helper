'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToolSelector } from '@/components/ToolSelector'
import { ADVANCED_TOOLS, NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { Loader } from '@/components/Loader'
import Link from 'next/link'
import { Settings, Key } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    const savedHomepage = localStorage.getItem('homepage_tool')
    if (savedHomepage) {
      setIsRedirecting(true)
      router.push(`/tools/${savedHomepage}`)
    }
    setHasApiKey(!!localStorage.getItem('gemini_api_key'))
  }, [router])

  if (isRedirecting) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader size="lg" text="載入中..." />
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
            歡迎使用 Sagafisc 智慧投研平台
          </h1>
          <p className="text-surface-400">整合多個 AI 分析工具的智慧投資研究平台</p>
        </div>

        {/* API Key 提示 */}
        {!hasApiKey && (
          <div className="mb-8 bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Key className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-amber-800 mb-1">尚未設定 Gemini API Key</h2>
                <p className="text-amber-700 text-sm mb-3">
                  所有 AI 分析工具都需要 Gemini API Key 才能運作。請先至設定頁面輸入您的 API Key。
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  前往設定
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 快速入口 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-surface-100">快速開始</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NAVIGATION_TOOLS.slice(0, 3).map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group p-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-surface-200/50 hover:border-primary-400 hover:-translate-y-1"
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
          <h2 className="text-2xl font-semibold mb-4 text-surface-100">選擇您的首頁</h2>
          <ToolSelector onSelect={(toolId) => {
            localStorage.setItem('homepage_tool', toolId)
            router.push(`/tools/${toolId}`)
          }} />
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-surface-100">進階功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ADVANCED_TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group p-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-surface-200/50 hover:border-primary-400 hover:-translate-y-1"
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


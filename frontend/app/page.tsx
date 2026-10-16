'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToolSelector } from '@/components/ToolSelector'
import { ADVANCED_TOOLS, NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { Loader } from '@/components/Loader'
import Link from 'next/link'
import { Settings, Key } from 'lucide-react'

/**
 * 平台首頁：API Key 提示、快速入口、首頁工具選擇與進階功能。
 */
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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            歡迎使用 Sagafisc 智慧投研平台
          </h1>
          <p className="text-muted-fg">整合多個 AI 分析工具的智慧投資研究平台</p>
        </div>

        {/* API Key 提示 */}
        {!hasApiKey && (
          <div className="mb-8 bg-warning-soft border-2 border-warning/40 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-warning/20 rounded-xl">
                <Key className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-card-fg mb-1">尚未設定 Gemini API Key</h2>
                <p className="text-muted-fg text-sm mb-3">
                  所有 AI 分析工具都需要 Gemini API Key 才能運作。請先至設定頁面輸入您的 API Key。
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-warning text-primary-fg rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
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
          <h2 className="text-xl font-semibold mb-4 text-fg">快速開始</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NAVIGATION_TOOLS.slice(0, 3).map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group p-6 bg-card/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary hover:-translate-y-1"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary-soft rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 text-card-fg group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-muted-fg">{tool.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-fg">選擇您的首頁</h2>
          <ToolSelector onSelect={(toolId) => {
            localStorage.setItem('homepage_tool', toolId)
            router.push(`/tools/${toolId}`)
          }} />
        </div>

        {/* 進階功能 */}
        {ADVANCED_TOOLS.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-fg">進階功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ADVANCED_TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group p-6 bg-card/95 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary-soft rounded-xl group-hover:scale-110 transition-transform duration-300">
                      <ToolIcon toolId={tool.id} className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 text-card-fg group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-muted-fg">{tool.description}</p>
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToolSelector } from '@/components/ToolSelector'
import { getNavGroupsWithTools, NAV_GROUPS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { Loader } from '@/components/Loader'
import { useRouteLoading } from '@/components/RouteLoadingOverlay'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import {
  getDisguiseBrand,
  getNavGroupTitle,
  getToolDisplayLabels,
} from '@/config/disguise'

/**
 * 平台首頁：依投資流程分組的快速入口與首頁工具選擇。
 * @returns 首頁內容，或導向預設工具時的載入畫面
 */
export default function Home() {
  const router = useRouter()
  const { disguise, disguiseVariant } = useTheme()
  const { startRouteLoading } = useRouteLoading()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const savedHomepage = localStorage.getItem('homepage_tool')
    if (savedHomepage) {
      setIsRedirecting(true)
      startRouteLoading()
      router.push(`/tools/${savedHomepage}`)
    }
  }, [router, startRouteLoading])

  if (isRedirecting) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader size="lg" text="載入中..." />
      </div>
    )
  }

  // 快速開始：取前三個流程分組的各第一個工具
  const quickStartTools = getNavGroupsWithTools()
    .flatMap(({ tools }) => tools)
    .slice(0, 3)

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {disguise
              ? `歡迎使用 ${getDisguiseBrand(disguiseVariant)}`
              : '歡迎使用 Sagafisc 智慧投研平台'}
          </h1>
          <p className="text-muted-fg">
            {disguise
              ? '有什麼我可以幫你的嗎？從左側開啟一則對話即可開始。'
              : '依投資流程整理的智慧投研工具；右下角可隨時開啟綜合助理'}
          </p>
        </div>

        {/* 快速入口 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-fg">
            {disguise ? '建議對話' : '快速開始'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickStartTools.map((tool) => {
              const labels = getToolDisplayLabels(
                tool.id,
                tool.name,
                tool.description,
                disguise,
              )
              return (
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
                        {labels.name}
                      </h3>
                      <p className="text-sm text-muted-fg">{labels.description}</p>
                      {tool.navGroup && (
                        <p className="text-xs text-muted-fg mt-2">
                          {getNavGroupTitle(
                            tool.navGroup,
                            NAV_GROUPS.find((g) => g.id === tool.navGroup)?.title ?? '',
                            disguise,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-fg">
            {disguise ? '預設開啟的對話' : '選擇您的首頁'}
          </h2>
          <p className="text-sm text-muted-fg mb-4">
            {disguise
              ? '依工作流程分組；點選後將設為預設開啟頁。'
              : '依投資流程分組排列；點選後將設為登入後預設開啟的工具。'}
          </p>
          <ToolSelector
            onSelect={(toolId) => {
              localStorage.setItem('homepage_tool', toolId)
              router.push(`/tools/${toolId}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

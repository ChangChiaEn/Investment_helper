'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { getNavGroupsWithTools } from '@/config/tools'
import {
  Home,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react'
import { ToolIcon } from '@/components/ToolIcons'
import { SidebarWorkflow } from '@/components/SidebarWorkflow'
import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import {
  DISGUISE_NAV_LABELS,
  getDisguiseBrand,
  getNavGroupTitle,
  getToolDisplayLabels,
} from '@/config/disguise'

/** 側欄收合狀態的 localStorage 鍵 */
const NAV_COLLAPSED_KEY = 'nav_collapsed'

/**
 * 左側導覽列：依投資流程分組；可收合為僅圖示窄欄。
 * 偽裝模式下隱藏 Sagafisc 品牌，工具與分組改顯示中性名稱。
 */
export function Navigation() {
  const pathname = usePathname()
  const { disguise, disguiseVariant } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  // 避免 SSR／hydration 與 localStorage 不一致造成閃爍
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(NAV_COLLAPSED_KEY)
    if (saved === '1') setCollapsed(true)
    setReady(true)
  }, [])

  /** 切換收合並持久化。 */
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  /** 連結在收合／展開時的共用樣式。 */
  const linkClass = (active: boolean) =>
    `flex items-center rounded-xl transition-all duration-200 ${
      collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
    } ${
      active
        ? 'bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-medium shadow-sm border border-primary/30'
        : 'text-sidebar-fg hover:bg-sidebar-hover/50 hover:shadow-sm'
    }`

  const brandName = getDisguiseBrand(disguiseVariant)
  const homeLabel = disguise ? DISGUISE_NAV_LABELS.home : '首頁'
  const settingsLabel = disguise ? DISGUISE_NAV_LABELS.settings : '設定'
  const grouped = getNavGroupsWithTools()

  return (
    <nav
      className={`
        relative flex flex-col h-screen shrink-0
        bg-gradient-to-b from-sidebar-alt to-sidebar
        border-r border-sidebar-border/50 shadow-2xl text-base
        transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-[4.5rem]' : 'w-72'}
        ${ready ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Logo + 收合按鈕 */}
      <div className={`border-b border-sidebar-border/50 bg-gradient-to-r from-sidebar to-sidebar-alt ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'}`}>
          <Link
            href="/"
            className={`flex items-center group min-w-0 ${collapsed ? 'justify-center' : 'space-x-2'}`}
            title={brandName}
          >
            {disguise ? (
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 text-primary shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </span>
            ) : (
              <Image
                src="/Sagafisc.png"
                alt="Sagafisc"
                width={40}
                height={40}
                priority
                className="w-10 h-10 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
              />
            )}
            {!collapsed && (
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                {brandName}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-2 rounded-lg text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover/50 transition-colors flex-shrink-0"
            title={collapsed ? '展開側欄' : '收合側欄'}
            aria-label={collapsed ? '展開側欄' : '收合側欄'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 主要導覽：依投資流程分組 */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className="mb-4">
          <Link
            href="/"
            title={homeLabel}
            className={linkClass(pathname === '/')}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{homeLabel}</span>}
          </Link>
        </div>

        {grouped.map(({ group, tools }, groupIndex) => (
          <div key={group.id} className={groupIndex > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <div className="mb-1">
                <h3 className="px-4 py-1.5 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                  {getNavGroupTitle(group.id, group.title, disguise)}
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {tools.map((tool) => {
                const isActive = pathname === `/tools/${tool.id}`
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
                    title={labels.name}
                    className={linkClass(isActive)}
                  >
                    <ToolIcon toolId={tool.id} className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium flex items-center gap-2">
                          <span className="truncate">{labels.name}</span>
                          {tool.assetTag && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-sidebar-hover/80 text-sidebar-muted font-normal normal-case tracking-normal">
                              {tool.assetTag}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-sidebar-muted truncate">
                          {labels.description}
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <SidebarWorkflow collapsed={collapsed} />
      </div>

      {/* 底部設定 */}
      <div className={`border-t border-sidebar-border/50 ${collapsed ? 'p-2' : 'p-4'}`}>
        <Link
          href="/settings"
          title={settingsLabel}
          className={`flex items-center rounded-lg text-sidebar-fg hover:bg-sidebar-hover/50 transition-colors ${
            collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{settingsLabel}</span>}
        </Link>
      </div>
    </nav>
  )
}

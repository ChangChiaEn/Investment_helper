'use client'

import { useEffect, useRef } from 'react'
import { useToolParams } from '@/hooks/useToolParams'
import { ToolContainer } from './ToolContainer'
import { Loader } from './Loader'

interface ToolWrapperProps {
  children: React.ReactNode
  toolId: string
}

/**
 * ToolWrapper 組件
 * 用於將 URL 參數傳遞給工具組件
 * 透過 window.postMessage 或 props 傳遞
 * 統一工具容器的樣式
 */
export function ToolWrapper({ children, toolId }: ToolWrapperProps) {
  const params = useToolParams()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 如果有參數，透過 postMessage 傳遞給工具（如果工具支援）
    if (params.symbol && params.name && params.type && containerRef.current) {
      // 嘗試透過 postMessage 傳遞資料
      window.postMessage(
        {
          type: 'FINBUDDY_TARGET_DATA',
          toolId,
          data: params,
        },
        '*'
      )
    }
  }, [params, toolId])

  return (
    <ToolContainer>
      <div ref={containerRef} className="h-full w-full">
        {children}
      </div>
    </ToolContainer>
  )
}


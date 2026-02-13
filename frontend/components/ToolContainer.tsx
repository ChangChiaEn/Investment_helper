/**
 * 統一的工具容器組件
 * 確保所有工具有一致的樣式和佈局
 */
'use client'

import { ReactNode } from 'react'

interface ToolContainerProps {
  children: ReactNode
  className?: string
}

export function ToolContainer({ children, className = '' }: ToolContainerProps) {
  return (
    <div className={`h-full w-full overflow-auto ${className}`}>
      {children}
    </div>
  )
}


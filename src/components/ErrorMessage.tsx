'use client'

import { AlertTriangle } from 'lucide-react'

interface ErrorMessageProps {
  /** 錯誤訊息內容 */
  message: string
  /** 可選重試回呼 */
  onRetry?: () => void
}

/**
 * 工具頁共用錯誤提示區塊。
 */
export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="max-w-xl mx-auto bg-danger-soft border border-danger/40 rounded-xl p-6 flex flex-col items-center text-center">
      <AlertTriangle className="w-12 h-12 text-danger mb-4" />
      <h3 className="text-lg font-bold text-danger mb-2">分析失敗</h3>
      <p className="text-danger mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-danger-soft hover:bg-danger/20 text-danger rounded-lg text-sm font-medium transition-colors"
        >
          重試
        </button>
      )}
    </div>
  )
}

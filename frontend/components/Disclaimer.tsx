'use client'

import { AlertTriangle } from 'lucide-react'

export function Disclaimer() {
  return (
    <div className="mt-12 border-t border-gray-200 pt-6 pb-4 text-center">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold text-xs uppercase">免責聲明</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          本工具使用 Gemini AI 及 Google Search 技術生成內容，僅供參考與技術展示。
          AI 可能產生錯誤資訊。所有數據僅供參考，投資前請務必自行查證。投資有風險，請謹慎評估。
        </p>
      </div>
    </div>
  )
}

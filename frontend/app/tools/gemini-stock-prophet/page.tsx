'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, TrendingUp, ChevronDown, Loader2 } from 'lucide-react'
import { analyzeStock } from '@/lib/tools/gemini-stock-prophet/service'
import { StockMarket, AnalysisResult } from '@/lib/tools/gemini-stock-prophet/types'
import { SourcesSection } from '@/components/SourcesSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'
import { useToolCache } from '@/hooks/useToolCache'

// Simple Markdown renderer for the analysis report
function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="prose prose-gray max-w-none">
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        // Empty line -> spacer
        if (trimmed === '') {
          return <div key={idx} className="h-3" />
        }

        // H1
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">
              {renderInline(trimmed.slice(2))}
            </h1>
          )
        }

        // H2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-semibold text-gray-800 mt-5 mb-2">
              {renderInline(trimmed.slice(3))}
            </h2>
          )
        }

        // H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg font-semibold text-gray-700 mt-4 mb-2">
              {renderInline(trimmed.slice(4))}
            </h3>
          )
        }

        // Unordered list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-4 my-1">
              <span className="text-blue-500 mt-1.5 text-xs">&#9679;</span>
              <span className="text-gray-700 leading-relaxed">{renderInline(trimmed.slice(2))}</span>
            </div>
          )
        }

        // Numbered list item (e.g., "1. ", "2. ")
        const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/)
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-4 my-1">
              <span className="text-blue-600 font-semibold min-w-[1.5rem]">{numberedMatch[1]}.</span>
              <span className="text-gray-700 leading-relaxed">{renderInline(numberedMatch[2])}</span>
            </div>
          )
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-gray-700 leading-relaxed my-1">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

// Handle **bold** inline formatting
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-surface-400 font-medium">AI 正在搜尋最新資訊並分析中...</span>
      </div>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-6 space-y-4">
        <div className="h-8 bg-surface-200 rounded w-3/4" />
        <div className="h-4 bg-surface-100 rounded w-full" />
        <div className="h-4 bg-surface-100 rounded w-5/6" />
        <div className="h-4 bg-surface-100 rounded w-4/6" />
        <div className="h-6 bg-surface-200 rounded w-1/2 mt-6" />
        <div className="h-4 bg-surface-100 rounded w-full" />
        <div className="h-4 bg-surface-100 rounded w-3/4" />
        <div className="h-6 bg-surface-200 rounded w-1/2 mt-6" />
        <div className="h-4 bg-surface-100 rounded w-full" />
        <div className="h-4 bg-surface-100 rounded w-5/6" />
        <div className="h-4 bg-surface-100 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function GeminiStockProphetPage() {
  const searchParams = useSearchParams()
  const { cached, save } = useToolCache<{
    market: StockMarket
    symbol: string
    result: AnalysisResult | null
  }>('gemini-stock-prophet')

  const [market, setMarket] = useState<StockMarket>(cached?.market ?? StockMarket.TW)
  const [symbol, setSymbol] = useState(cached?.symbol ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(cached?.result ?? null)
  const [error, setError] = useState<string | null>(null)
  const [autoTriggered, setAutoTriggered] = useState(false)

  const handleSubmit = useCallback(async (overrideSymbol?: string, overrideMarket?: StockMarket) => {
    const trimmed = (overrideSymbol ?? symbol).trim()
    if (!trimmed) return

    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await analyzeStock(trimmed, overrideMarket ?? market)
      setResult(data)
    } catch (err: any) {
      setError(err.message || '分析過程中發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }, [symbol, market])

  // Auto-fill from URL params and trigger analysis
  useEffect(() => {
    if (autoTriggered) return
    const paramSymbol = searchParams.get('symbol')
    const paramName = searchParams.get('name')
    if (paramSymbol || paramName) {
      const sym = paramSymbol || paramName || ''
      setSymbol(decodeURIComponent(sym))
      setAutoTriggered(true)
      handleSubmit(decodeURIComponent(sym))
    }
  }, [searchParams, autoTriggered, handleSubmit])

  // Save to cache when results change
  useEffect(() => {
    if (result) {
      save({ market, symbol, result })
    }
  }, [result, market, symbol, save])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
            <TrendingUp className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100 mb-2">Gemini 股票先知</h1>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
            輸入股票代號或名稱，AI 將搜尋最新資訊進行深度投資分析與走向預測
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Market Selector */}
              <div className="relative">
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value as StockMarket)}
                  className="appearance-none w-full sm:w-36 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer pr-10"
                >
                  <option value={StockMarket.TW}>&#127481;&#127484; 台股</option>
                  <option value={StockMarket.US}>&#127482;&#127480; 美股</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Symbol Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={market === StockMarket.TW ? '輸入股票代號或名稱，例如：2330 或 台積電' : '輸入股票代號或名稱，例如：AAPL 或 Apple'}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleSubmit()}
                disabled={isLoading || !symbol.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    開始分析
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorMessage message={error} onRetry={() => handleSubmit()} />
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="space-y-6">
            {/* Markdown Report */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-6 sm:p-8 shadow-sm">
              <MarkdownRenderer text={result.markdownText} />
            </div>

            {/* Sources */}
            <SourcesSection sources={result.sources} />

            {/* Disclaimer */}
            <Disclaimer />
          </div>
        )}

        {/* Empty state - no result yet */}
        {!result && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">輸入股票代號並點擊分析，開始獲取 AI 投資分析報告</p>
          </div>
        )}
      </div>
    </div>
  )
}

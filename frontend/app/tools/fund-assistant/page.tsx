'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Search, Loader2, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle,
  ArrowUpRight, ArrowDownRight, Newspaper, Briefcase, Zap, Sparkles
} from 'lucide-react'
import { analyzeFundWithGemini } from '@/lib/tools/fund-assistant/service'
import { FundAnalysisResult, GroundingSource, PopularFund } from '@/lib/tools/fund-assistant/types'
import { SourcesSection } from '@/components/SourcesSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'
import { WatchlistButton } from '@/components/WatchlistButton'
import { useToolCache } from '@/hooks/useToolCache'

const POPULAR_FUNDS = Object.values(PopularFund)

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case 'Bullish': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '看漲' }
    case 'Bearish': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '看跌' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: '中性' }
  }
}

function getSentimentBarColor(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function SentimentGauge({ score, sentiment }: { score: number; sentiment: string }) {
  const colors = getSentimentColor(sentiment)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">市場情緒</span>
        <span className={`text-xs font-semibold ${colors.text}`}>{colors.label} ({score}/100)</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getSentimentBarColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>極度看跌</span>
        <span>中性</span>
        <span>極度看漲</span>
      </div>
    </div>
  )
}

function FundCard({ fund, index, isMulti }: { fund: FundAnalysisResult; index: number; isMulti: boolean }) {
  const sentimentStyle = getSentimentColor(fund.marketSentiment)
  const SentimentIcon = fund.marketSentiment === 'Bullish' ? TrendingUp : fund.marketSentiment === 'Bearish' ? TrendingDown : Minus

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 shadow-sm overflow-hidden">
      {/* Fund Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {isMulti && (
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                {index + 1}
              </span>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900">{fund.fundName}</h3>
              <div className="flex items-center gap-2 mt-1">
                {fund.isAvailableOnAnue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" />
                    鉅亨網可購買
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full font-medium">
                    <XCircle className="w-3 h-3" />
                    鉅亨網未上架
                  </span>
                )}
                {fund.riskLevel && (
                  <span className="text-[11px] px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full font-medium">
                    {fund.riskLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <WatchlistButton
              symbol={fund.fundName}
              name={fund.fundName}
              type="fund"
              source="fund-assistant"
            />
            {fund.navPrice && fund.navPrice !== 'N/A' && (
              <div className="text-right">
                <span className="text-xs text-gray-400">最新淨值</span>
                <p className="text-lg font-bold text-gray-900">{fund.navPrice}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sentiment Gauge */}
      <div className="px-5 py-4 border-b border-gray-100">
        <SentimentGauge score={fund.sentimentScore} sentiment={fund.marketSentiment} />
      </div>

      {/* Entry / Exit Strategy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
        <div className="p-4 sm:border-r border-b sm:border-b-0 border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-green-50 rounded">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">進場策略</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{fund.entryStrategy}</p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-red-50 rounded">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">出場策略</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{fund.exitStrategy}</p>
        </div>
      </div>

      {/* Expert Summary */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">專家摘要</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{fund.expertSummary}</p>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
        <div className="p-4 sm:border-r border-b sm:border-b-0 border-gray-100">
          <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> 優勢
          </h4>
          <ul className="space-y-1.5">
            {fund.pros.map((pro, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4">
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> 風險
          </h4>
          <ul className="space-y-1.5">
            {fund.cons.map((con, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-500 mt-0.5 flex-shrink-0">-</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trend Prediction */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <SentimentIcon className="w-3 h-3" /> 趨勢預測 (3-6 個月)
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{fund.trendPrediction}</p>
      </div>

      {/* News Highlights */}
      {fund.newsHighlights && fund.newsHighlights.length > 0 && (
        <div className="px-5 py-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Newspaper className="w-3 h-3" /> 相關新聞
          </h4>
          <div className="space-y-1.5">
            {fund.newsHighlights.map((news, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-400 mt-1.5 text-[6px]">&#9679;</span>
                <span>{news}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 justify-center py-6">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-surface-400 font-medium">AI 正在搜尋最新基金資訊並進行深度分析...</span>
      </div>
      {[1, 2].map(i => (
        <div key={i} className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-6 animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-surface-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-surface-200 rounded w-1/3" />
              <div className="h-3 bg-surface-100 rounded w-1/4" />
            </div>
          </div>
          <div className="h-3 bg-surface-100 rounded w-full" />
          <div className="h-3 bg-surface-100 rounded w-5/6" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-20 bg-surface-100 rounded-lg" />
            <div className="h-20 bg-surface-100 rounded-lg" />
          </div>
          <div className="h-3 bg-surface-100 rounded w-full" />
          <div className="h-3 bg-surface-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}

export default function FundAssistantPage() {
  const { cached, save } = useToolCache<{
    query: string
    results: FundAnalysisResult[] | null
    sources: GroundingSource[]
  }>('fund-assistant')

  const [query, setQuery] = useState(cached?.query ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<FundAnalysisResult[] | null>(cached?.results ?? null)
  const [sources, setSources] = useState<GroundingSource[]>(cached?.sources ?? [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (results) {
      save({ query, results, sources })
    }
  }, [results, sources, query, save])

  const handleAnalyze = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery || query).trim()
    if (!q) return

    setIsLoading(true)
    setResults(null)
    setSources([])
    setError(null)

    try {
      const { result, sources: s } = await analyzeFundWithGemini(q)
      setResults(result)
      setSources(s)
    } catch (err: any) {
      setError(err.message || '分析過程中發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleAnalyze()
  }

  const handleSpecialSearch = () => {
    const specialQuery = '尋找 3 支極短期爆發潛力股'
    setQuery(specialQuery)
    handleAnalyze(specialQuery)
  }

  const handlePopularFund = (fund: string) => {
    setQuery(fund)
    handleAnalyze(fund)
  }

  const isMultiFund = results && results.length > 1

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
            <Briefcase className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100 mb-2">AI 基金助手</h1>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
            搜尋基金名稱或讓 AI 推薦高潛力標的，獲取即時分析與進出場策略
          </p>
        </div>

        {/* Search Area */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入基金名稱，例如：安聯台灣科技基金"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => handleAnalyze()}
                disabled={isLoading || !query.trim()}
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
                    分析基金
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Special Button */}
        <div className="max-w-2xl mx-auto mb-6 text-center">
          <button
            onClick={handleSpecialSearch}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold text-sm rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            尋找 3 支極短期爆發潛力股
            <Zap className="w-4 h-4" />
          </button>
        </div>

        {/* Popular Fund Tags */}
        <div className="max-w-2xl mx-auto mb-8">
          <p className="text-xs text-surface-400 text-center mb-2">熱門基金快選</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_FUNDS.map(fund => (
              <button
                key={fund}
                onClick={() => handlePopularFund(fund)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-medium text-surface-300 bg-surface-800 border border-surface-600 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50 transition-colors"
              >
                {fund}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && <LoadingSkeleton />}

        {/* Error */}
        {error && !isLoading && (
          <ErrorMessage message={error} onRetry={() => handleAnalyze()} />
        )}

        {/* Results */}
        {results && !isLoading && (
          <div className="space-y-6">
            {/* Multi-fund Banner */}
            {isMultiFund && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-blue-800">AI 精選推薦</h2>
                </div>
                <p className="text-sm text-blue-600">
                  根據您的搜尋條件，AI 推薦以下 {results.length} 支基金
                </p>
              </div>
            )}

            {/* Fund Cards */}
            {results.map((fund, idx) => (
              <FundCard
                key={`${fund.fundName}-${idx}`}
                fund={fund}
                index={idx}
                isMulti={!!isMultiFund}
              />
            ))}

            {/* Sources */}
            <SourcesSection
              sources={sources.map(s => ({ title: s.title, url: s.url }))}
            />

            {/* Disclaimer */}
            <Disclaimer />
          </div>
        )}

        {/* Empty state */}
        {!results && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">搜尋基金名稱或點擊熱門標籤，開始獲取 AI 分析報告</p>
          </div>
        )}
      </div>
    </div>
  )
}

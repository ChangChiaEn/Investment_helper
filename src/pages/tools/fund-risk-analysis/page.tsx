'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Newspaper,
  BarChart3,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Loader } from '@/components/Loader'
import { analyzeFund } from '@/lib/tools/fund-risk/service'
import { FundAnalysis, Holding, AnalysisStatus } from '@/lib/tools/fund-risk/types'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'
import { useToolCache } from '@/hooks/useToolCache'
import { useThemeColors } from '@/hooks/useThemeColors'

const QUICK_FUNDS = ['安聯台灣科技基金', '統一黑馬基金', '元大台灣高股息', '野村優質基金']

const LOADING_STEPS = [
  '1/3 搜尋持股...',
  '2/3 檢索新聞...',
  '3/3 評估風險...',
]

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'Bullish') return <TrendingUp className="w-5 h-5 text-success" />
  if (trend === 'Bearish') return <TrendingDown className="w-5 h-5 text-danger" />
  return <Minus className="w-5 h-5 text-muted-fg" />
}

/** 風險等級徽章（語意色）。 */
function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    High: { bg: 'bg-danger-soft', text: 'text-danger', label: '高風險' },
    Medium: { bg: 'bg-warning-soft', text: 'text-warning', label: '中風險' },
    Low: { bg: 'bg-success-soft', text: 'text-success', label: '低風險' },
  }
  const c = config[level] || config.Medium
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <ShieldAlert className="w-3 h-3" />
      {c.label}
    </span>
  )
}

/** 新聞情緒圓點。 */
function SentimentDot({ sentiment }: { sentiment: string }) {
  const color =
    sentiment === 'positive' ? 'bg-success' :
    sentiment === 'negative' ? 'bg-danger' : 'bg-muted-fg'
  return <span className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0 mt-1.5`} />
}

/** 單一持股分析卡。 */
function HoldingCard({ holding, colorIndex, chartColors }: { holding: Holding; colorIndex: number; chartColors: string[] }) {
  const swatch = chartColors[colorIndex % chartColors.length]
  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 hover:border-primary hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-card-fg">{holding.name}</h4>
          {holding.ticker && (
            <span className="text-xs text-muted-fg font-mono">{holding.ticker}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold px-2 py-0.5 rounded-md"
            style={{ backgroundColor: swatch + '33', color: swatch }}
          >
            {holding.weight.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <TrendIcon trend={holding.trend} />
          <span className="text-xs text-muted-fg">
            {holding.trend === 'Bullish' ? '看多' : holding.trend === 'Bearish' ? '看空' : '中性'}
          </span>
        </div>
        <RiskBadge level={holding.riskLevel} />
      </div>
      <p className="text-sm text-muted-fg leading-relaxed mb-3">{holding.analysis}</p>
      {holding.recentNews && holding.recentNews.length > 0 && (
        <div className="border-t border-border pt-3">
          <h5 className="text-xs font-semibold text-muted-fg uppercase mb-2 flex items-center gap-1">
            <Newspaper className="w-3 h-3" /> 近期新聞
          </h5>
          <ul className="space-y-1.5">
            {holding.recentNews.map((news, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-fg">
                <SentimentDot sentiment={news.sentiment} />
                <span>{news.headline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * 基金風險分析工具頁。
 */
export default function FundRiskAnalysisPage() {
  const themeColors = useThemeColors()
  const chartColors = themeColors.chart
  const searchParams = useSearchParams()
  const { cached, save } = useToolCache<{
    query: string
    result: FundAnalysis | null
  }>('fund-risk-analysis')

  const [query, setQuery] = useState(cached?.query ?? '安聯台灣科技基金')
  const [status, setStatus] = useState<AnalysisStatus>(cached?.result ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<FundAnalysis | null>(cached?.result ?? null)
  const [error, setError] = useState<string | null>(null)
  const [autoTriggered, setAutoTriggered] = useState(false)

  const handleAnalyze = useCallback(async (fundName?: string) => {
    const name = fundName || query.trim()
    if (!name) return
    if (fundName) setQuery(fundName)

    setStatus(AnalysisStatus.LOADING)
    setError(null)
    setResult(null)
    setLoadingStep(0)

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < 2 ? prev + 1 : prev))
    }, 3000)

    try {
      const data = await analyzeFund(name)
      setResult(data)
      setStatus(AnalysisStatus.SUCCESS)
    } catch (err: any) {
      setError(err.message || '分析過程中發生錯誤，請稍後再試。')
      setStatus(AnalysisStatus.ERROR)
    } finally {
      clearInterval(interval)
    }
  }, [query])

  // Auto-fill from URL params and trigger analysis
  useEffect(() => {
    if (autoTriggered) return
    const paramSymbol = searchParams.get('symbol')
    const paramName = searchParams.get('name')
    if (paramSymbol || paramName) {
      const name = decodeURIComponent(paramName || paramSymbol || '')
      setQuery(name)
      setAutoTriggered(true)
      handleAnalyze(name)
    }
  }, [searchParams, autoTriggered, handleAnalyze])

  // Save to cache
  useEffect(() => {
    if (result) {
      save({ query, result })
    }
  }, [result, query, save])

  const pieData = result?.holdings.map((h) => ({
    name: h.name,
    value: h.weight,
  })) || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-soft border border-primary/30 mb-4">
          <AlertTriangle className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mb-2">
          基金<span className="text-primary">風險分析</span>
        </h1>
        <p className="text-muted-fg text-sm max-w-lg mx-auto">
          輸入基金名稱，AI 即時搜尋持股成分、檢索新聞並評估風險等級
        </p>
      </div>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && status !== AnalysisStatus.LOADING && handleAnalyze()}
                placeholder="輸入基金名稱，例如：安聯台灣科技基金"
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-card-fg text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                disabled={status === AnalysisStatus.LOADING}
              />
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={status === AnalysisStatus.LOADING || !query.trim()}
              className="px-6 py-2.5 bg-primary hover:bg-primary disabled:bg-muted disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {status === AnalysisStatus.LOADING ? (
                <><Loader2 className="w-4 h-4 animate-spin" />分析中</>
              ) : (
                <><Search className="w-4 h-4" />開始分析</>
              )}
            </button>
          </div>
          {/* Quick Fund Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_FUNDS.map((fund) => (
              <button
                key={fund}
                onClick={() => handleAnalyze(fund)}
                disabled={status === AnalysisStatus.LOADING}
                className="px-3 py-1 bg-muted hover:bg-primary-soft border border-border hover:border-primary text-fg hover:text-primary text-xs rounded-full transition-colors disabled:opacity-50"
              >
                {fund}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {status === AnalysisStatus.LOADING && (
        <div className="max-w-2xl mx-auto text-center py-16">
          <Loader size="md" text={LOADING_STEPS[loadingStep]} />
        </div>
      )}

      {/* Error State */}
      {status === AnalysisStatus.ERROR && error && (
        <ErrorMessage message={error} onRetry={() => handleAnalyze()} />
      )}

      {/* Results */}
      {status === AnalysisStatus.SUCCESS && result && (
        <div className="space-y-8">
          {/* Overview Card */}
          <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-soft rounded-xl">
                  <TrendIcon trend={result.overallTrend} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-card-fg">{result.fundName}</h2>
                  {result.updatedDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-fg mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>更新日期：{result.updatedDate}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-muted-fg block">趨勢</span>
                  <span className={`text-sm font-bold ${
                    result.overallTrend === 'Bullish' ? 'text-success' :
                    result.overallTrend === 'Bearish' ? 'text-danger' : 'text-muted-fg'
                  }`}>
                    {result.overallTrend === 'Bullish' ? '看多' : result.overallTrend === 'Bearish' ? '看空' : '中性'}
                  </span>
                </div>
                <RiskBadge level={result.overallRisk} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-primary-soft/50 border border-primary/30 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> 分析摘要
            </h3>
            <p className="text-card-fg leading-relaxed text-sm">{result.summary}</p>
          </div>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-card-fg mb-4">持股權重分布</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name} (${value.toFixed(1)}%)`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.card,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: themeColors.cardFg,
                      }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '權重']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Holdings Grid */}
          <div>
            <h3 className="text-lg font-bold text-fg mb-4">個別持股分析</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.holdings.map((holding, idx) => (
                <HoldingCard key={idx} holding={holding} colorIndex={idx} chartColors={chartColors} />
              ))}
            </div>
          </div>

          <Disclaimer />
        </div>
      )}

      {/* Empty State */}
      {status === AnalysisStatus.IDLE && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="w-8 h-8 text-muted-fg" />
          </div>
          <p className="text-fg text-base">選擇或輸入基金名稱，開始 AI 風險分析</p>
        </div>
      )}
    </div>
  )
}

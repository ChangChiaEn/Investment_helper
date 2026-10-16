'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, TrendingUp, ArrowLeft, Download, Clock, Loader2, BarChart3, Shield, Zap, History, Key, Settings
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { analyzeSectorPotential, getDashboardSummary } from '@/lib/tools/trend-dashboard/service'
import { GICS_Sector, ViewMode, AnalysisResult, HistoryItem, SectorDetail } from '@/lib/tools/trend-dashboard/types'
import { SECTOR_DATA } from '@/lib/tools/trend-dashboard/mockData'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'
import { Loader } from '@/components/Loader'
import { useToolCache } from '@/hooks/useToolCache'
import { useThemeColors } from '@/hooks/useThemeColors'
import Link from 'next/link'

const HISTORY_KEY = 'investrend_history'
const MAX_HISTORY = 5

/** 產業區隔用色（相對穩定的辨識色，主線條另由主題 chart 色補強）。 */
const SECTOR_COLORS: Record<string, string> = {
  [GICS_Sector.IT]: '#3B82F6',
  [GICS_Sector.FINANCIALS]: '#10B981',
  [GICS_Sector.HEALTHCARE]: '#EC4899',
  [GICS_Sector.CONSUMER_DISCRETIONARY]: '#F59E0B',
  [GICS_Sector.CONSUMER_STAPLES]: '#8B5CF6',
  [GICS_Sector.ENERGY]: '#EF4444',
  [GICS_Sector.UTILITIES]: '#06B6D4',
  [GICS_Sector.MATERIALS]: '#D97706',
  [GICS_Sector.INDUSTRIALS]: '#6366F1',
  [GICS_Sector.REAL_ESTATE]: '#14B8A6',
  [GICS_Sector.COMMUNICATION]: '#F97316',
}

const ALL_SECTORS = Object.values(GICS_Sector)

/** 風險等級對應的語意 class。 */
function getRiskColor(level: string) {
  switch (level) {
    case '低': return 'text-success bg-success-soft border-success/40'
    case '中': return 'text-warning bg-warning-soft border-warning/40'
    case '高': return 'text-warning bg-warning-soft border-warning/40'
    case '極高': return 'text-danger bg-danger-soft border-danger/40'
    default: return 'text-muted-fg bg-muted border-border'
  }
}

/** 結論標籤語意 class。 */
function getConclusionStyle(conclusion: string) {
  switch (conclusion) {
    case '長期前景': return 'bg-success-soft text-success border-success/40'
    case '短期前景': return 'bg-primary-soft text-primary border-primary/40'
    case '夕陽產業': return 'bg-danger-soft text-danger border-danger/40'
    default: return 'bg-muted text-card-fg border-border'
  }
}

/** 評等徽章語意 class。 */
function getRatingBadge(rating: string) {
  switch (rating) {
    case '低': return 'bg-success-soft text-success'
    case '中': return 'bg-warning-soft text-warning'
    case '高': return 'bg-danger-soft text-danger'
    default: return 'bg-muted text-card-fg'
  }
}

/**
 * 產業趨勢儀表板工具頁。
 */
export default function TrendDashboardPage() {
  const themeColors = useThemeColors()
  const { cached, save } = useToolCache<{
    viewMode: ViewMode
    selectedSector: GICS_Sector
    searchQuery: string
    analysisResult: AnalysisResult | null
    dashboardSummary: string
  }>('trend-dashboard')

  const [viewMode, setViewMode] = useState<ViewMode>(cached?.viewMode ?? 'DASHBOARD')
  const [selectedSector, setSelectedSector] = useState<GICS_Sector>(cached?.selectedSector ?? GICS_Sector.IT)
  const [searchQuery, setSearchQuery] = useState(cached?.searchQuery ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [dashboardSummary, setDashboardSummary] = useState<string>(cached?.dashboardSummary ?? '')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(cached?.analysisResult ?? null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  // Check API key
  useEffect(() => {
    setHasApiKey(!!localStorage.getItem('gemini_api_key'))
  }, [])

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  // Auto-load dashboard summary (only when API key is set and no cached summary)
  useEffect(() => {
    if (!hasApiKey) return
    if (dashboardSummary) return // already have cached or loaded summary
    const loadSummary = async () => {
      setSummaryLoading(true)
      try {
        const summary = await getDashboardSummary()
        setDashboardSummary(summary)
      } catch {
        setDashboardSummary('')
      } finally {
        setSummaryLoading(false)
      }
    }
    loadSummary()
  }, [hasApiKey, dashboardSummary])

  // Save to cache
  useEffect(() => {
    save({ viewMode, selectedSector, searchQuery, analysisResult, dashboardSummary })
  }, [viewMode, selectedSector, searchQuery, analysisResult, dashboardSummary, save])

  const saveHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  const handleAnalyze = useCallback(async () => {
    const query = searchQuery.trim()
    if (!query) return

    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const result = await analyzeSectorPotential(selectedSector, query)
      setAnalysisResult(result)
      setViewMode('ANALYSIS')

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        sector: selectedSector,
        query,
        result,
      }
      saveHistory(historyItem)
    } catch (err: any) {
      setError(err.message || '分析過程中發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedSector, saveHistory])

  const handleViewHistory = useCallback((item: HistoryItem) => {
    setSelectedSector(item.sector)
    setSearchQuery(item.query)
    setAnalysisResult(item.result)
    setViewMode('ANALYSIS')
    setShowHistory(false)
  }, [])

  const handleExport = useCallback(() => {
    if (!analysisResult) return
    const content = [
      `產業趨勢分析報告 - ${selectedSector}`,
      `結論: ${analysisResult.conclusion}`,
      `評估: ${analysisResult.overallEval}`,
      `策略: ${analysisResult.strategyLabel} - ${analysisResult.strategy}`,
      '',
      '--- 週期預期 ---',
      ...analysisResult.cycleExpectations.map(c => `${c.period}: [${c.rating}] ${c.logic}`),
      '',
      '--- 風險分析 ---',
      `等級: ${analysisResult.riskFactor.level}`,
      `描述: ${analysisResult.riskFactor.description}`,
      `對沖系數: ${analysisResult.riskFactor.offsetCoefficient}`,
      '',
      '--- 投資適配性 ---',
      ...analysisResult.suitabilities.map(s => `${s.tool}: ${s.recommendation} - ${s.reason}`),
      '',
      '--- 詳細報告 ---',
      analysisResult.content,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trend-analysis-${selectedSector}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [analysisResult, selectedSector])

  // Z-Score chart data for current sector
  const zScoreData = useMemo(() => {
    if (!selectedSector) return []
    return SECTOR_DATA[selectedSector].historicalCapex.map(d => ({
      year: d.year,
      zScore: d.valuationZScore,
    }))
  }, [selectedSector])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleAnalyze()
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {viewMode === 'ANALYSIS' && (
              <button
                onClick={() => { setViewMode('DASHBOARD'); setAnalysisResult(null); setError(null) }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-fg" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-fg">全球投資趨勢儀表板</h1>
              </div>
              <p className="text-xs text-muted-fg mt-0.5">GICS 11 大產業 CapEx 趨勢與 AI 分析</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            title="歷史紀錄"
          >
            <History className="w-5 h-5 text-muted-fg" />
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="mb-6 bg-muted/90 backdrop-blur-sm rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              最近分析紀錄
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted-fg text-center py-4">尚無歷史紀錄</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleViewHistory(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted border border-border transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-fg">{item.sector}</span>
                      <span className="text-[10px] text-muted-fg">
                        {new Date(item.timestamp).toLocaleString('zh-TW')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-fg mt-1 truncate">{item.query}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sector Tab Buttons */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {ALL_SECTORS.map(sector => (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  selectedSector === sector
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted text-fg border-border hover:bg-muted hover:border-border'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`輸入「${selectedSector}」的趨勢對決分析問題...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-fg text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-2.5 bg-primary hover:bg-primary disabled:bg-muted disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    趨勢對決
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorMessage message={error} onRetry={handleAnalyze} />}

        {/* Loading */}
        {isLoading && (
          <div className="py-20">
            <Loader size="md" text="AI 正在搜尋最新全球數據並進行產業分析..." />
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {viewMode === 'DASHBOARD' && !isLoading && (
          <div className="space-y-6">
            {/* API Key Warning */}
            {!hasApiKey && (
              <div className="bg-warning-soft border-2 border-warning/40 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-warning-soft rounded-xl">
                    <Key className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-card-fg mb-1">尚未設定 Gemini API Key</h2>
                    <p className="text-warning text-sm mb-3">
                      趨勢儀表板需要 Gemini API Key 才能進行產業分析與取得即時數據。請先至設定頁面輸入您的 API Key。
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning transition-colors text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      前往設定
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Summary (only when API key is set) */}
            {hasApiKey && (
              <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-card-fg mb-2">2026 全球產業熱點摘要</h2>
                {summaryLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                ) : dashboardSummary ? (
                  <p className="text-sm text-muted-fg leading-relaxed">{dashboardSummary}</p>
                ) : (
                  <p className="text-sm text-muted-fg">摘要載入失敗，請選擇產業並輸入問題開始分析。</p>
                )}
              </div>
            )}

            {/* Start Analyzing Prompt */}
            {hasApiKey && (
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30 p-8 text-center">
                <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-fg mb-2">選擇產業，開始 AI 趨勢分析</h2>
                <p className="text-sm text-muted-fg max-w-md mx-auto">
                  從上方選擇一個 GICS 產業，並在搜尋框輸入您想了解的趨勢問題，AI 將搜尋最新全球數據為您分析。
                </p>
              </div>
            )}

            <Disclaimer />
          </div>
        )}

        {/* ANALYSIS VIEW */}
        {viewMode === 'ANALYSIS' && analysisResult && !isLoading && (
          <div className="space-y-6">
            {/* Conclusion Banner */}
            <div className={`rounded-xl border p-5 ${getConclusionStyle(analysisResult.conclusion)}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-70">AI 結論</span>
                  <h2 className="text-xl font-bold mt-1">{analysisResult.conclusion}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs opacity-70">策略</span>
                  <p className="text-sm font-semibold">{analysisResult.strategyLabel}</p>
                </div>
              </div>
              <p className="text-sm mt-3 opacity-80">{analysisResult.overallEval}</p>
              <p className="text-xs mt-2 opacity-70">{analysisResult.strategy}</p>
            </div>

            {/* Cycle Expectations Table */}
            {analysisResult.cycleExpectations.length > 0 && (
              <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-card-fg mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  三段式週期預期
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">週期</th>
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">評級</th>
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">核心邏輯</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.cycleExpectations.map((cycle, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="py-2.5 px-3 text-card-fg font-medium whitespace-nowrap">{cycle.period}</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRatingBadge(cycle.rating)}`}>
                              {cycle.rating}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-fg">{cycle.logic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk Analysis */}
            <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-card-fg mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                風險分析
              </h3>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold mb-3 ${getRiskColor(analysisResult.riskFactor.level)}`}>
                風險等級：{analysisResult.riskFactor.level}
              </div>
              <p className="text-sm text-muted-fg mb-2">{analysisResult.riskFactor.description}</p>
              <p className="text-xs text-muted-fg bg-muted rounded-lg p-3">{analysisResult.riskFactor.offsetCoefficient}</p>
            </div>

            {/* Z-Score Chart */}
            <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-card-fg mb-3">
                {selectedSector} - 估值 Z-Score 趨勢
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={zScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: themeColors.mutedFg }} />
                    <YAxis tick={{ fontSize: 11, fill: themeColors.mutedFg }} domain={[-3, 3]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: themeColors.card,
                        border: `1px solid ${themeColors.border}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: themeColors.cardFg,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="zScore"
                      stroke={SECTOR_COLORS[selectedSector] || themeColors.chart1}
                      strokeWidth={2}
                      dot={{ r: 3, fill: SECTOR_COLORS[selectedSector] || themeColors.chart1 }}
                      name="Z-Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suitabilities Table */}
            {analysisResult.suitabilities.length > 0 && (
              <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-card-fg mb-3">投資工具適配性</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">工具</th>
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">建議</th>
                        <th className="text-left py-2 px-3 text-muted-fg font-medium text-xs">理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.suitabilities.map((s, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="py-2.5 px-3 text-card-fg font-medium">{s.tool}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{s.recommendation}</td>
                          <td className="py-2.5 px-3 text-muted-fg">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Report Content */}
            {analysisResult.content && (
              <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-card-fg mb-3">詳細分析報告</h3>
                <div className="text-sm text-card-fg leading-relaxed whitespace-pre-wrap">
                  {analysisResult.content}
                </div>
              </div>
            )}

            {/* Keywords */}
            {analysisResult.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analysisResult.keywords.map((kw, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 bg-primary-soft text-primary rounded-full border border-primary/30">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* News Sources */}
            {analysisResult.newsSources.length > 0 && (
              <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-fg mb-3">參考資料來源</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisResult.newsSources.map((ns, idx) => (
                    <a
                      key={idx}
                      href={ns.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-fg hover:text-primary transition-colors p-2 hover:bg-muted rounded-lg"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="truncate">{ns.title}</span>
                      <span className="text-[10px] text-muted-fg ml-auto">({ns.source})</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-muted border border-border hover:bg-muted text-fg text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                匯出報告
              </button>
            </div>

            <Disclaimer />
          </div>
        )}
      </div>
    </div>
  )
}

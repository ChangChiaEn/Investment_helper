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
import Link from 'next/link'

const HISTORY_KEY = 'investrend_history'
const MAX_HISTORY = 5

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

function getRiskColor(level: string) {
  switch (level) {
    case '低': return 'text-green-600 bg-green-50 border-green-200'
    case '中': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case '高': return 'text-orange-600 bg-orange-50 border-orange-200'
    case '極高': return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function getConclusionStyle(conclusion: string) {
  switch (conclusion) {
    case '長期前景': return 'bg-green-50 text-green-700 border-green-200'
    case '短期前景': return 'bg-blue-50 text-blue-700 border-blue-200'
    case '夕陽產業': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getRatingBadge(rating: string) {
  switch (rating) {
    case '低': return 'bg-green-100 text-green-700'
    case '中': return 'bg-yellow-100 text-yellow-700'
    case '高': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function TrendDashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD')
  const [selectedSector, setSelectedSector] = useState<GICS_Sector>(GICS_Sector.IT)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [dashboardSummary, setDashboardSummary] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
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

  // Auto-load dashboard summary (only when API key is set)
  useEffect(() => {
    if (!hasApiKey) return
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
  }, [hasApiKey])

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
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-surface-400" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-surface-100">全球投資趨勢儀表板</h1>
              </div>
              <p className="text-xs text-surface-400 mt-0.5">GICS 11 大產業 CapEx 趨勢與 AI 分析</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="relative p-2 hover:bg-surface-700 rounded-lg transition-colors"
            title="歷史紀錄"
          >
            <History className="w-5 h-5 text-surface-400" />
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="mb-6 bg-surface-800/90 backdrop-blur-sm rounded-xl border border-surface-600 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              最近分析紀錄
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-4">尚無歷史紀錄</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleViewHistory(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-surface-700 border border-surface-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-200">{item.sector}</span>
                      <span className="text-[10px] text-surface-500">
                        {new Date(item.timestamp).toLocaleString('zh-TW')}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mt-1 truncate">{item.query}</p>
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
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-surface-800 text-surface-300 border-surface-600 hover:bg-surface-700 hover:border-surface-500'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`輸入「${selectedSector}」的趨勢對決分析問題...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-800 border border-surface-600 rounded-lg text-surface-100 text-sm placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
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
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Key className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-amber-800 mb-1">尚未設定 Gemini API Key</h2>
                    <p className="text-amber-700 text-sm mb-3">
                      趨勢儀表板需要 Gemini API Key 才能進行產業分析與取得即時數據。請先至設定頁面輸入您的 API Key。
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
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
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">2026 全球產業熱點摘要</h2>
                {summaryLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </div>
                ) : dashboardSummary ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{dashboardSummary}</p>
                ) : (
                  <p className="text-sm text-gray-400">摘要載入失敗，請選擇產業並輸入問題開始分析。</p>
                )}
              </div>
            )}

            {/* Start Analyzing Prompt */}
            {hasApiKey && (
              <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-700/30 p-8 text-center">
                <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-surface-100 mb-2">選擇產業，開始 AI 趨勢分析</h2>
                <p className="text-sm text-surface-400 max-w-md mx-auto">
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
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  三段式週期預期
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">週期</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">評級</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">核心邏輯</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.cycleExpectations.map((cycle, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 px-3 text-gray-800 font-medium whitespace-nowrap">{cycle.period}</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRatingBadge(cycle.rating)}`}>
                              {cycle.rating}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{cycle.logic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk Analysis */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                風險分析
              </h3>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold mb-3 ${getRiskColor(analysisResult.riskFactor.level)}`}>
                風險等級：{analysisResult.riskFactor.level}
              </div>
              <p className="text-sm text-gray-600 mb-2">{analysisResult.riskFactor.description}</p>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{analysisResult.riskFactor.offsetCoefficient}</p>
            </div>

            {/* Z-Score Chart */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {selectedSector} - 估值 Z-Score 趨勢
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={zScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} domain={[-3, 3]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="zScore"
                      stroke={SECTOR_COLORS[selectedSector] || '#3B82F6'}
                      strokeWidth={2}
                      dot={{ r: 3, fill: SECTOR_COLORS[selectedSector] || '#3B82F6' }}
                      name="Z-Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suitabilities Table */}
            {analysisResult.suitabilities.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">投資工具適配性</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">工具</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">建議</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.suitabilities.map((s, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 px-3 text-gray-800 font-medium">{s.tool}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{s.recommendation}</td>
                          <td className="py-2.5 px-3 text-gray-600">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Report Content */}
            {analysisResult.content && (
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">詳細分析報告</h3>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {analysisResult.content}
                </div>
              </div>
            )}

            {/* Keywords */}
            {analysisResult.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analysisResult.keywords.map((kw, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* News Sources */}
            {analysisResult.newsSources.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">參考資料來源</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisResult.newsSources.map((ns, idx) => (
                    <a
                      key={idx}
                      href={ns.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="truncate">{ns.title}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">({ns.source})</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-surface-800 border border-surface-600 hover:bg-surface-700 text-surface-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
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

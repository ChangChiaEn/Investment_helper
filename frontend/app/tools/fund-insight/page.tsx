'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Layers,
  BookOpen,
  ExternalLink,
  Crosshair,
  FileText,
} from 'lucide-react'
import { fetchFundsData, analyzeSingleFund, analyzeFundOverlaps } from '@/lib/tools/fund-insight/service'
import { Fund, SingleFundAnalysis, OverlapAnalysis, AppState } from '@/lib/tools/fund-insight/types'
import { ErrorMessage } from '@/components/ErrorMessage'
import { SourcesSection } from '@/components/SourcesSection'
import { Disclaimer } from '@/components/Disclaimer'
import { Loader } from '@/components/Loader'
import { WatchlistButton } from '@/components/WatchlistButton'
import { useToolCache } from '@/hooks/useToolCache'

export default function FundInsightPage() {
  const { cached, save } = useToolCache<{
    query: string
    appState: AppState
    funds: Fund[]
    singleReport: SingleFundAnalysis | null
    overlapReport: OverlapAnalysis | null
  }>('fund-insight')

  const [query, setQuery] = useState(cached?.query ?? '')
  const [appState, setAppState] = useState<AppState>(cached?.appState ?? AppState.IDLE)
  const [funds, setFunds] = useState<Fund[]>(cached?.funds ?? [])
  const [singleReport, setSingleReport] = useState<SingleFundAnalysis | null>(cached?.singleReport ?? null)
  const [overlapReport, setOverlapReport] = useState<OverlapAnalysis | null>(cached?.overlapReport ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (funds.length > 0 || singleReport || overlapReport) {
      save({ query, appState, funds, singleReport, overlapReport })
    }
  }, [query, appState, funds, singleReport, overlapReport, save])

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setAppState(AppState.SEARCHING)
    setError(null)
    setFunds([])
    setSingleReport(null)
    setOverlapReport(null)

    try {
      const result = await fetchFundsData(trimmed)
      if (result.funds.length === 0) {
        setError('未找到相關基金資料，請確認名稱後重試。')
        setAppState(AppState.ERROR)
        return
      }
      setFunds(result.funds)
      setAppState(AppState.FUNDS_LIST)
    } catch (err: any) {
      setError(err.message || '搜尋過程中發生錯誤，請稍後再試。')
      setAppState(AppState.ERROR)
    }
  }

  const handleAnalyzeFund = async (fund: Fund) => {
    setAppState(AppState.ANALYZING)
    setError(null)
    setSingleReport(null)

    try {
      const result = await analyzeSingleFund(fund)
      setSingleReport(result)
      setAppState(AppState.SHOW_REPORT)
    } catch (err: any) {
      setError(err.message || '分析過程中發生錯誤。')
      setAppState(AppState.ERROR)
    }
  }

  const handleAnalyzeOverlaps = async () => {
    setAppState(AppState.ANALYZING_OVERLAPS)
    setError(null)
    setOverlapReport(null)

    try {
      const result = await analyzeFundOverlaps(funds)
      setOverlapReport(result)
      setAppState(AppState.SHOW_OVERLAPS)
    } catch (err: any) {
      setError(err.message || '交叉分析過程中發生錯誤。')
      setAppState(AppState.ERROR)
    }
  }

  const goBackToList = () => {
    setAppState(AppState.FUNDS_LIST)
    setSingleReport(null)
    setOverlapReport(null)
    setError(null)
  }

  const goBackToIdle = () => {
    setAppState(AppState.IDLE)
    setFunds([])
    setSingleReport(null)
    setOverlapReport(null)
    setError(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <BookOpen className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-100 mb-2">
          基金<span className="text-blue-600">透視鏡</span>
        </h1>
        <p className="text-surface-400 text-sm max-w-lg mx-auto">
          輸入基金名稱，AI 即時分析持股、市場情緒與投資策略，掃描重疊強勢股
        </p>
      </div>

      {/* Search Area - always visible */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            輸入基金名稱（多支以逗號或空格分隔）
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：安聯台灣科技基金, 統一黑馬基金, 元大台灣高股息"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            disabled={appState === AppState.SEARCHING || appState === AppState.ANALYZING || appState === AppState.ANALYZING_OVERLAPS}
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || appState === AppState.SEARCHING || appState === AppState.ANALYZING || appState === AppState.ANALYZING_OVERLAPS}
            className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {appState === AppState.SEARCHING ? (
              <><Loader2 className="w-4 h-4 animate-spin" />搜尋中...</>
            ) : (
              <><Search className="w-4 h-4" />載入基金數據</>
            )}
          </button>
        </div>
      </div>

      {/* Loading States */}
      {(appState === AppState.SEARCHING || appState === AppState.ANALYZING || appState === AppState.ANALYZING_OVERLAPS) && (
        <div className="py-16">
          <Loader
            size="md"
            text={
              appState === AppState.SEARCHING ? 'Gemini 正在搜尋基金數據...' :
              appState === AppState.ANALYZING ? '正在進行深度基金分析...' :
              '正在掃描重疊持股...'
            }
          />
        </div>
      )}

      {/* Error State */}
      {appState === AppState.ERROR && error && (
        <div className="space-y-4">
          <ErrorMessage message={error} onRetry={funds.length > 0 ? goBackToList : handleSearch} />
          <div className="text-center">
            <button
              onClick={goBackToIdle}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> 返回首頁
            </button>
          </div>
        </div>
      )}

      {/* Funds List */}
      {appState === AppState.FUNDS_LIST && funds.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-100">
              找到 {funds.length} 支基金
            </h2>
            {funds.length >= 2 && (
              <button
                onClick={handleAnalyzeOverlaps}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Crosshair className="w-4 h-4" />
                掃描重疊強勢股 (Cross-Check)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {funds.map((fund, idx) => (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{fund.name}</h3>
                  <WatchlistButton
                    symbol={fund.code || fund.name}
                    name={fund.name}
                    type="fund"
                    source="fund-insight"
                    showAnalyze={false}
                    className="flex-shrink-0"
                  />
                </div>
                <div className="space-y-1.5 mb-4">
                  {fund.code && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">代碼</span>
                      <span className="text-gray-700 font-mono">{fund.code}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">3個月報酬</span>
                    <span className={`font-bold ${
                      fund.returnRate3Month.includes('-') ? 'text-red-500' : 'text-emerald-600'
                    }`}>
                      {fund.returnRate3Month}
                    </span>
                  </div>
                  {fund.riskLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">風險等級</span>
                      <span className="text-gray-700 font-medium">{fund.riskLevel}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAnalyzeFund(fund)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  分析
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Fund Report */}
      {appState === AppState.SHOW_REPORT && singleReport && (
        <div className="space-y-6">
          <button
            onClick={goBackToList}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回基金列表
          </button>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{singleReport.fundName}</h2>
            <p className="text-gray-500 text-xs mb-4">AI 深度分析報告</p>

            {/* Holdings */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" /> 持股結構
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{singleReport.holdings.summary}</p>
              {singleReport.holdings.topList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {singleReport.holdings.topList.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sentiment */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> 市場情緒
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{singleReport.sentiment.summary}</p>
              {singleReport.sentiment.keyEvents.length > 0 && (
                <ul className="space-y-1.5">
                  {singleReport.sentiment.keyEvents.map((event, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {event}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Strategy */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-base font-bold text-blue-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 專家建議
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-blue-700 font-semibold">操作建議：</span>
                  <span className="text-gray-700">{singleReport.strategy.suggestion}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-semibold">風險分析：</span>
                  <span className="text-gray-700">{singleReport.strategy.riskAnalysis}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-semibold">適合投資人：</span>
                  <span className="text-gray-700">{singleReport.strategy.suitableFor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          {singleReport.sourceUrls && singleReport.sourceUrls.length > 0 && (
            <SourcesSection
              sources={singleReport.sourceUrls.map((url) => {
                try {
                  return { title: new URL(url).hostname, uri: url }
                } catch {
                  return { title: url, uri: url }
                }
              })}
            />
          )}

          <Disclaimer />
        </div>
      )}

      {/* Overlap Analysis Report */}
      {appState === AppState.SHOW_OVERLAPS && overlapReport && (
        <div className="space-y-6">
          <button
            onClick={goBackToList}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回基金列表
          </button>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-surface-200/50 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-blue-600" />
              持股重疊交叉分析
            </h2>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">{overlapReport.summary}</p>
            </div>

            {/* Stocks Table */}
            {overlapReport.stocks.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 text-gray-500 font-semibold text-xs uppercase">標的名稱</th>
                      <th className="text-center py-3 px-3 text-gray-500 font-semibold text-xs uppercase">重複次數</th>
                      <th className="text-left py-3 px-3 text-gray-500 font-semibold text-xs uppercase">持有基金</th>
                      <th className="text-left py-3 px-3 text-gray-500 font-semibold text-xs uppercase">產業</th>
                      <th className="text-left py-3 px-3 text-gray-500 font-semibold text-xs uppercase">原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlapReport.stocks.map((stock, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-900">{stock.stockName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
                            {stock.count}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {stock.heldBy.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                                {name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{stock.sector}</td>
                        <td className="py-3 px-3 text-gray-600 text-xs leading-relaxed">{stock.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Disclaimer />
        </div>
      )}

      {/* Empty State */}
      {appState === AppState.IDLE && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 text-sm">輸入基金名稱並點擊載入，開始 AI 基金分析</p>
        </div>
      )}
    </div>
  )
}

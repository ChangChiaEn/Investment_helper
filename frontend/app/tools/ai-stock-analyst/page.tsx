'use client'

import { useState } from 'react'
import { TrendingUp, Globe, Search, Loader2, ArrowUpRight, Target, ShieldAlert, Zap, TrendingDown, Sparkles } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { generateStockAnalysis } from '@/lib/tools/ai-stock-analyst/service'
import type { StockRecommendation, SearchSource, Market, ChartDataPoint } from '@/lib/tools/ai-stock-analyst/types'
import { SourcesSection } from '@/components/SourcesSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'

function StockChart({ data }: { data: ChartDataPoint[] }) {
  const color = '#10b981'
  const id = `cp-${Math.random().toString(36).slice(2)}`
  return (
    <div className="h-44 w-full mt-3">
      <ResponsiveContainer width="100%" height={176}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={45} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} formatter={(value: any) => [`$${value}`, '價格']} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#${id})`} animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function StockCard({ stock }: { stock: StockRecommendation }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-all duration-300 hover:shadow-lg flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">{stock.ticker}</h3>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">{stock.sector}</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{stock.name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-lg">
              <ArrowUpRight className="w-5 h-5" />{stock.upsidePercentage}%
            </div>
            <span className="text-xs text-gray-400 uppercase font-semibold">潛在漲幅</span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div>
            <span className="text-gray-400 text-xs uppercase font-bold block mb-0.5">現價</span>
            <span className="text-gray-900 font-mono font-semibold">${stock.currentPrice}</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase font-bold block mb-0.5 flex items-center gap-1"><Target className="w-3 h-3" /> 目標價</span>
            <span className="text-blue-600 font-mono font-bold">${stock.targetPrice}</span>
          </div>
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase"><TrendingUp className="w-3 h-3" /> 止盈</div>
            <div className="text-lg font-mono font-bold text-gray-900">${stock.takeProfit}</div>
          </div>
          <div className="space-y-1 border-l border-gray-200 pl-3">
            <div className="flex items-center gap-1 text-rose-500 text-xs font-bold uppercase"><TrendingDown className="w-3 h-3" /> 止損</div>
            <div className="text-lg font-mono font-bold text-gray-900">${stock.stopLoss}</div>
          </div>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{stock.reasoning}</p>
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500" /> 增長催化劑</h4>
          <ul className="space-y-1.5">
            {stock.keyCatalysts.map((c, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                <span className="block w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-400">預測趨勢</span>
            <div className="flex items-center gap-1">
              <ShieldAlert className={`w-3 h-3 ${stock.riskLevel === 'High' ? 'text-red-500' : stock.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'}`} />
              <span className={`font-medium ${stock.riskLevel === 'High' ? 'text-red-500' : stock.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                風險: {stock.riskLevel}
              </span>
            </div>
          </div>
          <StockChart data={stock.chartData} />
        </div>
      </div>
    </div>
  )
}

export default function AIStockAnalystPage() {
  const [market, setMarket] = useState<Market>('US')
  const [strategy, setStrategy] = useState('')
  const [recommendations, setRecommendations] = useState<StockRecommendation[] | null>(null)
  const [sources, setSources] = useState<SearchSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!strategy.trim()) return
    setLoading(true)
    setError(null)
    setRecommendations(null)
    setSources([])
    try {
      const result = await generateStockAnalysis({ market, strategy })
      setRecommendations(result.recommendations)
      setSources(result.sources)
    } catch (err) {
      console.error(err)
      setError('分析過程中發生錯誤，請稍後再試。可能原因：API 額度限制或網絡問題。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold mb-4">
          <Sparkles className="w-3 h-3" />Powered by Gemini & Google Search
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">AI 潛力股<span className="text-blue-600">分析師</span></h1>
        <p className="text-gray-500 max-w-2xl mx-auto">即時發掘市場價值。利用 Google 搜尋與 Gemini 深度分析，為您篩選出美股或台股市場中具有翻倍潛力的標的。</p>
      </div>

      <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto mb-10 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇市場</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMarket('US')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${market === 'US' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <Globe className="w-5 h-5" /><span className="font-medium">美股市場 (US)</span>
              </button>
              <button type="button" onClick={() => setMarket('TW')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${market === 'TW' ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-1 ring-emerald-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                <TrendingUp className="w-5 h-5" /><span className="font-medium">台股市場 (TW)</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">投資策略或偏好</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="例如：尋找 undervalued 的 AI 概念股，或高股息的穩定成長股..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading || !strategy.trim()} className="w-full py-3 px-6 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />AI 正在分析大數據...</> : <><span>開始分析潛力股</span><TrendingUp className="w-5 h-5" /></>}
          </button>
        </div>
      </form>

      {error && <ErrorMessage message={error} onRetry={() => handleAnalyze()} />}

      {loading && !recommendations && (
        <div className="max-w-3xl mx-auto text-center py-16">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Gemini 正在即時搜索市場數據...</h3>
          <p className="text-gray-500">正在分析即時新聞、財報與市場情緒</p>
        </div>
      )}

      {recommendations && (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-6 h-6 text-blue-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Gemini 分析結果</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((stock) => <StockCard key={stock.ticker} stock={stock} />)}
          </div>
          <SourcesSection sources={sources} />
        </div>
      )}

      <Disclaimer />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Globe, Search, Loader2, ArrowUpRight, Target, ShieldAlert, Zap, TrendingDown, Sparkles } from 'lucide-react'
import { Loader } from '@/components/Loader'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { generateStockAnalysis } from '@/lib/tools/ai-stock-analyst/service'
import type { StockRecommendation, SearchSource, Market, ChartDataPoint } from '@/lib/tools/ai-stock-analyst/types'
import { SourcesSection } from '@/components/SourcesSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Disclaimer } from '@/components/Disclaimer'
import { WatchlistButton } from '@/components/WatchlistButton'
import { useToolCache } from '@/hooks/useToolCache'
import { useThemeColors } from '@/hooks/useThemeColors'

/** 股價走勢面積圖，色票跟隨目前主題。 */
function StockChart({ data }: { data: ChartDataPoint[] }) {
  const themeColors = useThemeColors()
  const color = themeColors.chart1
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
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} vertical={false} />
          <XAxis dataKey="year" stroke={themeColors.mutedFg} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={themeColors.mutedFg} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={45} />
          <Tooltip contentStyle={{ backgroundColor: themeColors.card, border: `1px solid ${themeColors.border}`, borderRadius: '8px', fontSize: '12px', color: themeColors.cardFg }} formatter={(value: any) => [`$${value}`, '價格']} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#${id})`} animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function StockCard({ stock }: { stock: StockRecommendation }) {
  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-lg flex flex-col h-full">
      <div className="p-5 border-b border-border">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-card-fg">{stock.ticker}</h3>
              <span className="px-2 py-0.5 bg-muted text-muted-fg text-xs rounded-md font-medium">{stock.sector}</span>
            </div>
            <p className="text-muted-fg text-sm mt-1">{stock.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <WatchlistButton
              symbol={stock.ticker}
              name={stock.name}
              type="stock"
              source="ai-stock-analyst"
            />
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-success font-bold text-lg">
                <ArrowUpRight className="w-5 h-5" />{stock.upsidePercentage}%
              </div>
              <span className="text-xs text-muted-fg uppercase font-semibold">潛在漲幅</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div>
            <span className="text-muted-fg text-xs uppercase font-bold block mb-0.5">現價</span>
            <span className="text-card-fg font-mono font-semibold">${stock.currentPrice}</span>
          </div>
          <div>
            <span className="text-muted-fg text-xs uppercase font-bold block mb-0.5 flex items-center gap-1"><Target className="w-3 h-3" /> 目標價</span>
            <span className="text-primary font-mono font-bold">${stock.targetPrice}</span>
          </div>
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-success text-xs font-bold uppercase"><TrendingUp className="w-3 h-3" /> 止盈</div>
            <div className="text-lg font-mono font-bold text-card-fg">${stock.takeProfit}</div>
          </div>
          <div className="space-y-1 border-l border-border pl-3">
            <div className="flex items-center gap-1 text-rose-500 text-xs font-bold uppercase"><TrendingDown className="w-3 h-3" /> 止損</div>
            <div className="text-lg font-mono font-bold text-card-fg">${stock.stopLoss}</div>
          </div>
        </div>
        <p className="text-muted-fg text-sm leading-relaxed mb-4 line-clamp-3">{stock.reasoning}</p>
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-bold text-muted-fg uppercase flex items-center gap-1"><Zap className="w-3 h-3 text-warning" /> 增長催化劑</h4>
          <ul className="space-y-1.5">
            {stock.keyCatalysts.map((c, i) => (
              <li key={i} className="text-xs text-muted-fg flex items-start gap-2">
                <span className="block w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-muted-fg">預測趨勢</span>
            <div className="flex items-center gap-1">
              <ShieldAlert className={`w-3 h-3 ${stock.riskLevel === 'High' ? 'text-danger' : stock.riskLevel === 'Medium' ? 'text-warning' : 'text-success'}`} />
              <span className={`font-medium ${stock.riskLevel === 'High' ? 'text-danger' : stock.riskLevel === 'Medium' ? 'text-warning' : 'text-success'}`}>
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
  const { cached, save } = useToolCache<{
    market: Market
    strategy: string
    recommendations: StockRecommendation[] | null
    sources: SearchSource[]
  }>('ai-stock-analyst')

  const [market, setMarket] = useState<Market>(cached?.market ?? 'US')
  const [strategy, setStrategy] = useState(cached?.strategy ?? '')
  const [recommendations, setRecommendations] = useState<StockRecommendation[] | null>(cached?.recommendations ?? null)
  const [sources, setSources] = useState<SearchSource[]>(cached?.sources ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (recommendations) {
      save({ market, strategy, recommendations, sources })
    }
  }, [recommendations, sources, market, strategy, save])

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-primary/40 text-primary text-xs font-semibold mb-4">
          <Sparkles className="w-3 h-3" />Powered by Gemini & Google Search
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-100 mb-3">AI 潛力股<span className="text-primary">分析師</span></h1>
        <p className="text-surface-400 max-w-2xl mx-auto">即時發掘市場價值。利用 Google 搜尋與 Gemini 深度分析，為您篩選出美股或台股市場中具有翻倍潛力的標的。</p>
      </div>

      <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto mb-10 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-card-fg mb-2">選擇市場</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMarket('US')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${market === 'US' ? 'bg-primary-soft border-primary text-primary ring-1 ring-primary' : 'border-border text-muted-fg hover:bg-muted'}`}>
                <Globe className="w-5 h-5" /><span className="font-medium">美股市場 (US)</span>
              </button>
              <button type="button" onClick={() => setMarket('TW')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${market === 'TW' ? 'bg-success-soft border-success text-success ring-1 ring-success' : 'border-border text-muted-fg hover:bg-muted'}`}>
                <TrendingUp className="w-5 h-5" /><span className="font-medium">台股市場 (TW)</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-card-fg mb-2">投資策略或偏好</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-fg" />
              <input type="text" value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="例如：尋找 undervalued 的 AI 概念股，或高股息的穩定成長股..." className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary" disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading || !strategy.trim()} className="w-full py-3 px-6 rounded-lg font-bold text-white bg-primary hover:bg-primary disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />AI 正在分析大數據...</> : <><span>開始分析潛力股</span><TrendingUp className="w-5 h-5" /></>}
          </button>
        </div>
      </form>

      {error && <ErrorMessage message={error} onRetry={() => handleAnalyze()} />}

      {loading && !recommendations && (
        <div className="max-w-3xl mx-auto text-center py-16">
          <Loader size="md" text="Gemini 正在即時搜索市場數據..." />
        </div>
      )}

      {recommendations && (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-soft rounded-lg"><TrendingUp className="w-6 h-6 text-primary" /></div>
            <h2 className="text-2xl font-bold text-surface-100">Gemini 分析結果</h2>
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

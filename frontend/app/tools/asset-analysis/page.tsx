'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Globe,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { analyzePortfolio } from '@/lib/tools/asset-analysis/service'
import {
  AssetEntry,
  InvestorProfile,
  AssetCategory,
  AnalysisResult,
  Language,
  AccountPurpose,
  InvestorProfileMode,
  CustomAllocation,
  RiskLevel,
} from '@/lib/tools/asset-analysis/types'
import { TRANSLATIONS, RISK_MAPPING, PROFILE_BENCHMARKS, TAIWAN_BANKS } from '@/lib/tools/asset-analysis/constants'
import { ErrorMessage } from '@/components/ErrorMessage'
import { SourcesSection } from '@/components/SourcesSection'
import { Disclaimer } from '@/components/Disclaimer'

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

function createEmptyEntry(): AssetEntry {
  return {
    bankCode: '822',
    bankName: '中國信託 (CTBC Bank)',
    purpose: AccountPurpose.SAVINGS,
    category: AssetCategory.CASH,
    amount: 0,
    notes: '',
  }
}

function calculateAllocation(
  assets: AssetEntry[],
  profileMode: InvestorProfileMode,
  profile: InvestorProfile,
  customAlloc: CustomAllocation
): { actualAllocation: CustomAllocation; targetAllocation: CustomAllocation; diffAllocation: CustomAllocation } {
  const total = assets.reduce((sum, a) => sum + a.amount, 0)

  let lowTotal = 0
  let medTotal = 0
  let highTotal = 0

  assets.forEach((a) => {
    const risk = RISK_MAPPING[a.category]
    if (risk === RiskLevel.LOW) lowTotal += a.amount
    else if (risk === RiskLevel.MEDIUM) medTotal += a.amount
    else highTotal += a.amount
  })

  const actualAllocation: CustomAllocation = {
    lowRisk: total > 0 ? Math.round((lowTotal / total) * 100) : 0,
    medRisk: total > 0 ? Math.round((medTotal / total) * 100) : 0,
    highRisk: total > 0 ? Math.round((highTotal / total) * 100) : 0,
  }

  const targetAllocation =
    profileMode === InvestorProfileMode.CATEGORICAL
      ? PROFILE_BENCHMARKS[profile]
      : customAlloc

  const diffAllocation: CustomAllocation = {
    lowRisk: actualAllocation.lowRisk - targetAllocation.lowRisk,
    medRisk: actualAllocation.medRisk - targetAllocation.medRisk,
    highRisk: actualAllocation.highRisk - targetAllocation.highRisk,
  }

  return { actualAllocation, targetAllocation, diffAllocation }
}

function AllocationBar({ label, actual, target }: { label: string; actual: number; target: number }) {
  const diff = actual - target
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-bold">{actual}%</span>
          <span className="text-gray-400">/</span>
          <span className="text-blue-600 font-medium">{target}%</span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            diff > 0 ? 'bg-red-50 text-red-600' : diff < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'
          }`}>
            {diff > 0 ? '+' : ''}{diff}%
          </span>
        </div>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-200 rounded-full"
          style={{ width: `${Math.min(target, 100)}%` }}
        />
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${
            diff > 5 ? 'bg-red-400' : diff < -5 ? 'bg-emerald-400' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(actual, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function AssetAnalysisPage() {
  const [lang, setLang] = useState<Language>(Language.ZH)
  const [currency, setCurrency] = useState('TWD')
  const [profileMode, setProfileMode] = useState<InvestorProfileMode>(InvestorProfileMode.CATEGORICAL)
  const [profile, setProfile] = useState<InvestorProfile>(InvestorProfile.MODERATE)
  const [customAlloc, setCustomAlloc] = useState<CustomAllocation>({ lowRisk: 40, medRisk: 40, highRisk: 20 })
  const [enableAI, setEnableAI] = useState(true)
  const [assets, setAssets] = useState<AssetEntry[]>([createEmptyEntry()])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)

  const t = TRANSLATIONS[lang]

  const totalWealth = useMemo(() => assets.reduce((s, a) => s + a.amount, 0), [assets])

  const addEntry = () => setAssets((prev) => [...prev, createEmptyEntry()])

  const removeEntry = (idx: number) => {
    if (assets.length <= 1) return
    setAssets((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateEntry = (idx: number, field: keyof AssetEntry, value: any) => {
    setAssets((prev) => prev.map((e, i) => {
      if (i !== idx) return e
      if (field === 'bankCode') {
        const bank = TAIWAN_BANKS.find((b) => b.code === value)
        return { ...e, bankCode: value, bankName: bank?.name || value }
      }
      return { ...e, [field]: value }
    }))
  }

  const handleCustomSlider = (field: keyof CustomAllocation, value: number) => {
    const remaining = 100 - value
    const otherFields = Object.keys(customAlloc).filter((k) => k !== field) as (keyof CustomAllocation)[]
    const otherTotal = otherFields.reduce((s, k) => s + customAlloc[k], 0)

    const newAlloc = { ...customAlloc, [field]: value }
    if (otherTotal > 0) {
      otherFields.forEach((k) => {
        newAlloc[k] = Math.round((customAlloc[k] / otherTotal) * remaining)
      })
    } else {
      otherFields.forEach((k, i) => {
        newAlloc[k] = i === 0 ? remaining : 0
      })
    }
    setCustomAlloc(newAlloc)
  }

  const handleSubmit = async () => {
    const validAssets = assets.filter((a) => a.amount > 0)
    if (validAssets.length === 0) {
      setError(lang === Language.ZH ? '請至少填入一筆有效資產。' : 'Please add at least one asset.')
      return
    }

    setIsLoading(true)
    setError(null)

    // Calculate allocation regardless of AI
    const allocation = calculateAllocation(validAssets, profileMode, profile, customAlloc)

    if (enableAI) {
      try {
        const aiResult = await analyzePortfolio(validAssets, profileMode, profile, customAlloc, lang, currency)
        setResult({ ...aiResult, ...allocation })
      } catch (err: any) {
        // Fallback: show allocation data even if AI fails
        setResult({
          ...allocation,
          riskAssessment: undefined,
          rebalancingAdvice: undefined,
          suggestedAllocation: undefined,
          marketOutlook: undefined,
        })
        setError(err.message || (lang === Language.ZH ? 'AI 分析失敗，但基礎配置數據已計算完成。' : 'AI analysis failed, but allocation data is ready.'))
      }
    } else {
      setResult({
        ...allocation,
        riskAssessment: undefined,
        rebalancingAdvice: undefined,
        suggestedAllocation: undefined,
        marketOutlook: undefined,
      })
    }

    setIsLoading(false)
    setShowDashboard(true)
  }

  // Dashboard view
  if (showDashboard && result) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => setShowDashboard(false)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.editData}
        </button>

        {/* Report Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.reportTitle}</h1>
          <p className="text-gray-500 text-sm">{currency} | {new Date().toLocaleDateString(lang === Language.ZH ? 'zh-TW' : 'en-US')}</p>
        </div>

        <div className="space-y-6">
          {/* Total Wealth */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
            <span className="text-xs text-gray-400 uppercase font-semibold">{t.totalWealth}</span>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {totalWealth.toLocaleString()} <span className="text-lg text-gray-400">{currency}</span>
            </div>
          </div>

          {/* Risk Allocation Comparison */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {t.deltaTitle}
            </h3>
            <div className="space-y-4">
              <AllocationBar label={t.lowRisk} actual={result.actualAllocation.lowRisk} target={result.targetAllocation.lowRisk} />
              <AllocationBar label={t.medRisk} actual={result.actualAllocation.medRisk} target={result.targetAllocation.medRisk} />
              <AllocationBar label={t.highRisk} actual={result.actualAllocation.highRisk} target={result.targetAllocation.highRisk} />
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <div className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-500 rounded" /> {t.actual}</div>
              <div className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-200 rounded" /> {t.target}</div>
            </div>
          </div>

          {/* AI Sections */}
          {result.riskAssessment && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {t.riskAssessment}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{result.riskAssessment}</p>
            </div>
          )}

          {result.rebalancingAdvice && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t.rebalanceAdvice}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{result.rebalancingAdvice}</p>
            </div>
          )}

          {result.suggestedAllocation && result.suggestedAllocation.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t.suggestedAllocation}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {result.suggestedAllocation.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{item.percentage}%</div>
                    <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.marketOutlook && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                {t.marketOutlook}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{result.marketOutlook}</p>
            </div>
          )}

          {result.groundingUrls && result.groundingUrls.length > 0 && (
            <SourcesSection
              sources={result.groundingUrls.map((url) => ({ title: new URL(url).hostname, uri: url }))}
            />
          )}

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-yellow-700 text-sm">{error}</p>
            </div>
          )}

          <Disclaimer />
        </div>
      </div>
    )
  }

  // Form view
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <DollarSign className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {t.title} - <span className="text-blue-600">{t.subtitle}</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">{t.tagline}</p>
      </div>

      {/* Language + Currency selectors */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-end gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setLang(Language.ZH)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${lang === Language.ZH ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            繁中
          </button>
          <button
            onClick={() => setLang(Language.EN)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${lang === Language.EN ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            English
          </button>
        </div>
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="appearance-none px-3 py-1.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step 1: Investor Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t.step1}</h2>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setProfileMode(InvestorProfileMode.CATEGORICAL)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                profileMode === InvestorProfileMode.CATEGORICAL
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.modeCategorical}
            </button>
            <button
              onClick={() => setProfileMode(InvestorProfileMode.CUSTOM)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                profileMode === InvestorProfileMode.CUSTOM
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.modeCustom}
            </button>
          </div>

          {profileMode === InvestorProfileMode.CATEGORICAL ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(InvestorProfile).map((p) => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    profile === p
                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`font-bold text-sm ${profile === p ? 'text-blue-700' : 'text-gray-900'}`}>
                    {t.profiles[p]}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t.profileDesc[p]}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {([
                { key: 'lowRisk' as const, label: t.lowRisk },
                { key: 'medRisk' as const, label: t.medRisk },
                { key: 'highRisk' as const, label: t.highRisk },
              ]).map(({ key, label }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold text-gray-900">{customAlloc[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={customAlloc[key]}
                    onChange={(e) => handleCustomSlider(key, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ))}
              <div className="text-right text-xs text-gray-400">
                {t.allocationTotal}: {customAlloc.lowRisk + customAlloc.medRisk + customAlloc.highRisk}%
              </div>
            </div>
          )}

          {/* AI Toggle */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={() => setEnableAI(!enableAI)}
              className={`relative w-10 h-5 rounded-full transition-colors ${enableAI ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enableAI ? 'translate-x-5' : ''}`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <Sparkles className={`w-4 h-4 ${enableAI ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm ${enableAI ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{t.enableAI}</span>
            </div>
          </div>
        </div>

        {/* Step 2: Asset Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t.step2}</h2>
            <button
              onClick={addEntry}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> {t.addEntry}
            </button>
          </div>

          <div className="space-y-4">
            {assets.map((entry, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                  {assets.length > 1 && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bank */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.bank}</label>
                    <select
                      value={entry.bankCode}
                      onChange={(e) => updateEntry(idx, 'bankCode', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TAIWAN_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Purpose */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.purpose}</label>
                    <select
                      value={entry.purpose}
                      onChange={(e) => updateEntry(idx, 'purpose', e.target.value as AccountPurpose)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(AccountPurpose).map((p) => (
                        <option key={p} value={p}>{t.purposes[p]}</option>
                      ))}
                    </select>
                  </div>
                  {/* Category */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.category}</label>
                    <select
                      value={entry.category}
                      onChange={(e) => updateEntry(idx, 'category', e.target.value as AssetCategory)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(AssetCategory).map((c) => (
                        <option key={c} value={c}>{t.categories[c]}</option>
                      ))}
                    </select>
                  </div>
                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.amount} ({currency})</label>
                    <input
                      type="number"
                      value={entry.amount || ''}
                      onChange={(e) => updateEntry(idx, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">{t.notes}</label>
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) => updateEntry(idx, 'notes', e.target.value)}
                      placeholder={lang === Language.ZH ? '選填備註...' : 'Optional notes...'}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">{t.totalWealth}</span>
            <span className="text-lg font-bold text-blue-800">{totalWealth.toLocaleString()} {currency}</span>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorMessage message={error} />}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t.analyzing}
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5" />
              {t.analyze}
            </>
          )}
        </button>

        <Disclaimer />
      </div>
    </div>
  )
}

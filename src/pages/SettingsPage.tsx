'use client'

import { useState, useEffect } from 'react'
import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useRouter } from 'next/navigation'
import { AVAILABLE_MODELS } from '@/lib/gemini'
import {
  DATA_PROVIDERS,
  MARKET_SOURCE_CONFIG,
  MODULE_DECISION_TREE,
  marketApiRegistry,
  testMarketProxyConnection,
} from '@/lib/market'
import { Cpu, Check, X, Loader2, Globe, Palette, BookOpen, EyeOff } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { THEME_LIST, rgbToHex, type ThemeId } from '@/config/themes'
import {
  DISGUISE_HOTKEY_HINT,
  DISGUISE_VARIANT_LIST,
  type DisguiseVariant,
} from '@/config/disguise'

/**
 * 設定頁：外觀主題、AI 模型選擇與首頁工具。
 */
export default function SettingsPage() {
  const router = useRouter()
  const { themeId, setTheme, disguise, disguiseVariant, setDisguiseVariant } = useTheme()
  const [homepageTool, setHomepageTool] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash')
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [proxyMessage, setProxyMessage] = useState('')
  /** 決策樹已登錄的市場 API（class registry） */
  const decisionTreeApis = marketApiRegistry.listByModule(MODULE_DECISION_TREE)

  useEffect(() => {
    const saved = localStorage.getItem('homepage_tool')
    if (saved) setHomepageTool(saved)

    const savedModel = localStorage.getItem('gemini_model')
    if (savedModel) setSelectedModel(savedModel)
  }, [])

  /** 儲存首頁工具選擇並導回首頁。 */
  const handleSaveHomepage = () => {
    if (homepageTool) {
      localStorage.setItem('homepage_tool', homepageTool)
      alert('首頁設定已儲存！')
      router.push('/')
    } else {
      localStorage.removeItem('homepage_tool')
      alert('已清除首頁設定')
    }
  }

  /** 選擇 AI 模型並持久化。 */
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('gemini_model', modelId)
  }

  /**
   * 測試市場資料代理（TWSE OpenAPI 一筆已知端點）。
   */
  const handleTestMarketProxy = async () => {
    setProxyStatus('testing')
    setProxyMessage('')
    const result = await testMarketProxyConnection()
    setProxyStatus(result.ok ? 'ok' : 'fail')
    setProxyMessage(result.message + (result.upstream ? `（${result.upstream}）` : ''))
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          設定
        </h1>
        <p className="text-muted-fg">
          {disguise ? '調整對話與外觀偏好' : '個人化您的 Sagafisc 體驗'}
        </p>
      </div>

      {/* 上班摸魚／偽裝模式：三套變體＋緊急熱鍵（此區不套用詞彙遮罩，避免說明被改寫） */}
      <div
        data-no-disguise
        className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50"
      >
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <EyeOff className="w-5 h-5 text-primary" />
          上班摸魚模式
        </h2>
        <p className="text-muted-fg mb-2">
          隱藏品牌、側欄改對話名稱，並把頁面內「股票／目標價」等字樣替成中性詞。關閉後還原先前主題。
        </p>
        <p className="text-sm text-muted-fg mb-6">
          緊急熱鍵：{' '}
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-xs">
            {DISGUISE_HOTKEY_HINT}
          </kbd>
          {' '}在關閉與上次變體間秒切。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDisguiseVariant('off')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              disguiseVariant === 'off'
                ? 'border-primary bg-primary-soft/40'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium text-card-fg">關閉（真實模式）</div>
            <div className="text-sm text-muted-fg mt-1">顯示 Sagafisc 與原始投資文案</div>
            {disguiseVariant === 'off' && (
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary">
                <Check className="w-3 h-3" /> 使用中
              </span>
            )}
          </button>

          {DISGUISE_VARIANT_LIST.map((v) => {
            const selected = disguiseVariant === v.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setDisguiseVariant(v.id as DisguiseVariant)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-primary bg-primary-soft/40'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium text-card-fg">{v.name}</div>
                <div className="text-sm text-muted-fg mt-1">{v.description}</div>
                <div className="text-xs text-muted-fg mt-1">品牌顯示：{v.brand}</div>
                {selected && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary">
                    <Check className="w-3 h-3" /> 使用中
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 外觀主題 */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <Palette className="w-5 h-5 text-primary" />
          外觀主題
        </h2>
        <p className="text-muted-fg mb-6">
          點選即可立即套用，設定會儲存在本機瀏覽器。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THEME_LIST.map((theme) => {
            const selected = themeId === theme.id
            const c = theme.colors
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id as ThemeId)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  selected
                    ? 'border-primary bg-primary-soft/40 shadow-md'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                {/* 色票預覽條 */}
                <div className="flex h-10 rounded-lg overflow-hidden mb-3 border border-border/40">
                  <span className="flex-1" style={{ backgroundColor: rgbToHex(c.bg) }} />
                  <span className="flex-1" style={{ backgroundColor: rgbToHex(c.card) }} />
                  <span className="flex-1" style={{ backgroundColor: rgbToHex(c.primary) }} />
                  <span className="flex-1" style={{ backgroundColor: rgbToHex(c.accent) }} />
                  <span className="flex-1" style={{ backgroundColor: rgbToHex(c.sidebar) }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-card-fg">{theme.name}</div>
                    <div className="text-sm text-muted-fg">{theme.description}</div>
                  </div>
                  {selected && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-soft px-2 py-1 rounded-full shrink-0">
                      <Check className="w-3 h-3" /> 使用中
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Gemini AI 智慧分析核心狀態 */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <Cpu className="w-5 h-5 text-primary" />
          AI 智慧分析引擎
        </h2>
        <p className="text-muted-fg mb-4">
          平台由 AI Studio 雲端環境自動連線 Gemini 旗艦模型，所有 AI 分析工具（含 Google Search 即時聯網）皆已就緒。
        </p>

        <div className="flex items-center gap-3 p-4 bg-success-soft border border-success/30 rounded-xl text-success text-sm mb-6">
          <Check className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block text-card-fg">Gemini AI 核心連線已就緒</span>
            <span className="text-xs text-muted-fg">目前運行旗艦模型：<strong className="text-primary font-mono">{selectedModel}</strong></span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-success/20 rounded-full">
            連線正常
          </span>
        </div>

        <h3 className="text-md font-semibold mb-2 text-card-fg">
          AI 模型切換
        </h3>
        <p className="text-sm text-muted-fg mb-4">
          點選以切換各分析工具優先採用的模型。預設推薦使用最新且最具備深度思考能力的 <strong>Gemini 3.8 Flash</strong>。
        </p>

        <div className="space-y-3">
          {AVAILABLE_MODELS.map((model) => {
            const isSelected = selectedModel === model.id
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelectModel(model.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary-soft/40 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-card/80'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary text-primary-fg'
                        : 'bg-muted text-muted-fg'
                    }`}
                  >
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-card-fg flex items-center gap-2">
                      {model.name}
                      {model.id === 'gemini-3.8-flash' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                          推薦首選
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-fg">{model.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-full border border-primary/30">
                      <Check className="w-3 h-3" /> 使用中
                    </span>
                  ) : (
                    <span className="text-xs text-muted-fg hover:text-card-fg px-2.5 py-1 rounded-full border border-border">
                      選擇
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 市場資料代理 */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <Globe className="w-5 h-5 text-primary" />
          市場資料代理
        </h2>
        <p className="text-muted-fg mb-2">
          決策樹工具透過極薄代理轉發證交所／櫃買／公開資訊觀測站 GET（不存庫）。本機開發使用 Next API Route；正式環境需部署 Cloudflare Pages Function。
        </p>
        <p className="text-sm text-muted-fg mb-6">
          測試會呼叫上市證券基本資料端點，確認代理與上游是否可用。
        </p>
        <button
          onClick={handleTestMarketProxy}
          disabled={proxyStatus === 'testing'}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            proxyStatus === 'testing'
              ? 'bg-muted text-muted-fg cursor-not-allowed'
              : 'bg-primary text-primary-fg hover:opacity-90 shadow-md hover:shadow-lg'
          }`}
        >
          {proxyStatus === 'testing' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              測試中...
            </span>
          ) : (
            '測試市場資料連線'
          )}
        </button>
        {proxyStatus === 'ok' && (
          <div className="mt-4 flex items-start gap-2 text-success text-sm bg-success-soft p-3 rounded-lg">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{proxyMessage}</span>
          </div>
        )}
        {proxyStatus === 'fail' && (
          <div className="mt-4 flex items-start gap-2 text-danger text-sm bg-danger-soft p-3 rounded-lg">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{proxyMessage}</span>
          </div>
        )}
      </div>

      {/* 市場 API 登錄（決策樹等） */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <BookOpen className="w-5 h-5 text-primary" />
          市場 API 登錄
        </h2>
        <p className="text-muted-fg mb-2">
          由 <code className="text-xs bg-muted px-1 rounded">MarketApiRegistry</code> 集中管理；
          決策樹指標解析與代理測試皆從此讀取路徑，方便未來工具共用。
        </p>
        <p className="text-sm text-muted-fg mb-6">
          目前列出模組「{MODULE_DECISION_TREE}」共 {decisionTreeApis.length} 筆。
        </p>

        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {decisionTreeApis.map((ep) => (
            <div
              key={ep.id}
              className="border border-border rounded-xl p-4 bg-card/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-medium text-card-fg">{ep.name}</div>
                  <div className="text-xs font-mono text-muted-fg mt-0.5">{ep.id}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/30">
                    {MARKET_SOURCE_CONFIG[ep.source].label}
                  </span>
                  {ep.isHealthCheck && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/30">
                      連線測試
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-fg mb-2">{ep.description}</p>
              <p className="text-xs font-mono text-card-fg break-all bg-muted/50 rounded-lg px-2 py-1.5">
                {marketApiRegistry.previewUrl(ep.id)}
              </p>
              {ep.usedByIndicators.length > 0 && (
                <p className="mt-2 text-xs text-muted-fg">
                  指標：{ep.usedByIndicators.join('、')}
                </p>
              )}
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold mt-8 mb-2 text-card-fg">外部資料來源</h3>
        <p className="text-sm text-muted-fg mb-4">
          非證交所 proxy、由伺服端套件直接呼叫的來源（例如 Yahoo Finance），另以{' '}
          <code className="text-xs bg-muted px-1 rounded">DATA_PROVIDERS</code> 登錄，與上方
          MarketApiRegistry 並列管理。
        </p>
        <div className="space-y-3">
          {DATA_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="border border-border rounded-xl p-4 bg-card/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-medium text-card-fg">{provider.name}</div>
                  <div className="text-xs font-mono text-muted-fg mt-0.5">{provider.id}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning-soft text-warning border border-warning/30">
                  {provider.kind === 'npm-client' ? '套件直連' : provider.kind}
                </span>
              </div>
              <p className="text-sm text-muted-fg mb-2">{provider.description}</p>
              <p className="text-xs font-mono text-card-fg break-all bg-muted/50 rounded-lg px-2 py-1.5">
                {provider.upstream}
              </p>
              <p className="mt-2 text-xs text-muted-fg">
                模組：{provider.modules.join('、')} · 實作：{provider.implementation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 首頁設定 */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          首頁設定
        </h2>
        <p className="text-muted-fg mb-6">
          選擇您想要設為首頁的工具。登入後將自動導向該工具。
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-4 p-4 border-2 border-border rounded-xl hover:border-primary hover:bg-primary-soft/50 cursor-pointer transition-all duration-200">
            <input
              type="radio"
              name="homepage"
              value=""
              checked={homepageTool === ''}
              onChange={(e) => setHomepageTool(e.target.value)}
              className="w-5 h-5 text-primary focus:ring-2 focus:ring-ring"
            />
            <span className="font-medium text-card-fg">預設首頁（顯示 Dashboard）</span>
          </label>

          {NAVIGATION_TOOLS.map((tool) => (
            <label
              key={tool.id}
              className="flex items-center space-x-4 p-4 border-2 border-border rounded-xl hover:border-primary hover:bg-primary-soft/50 cursor-pointer transition-all duration-200"
            >
              <input
                type="radio"
                name="homepage"
                value={tool.id}
                checked={homepageTool === tool.id}
                onChange={(e) => setHomepageTool(e.target.value)}
                className="w-5 h-5 text-primary focus:ring-2 focus:ring-ring"
              />
              <div className="p-2 bg-primary-soft rounded-lg">
                <ToolIcon toolId={tool.id} className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-card-fg">{tool.name}</div>
                <div className="text-sm text-muted-fg">{tool.description}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveHomepage}
          className="px-6 py-3 rounded-xl font-medium bg-primary text-primary-fg hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200"
        >
          儲存首頁設定
        </button>
      </div>
    </div>
  )
}

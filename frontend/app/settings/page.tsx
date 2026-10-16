'use client'

import { useState, useEffect } from 'react'
import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useRouter } from 'next/navigation'
import { AVAILABLE_MODELS, testAvailableModels } from '@/lib/gemini'
import {
  marketApiRegistry,
  MODULE_DECISION_TREE,
} from '@/lib/tools/decision-tree/apiRegistry'
import { testMarketProxyConnection } from '@/lib/tools/decision-tree/marketClient'
import { MARKET_SOURCE_CONFIG } from '@/lib/tools/decision-tree/proxyAllowlist'
import { Cpu, Check, X, Loader2, Globe, Palette, BookOpen, EyeOff } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { THEME_LIST, rgbToHex, type ThemeId } from '@/config/themes'

/**
 * 設定頁：外觀主題、Gemini API Key、模型選擇與首頁工具。
 */
export default function SettingsPage() {
  const router = useRouter()
  const { themeId, setTheme, disguise, setDisguise } = useTheme()
  const [homepageTool, setHomepageTool] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle')
  const [keyError, setKeyError] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelTesting, setModelTesting] = useState(false)
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [proxyMessage, setProxyMessage] = useState('')
  /** 決策樹已登錄的市場 API（class registry） */
  const decisionTreeApis = marketApiRegistry.listByModule(MODULE_DECISION_TREE)

  useEffect(() => {
    const saved = localStorage.getItem('homepage_tool')
    if (saved) setHomepageTool(saved)

    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setKeyStatus('valid')
    }

    const savedModel = localStorage.getItem('gemini_model')
    if (savedModel) setSelectedModel(savedModel)

    const savedAvailable = localStorage.getItem('gemini_available_models')
    if (savedAvailable) {
      try { setAvailableModels(JSON.parse(savedAvailable)) } catch { /* ignore */ }
    }
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

  /** 驗證 API Key、偵測可用模型並寫入 localStorage。 */
  const handleTestAndSaveKey = async () => {
    if (!apiKey.trim()) {
      localStorage.removeItem('gemini_api_key')
      setKeyStatus('idle')
      setKeyError('')
      setAvailableModels([])
      localStorage.removeItem('gemini_available_models')
      alert('已清除 API Key')
      return
    }

    setKeyStatus('testing')
    setKeyError('')
    setModelTesting(true)

    try {
      const available = await testAvailableModels(apiKey.trim())

      if (available.length > 0) {
        localStorage.setItem('gemini_api_key', apiKey.trim())
        setAvailableModels(available)
        localStorage.setItem('gemini_available_models', JSON.stringify(available))
        setKeyStatus('valid')

        if (!available.includes(selectedModel)) {
          const best = available[0]
          setSelectedModel(best)
          localStorage.setItem('gemini_model', best)
        }
      } else {
        try {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey: apiKey.trim() })
          await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Reply with exactly: OK',
            config: { maxOutputTokens: 10 },
          })
        } catch (err: any) {
          const msg = err?.message || String(err)
          if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
            setKeyStatus('invalid')
            setKeyError('API Key 無效，請確認是否正確。')
            setModelTesting(false)
            return
          } else if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
            setKeyStatus('invalid')
            setKeyError('API Key 權限不足，請確認是否已啟用 Gemini API。')
            setModelTesting(false)
            return
          }
          localStorage.setItem('gemini_api_key', apiKey.trim())
          setKeyStatus('valid')
          setKeyError('API Key 有效，但所有模型配額已用完。請稍後再試。')
        }
      }
    } catch (error: any) {
      setKeyStatus('invalid')
      setKeyError(`驗證失敗：${error?.message || String(error)}`)
    } finally {
      setModelTesting(false)
    }
  }

  /** 選擇 AI 模型並持久化。 */
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('gemini_model', modelId)
  }

  /** 清除 API Key 與相關模型設定。 */
  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key')
    localStorage.removeItem('gemini_model')
    localStorage.removeItem('gemini_available_models')
    setApiKey('')
    setKeyStatus('idle')
    setKeyError('')
    setAvailableModels([])
    setSelectedModel('gemini-2.0-flash')
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

      {/* 上班摸魚／偽裝模式（最小可用版） */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
          <EyeOff className="w-5 h-5 text-primary" />
          上班摸魚模式
        </h2>
        <p className="text-muted-fg mb-6">
          開啟後切換為聊天助手外觀、隱藏品牌，並把側欄工具改成中性「對話」名稱。關閉後還原先前主題。
        </p>
        <button
          type="button"
          onClick={() => setDisguise(!disguise)}
          className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all ${
            disguise
              ? 'border-primary bg-primary-soft/40'
              : 'border-border hover:border-primary/50'
          }`}
          aria-pressed={disguise}
        >
          <div className="text-left">
            <div className="font-medium text-card-fg">
              {disguise ? '偽裝已開啟' : '偽裝已關閉'}
            </div>
            <div className="text-sm text-muted-fg">
              {disguise
                ? '分頁標題顯示 Chat；側欄為對話列表風格'
                : '點此一鍵偽裝成通用 AI 對話介面'}
            </div>
          </div>
          <span
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              disguise ? 'bg-primary' : 'bg-muted border border-border'
            }`}
            aria-hidden
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-card shadow transition-transform ${
                disguise ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
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

      {/* Gemini API Key 設定 */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
        <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-warning to-warning/70 rounded-full"></span>
          Gemini API Key
        </h2>
        <p className="text-muted-fg mb-2">
          輸入您的 Google Gemini API Key 以使用所有 AI 分析功能（含 Web Search）。
        </p>
        <p className="text-sm text-muted-fg mb-6">
          您的 API Key 僅儲存在瀏覽器本地 (localStorage)，不會傳送至伺服器。
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80 ml-1 underline"
          >
            取得 API Key
          </a>
        </p>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setKeyStatus('idle')
                setKeyError('')
              }}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 pr-24 border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-ring/30 outline-none transition-all text-card-fg bg-card font-mono text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-fg hover:text-card-fg px-2 py-1"
            >
              {showKey ? '隱藏' : '顯示'}
            </button>
          </div>

          {keyStatus === 'valid' && (
            <div className="flex items-center gap-2 text-success text-sm bg-success-soft p-3 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>API Key 已驗證且儲存{availableModels.length > 0 ? ` — ${availableModels.length} 個模型可用` : ''}</span>
              {keyError && <span className="text-warning ml-2">({keyError})</span>}
            </div>
          )}
          {keyStatus === 'invalid' && keyError && (
            <div className="flex items-center gap-2 text-danger text-sm bg-danger-soft p-3 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{keyError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestAndSaveKey}
              disabled={keyStatus === 'testing' || !apiKey.trim()}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                keyStatus === 'testing'
                  ? 'bg-muted text-muted-fg cursor-not-allowed'
                  : !apiKey.trim()
                  ? 'bg-muted text-muted-fg cursor-not-allowed'
                  : 'bg-primary text-primary-fg hover:opacity-90 shadow-md hover:shadow-lg'
              }`}
            >
              {keyStatus === 'testing' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {modelTesting ? '偵測可用模型中...' : '驗證中...'}
                </span>
              ) : (
                '驗證並儲存 API Key'
              )}
            </button>
            {apiKey && (
              <button
                onClick={handleClearKey}
                className="px-6 py-3 rounded-xl font-medium border-2 border-border text-muted-fg hover:border-danger hover:text-danger hover:bg-danger-soft transition-all duration-200"
              >
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 模型選擇 */}
      {keyStatus === 'valid' && (
        <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-border/50">
          <h2 className="text-xl font-semibold mb-2 text-card-fg flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-success to-accent rounded-full"></span>
            <Cpu className="w-5 h-5 text-success" />
            AI 模型選擇
          </h2>
          <p className="text-muted-fg mb-2">
            選擇 AI 分析使用的模型。若選擇的模型配額用盡，系統會自動降級至下一個可用模型。
          </p>
          <p className="text-sm text-muted-fg mb-6">
            驗證 API Key 時已自動偵測您的帳號可使用的模型。
          </p>

          <div className="space-y-3">
            {AVAILABLE_MODELS.map((model) => {
              const isAvailable = availableModels.includes(model.id)
              const isSelected = selectedModel === model.id
              return (
                <button
                  key={model.id}
                  onClick={() => isAvailable && handleSelectModel(model.id)}
                  disabled={!isAvailable}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected && isAvailable
                      ? 'border-success bg-success-soft shadow-sm'
                      : isAvailable
                      ? 'border-border hover:border-success/50 hover:bg-success-soft/50 cursor-pointer'
                      : 'border-border bg-muted opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected && isAvailable
                        ? 'bg-success text-primary-fg'
                        : isAvailable
                        ? 'bg-muted text-muted-fg'
                        : 'bg-muted text-muted-fg'
                    }`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-card-fg">{model.name}</div>
                      <div className="text-sm text-muted-fg">{model.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-success bg-success-soft px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> 可用
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-fg bg-muted px-2 py-1 rounded-full">
                        <X className="w-3 h-3" /> 不可用
                      </span>
                    )}
                    {isSelected && isAvailable && (
                      <span className="text-xs font-medium text-success bg-success-soft px-2 py-1 rounded-full">
                        使用中
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

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

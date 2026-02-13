'use client'

import { useState, useEffect } from 'react'
import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useRouter } from 'next/navigation'
import { AVAILABLE_MODELS, testAvailableModels } from '@/lib/gemini'
import { Cpu, Check, X, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [homepageTool, setHomepageTool] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle')
  const [keyError, setKeyError] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelTesting, setModelTesting] = useState(false)

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
      // Test which models are available
      const available = await testAvailableModels(apiKey.trim())

      if (available.length > 0) {
        localStorage.setItem('gemini_api_key', apiKey.trim())
        setAvailableModels(available)
        localStorage.setItem('gemini_available_models', JSON.stringify(available))
        setKeyStatus('valid')

        // Auto-select the best available model
        if (!available.includes(selectedModel)) {
          const best = available[0]
          setSelectedModel(best)
          localStorage.setItem('gemini_model', best)
        }
      } else {
        // No models available — key might still be valid but all quota exhausted
        // Try basic validation
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
          // 429 means key is valid but quota exhausted
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

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('gemini_model', modelId)
  }

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

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
          設定
        </h1>
        <p className="text-surface-400">個人化您的 Sagafisc 體驗</p>
      </div>

      {/* Gemini API Key 設定 */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-surface-200/50">
        <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
          Gemini API Key
        </h2>
        <p className="text-gray-600 mb-2">
          輸入您的 Google Gemini API Key 以使用所有 AI 分析功能（含 Web Search）。
        </p>
        <p className="text-sm text-gray-500 mb-6">
          您的 API Key 僅儲存在瀏覽器本地 (localStorage)，不會傳送至伺服器。
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 ml-1 underline"
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
              className="w-full px-4 py-3 pr-24 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-gray-800 font-mono text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              {showKey ? '隱藏' : '顯示'}
            </button>
          </div>

          {/* 狀態提示 */}
          {keyStatus === 'valid' && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>API Key 已驗證且儲存{availableModels.length > 0 ? ` — ${availableModels.length} 個模型可用` : ''}</span>
              {keyError && <span className="text-amber-600 ml-2">({keyError})</span>}
            </div>
          )}
          {keyStatus === 'invalid' && keyError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
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
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : !apiKey.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg'
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
                className="px-6 py-3 rounded-xl font-medium border-2 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 模型選擇 */}
      {keyStatus === 'valid' && (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-surface-200/50">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
            <Cpu className="w-5 h-5 text-emerald-600" />
            AI 模型選擇
          </h2>
          <p className="text-gray-600 mb-2">
            選擇 AI 分析使用的模型。若選擇的模型配額用盡，系統會自動降級至下一個可用模型。
          </p>
          <p className="text-sm text-gray-500 mb-6">
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
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : isAvailable
                      ? 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected && isAvailable
                        ? 'bg-emerald-500 text-white'
                        : isAvailable
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{model.name}</div>
                      <div className="text-sm text-gray-500">{model.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> 可用
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        <X className="w-3 h-3" /> 不可用
                      </span>
                    )}
                    {isSelected && isAvailable && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
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

      {/* 首頁設定 */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6 border border-surface-200/50">
        <h2 className="text-xl font-semibold mb-2 text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary-600 to-blue-600 rounded-full"></span>
          首頁設定
        </h2>
        <p className="text-gray-600 mb-6">
          選擇您想要設為首頁的工具。登入後將自動導向該工具。
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-all duration-200">
            <input
              type="radio"
              name="homepage"
              value=""
              checked={homepageTool === ''}
              onChange={(e) => setHomepageTool(e.target.value)}
              className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <span className="font-medium text-gray-800">預設首頁（顯示 Dashboard）</span>
          </label>

          {NAVIGATION_TOOLS.map((tool) => (
            <label
              key={tool.id}
              className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-all duration-200"
            >
              <input
                type="radio"
                name="homepage"
                value={tool.id}
                checked={homepageTool === tool.id}
                onChange={(e) => setHomepageTool(e.target.value)}
                className="w-5 h-5 text-primary-600 focus:ring-2 focus:ring-primary-500"
              />
              <div className="p-2 bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg">
                <ToolIcon toolId={tool.id} className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{tool.name}</div>
                <div className="text-sm text-gray-500">{tool.description}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSaveHomepage}
          className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-primary-600 to-blue-600 text-white hover:from-primary-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200"
        >
          儲存首頁設定
        </button>
      </div>
    </div>
  )
}

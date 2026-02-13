'use client'

import { useState, useEffect } from 'react'
import { NAVIGATION_TOOLS } from '@/config/tools'
import { ToolIcon } from '@/components/ToolIcons'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [homepageTool, setHomepageTool] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle')
  const [keyError, setKeyError] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem('homepage_tool')
    if (saved) setHomepageTool(saved)

    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) {
      setApiKey(savedKey)
      setKeyStatus('valid')
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
      alert('已清除 API Key')
      return
    }

    setKeyStatus('testing')
    setKeyError('')

    try {
      // 使用動態 import 以避免打包問題
      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

      // 測試 API Key 是否有效，同時測試 Web Search 功能
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Reply with exactly: OK',
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 10,
        },
      })

      if (response.text) {
        localStorage.setItem('gemini_api_key', apiKey.trim())
        setKeyStatus('valid')
        alert('API Key 驗證成功！已儲存。Web Search 功能正常。')
      } else {
        throw new Error('未收到回應')
      }
    } catch (error: any) {
      setKeyStatus('invalid')
      const msg = error?.message || String(error)
      if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        setKeyError('API Key 無效，請確認是否正確。')
      } else if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
        setKeyError('API Key 權限不足，請確認是否已啟用 Gemini API。')
      } else if (msg.includes('QUOTA') || msg.includes('429')) {
        // Quota 錯誤代表 key 本身是有效的
        localStorage.setItem('gemini_api_key', apiKey.trim())
        setKeyStatus('valid')
        setKeyError('API Key 有效，但目前已達配額上限。已儲存。')
      } else {
        setKeyError(`驗證失敗：${msg}`)
      }
    }
  }

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key')
    setApiKey('')
    setKeyStatus('idle')
    setKeyError('')
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
          設定
        </h1>
        <p className="text-gray-600">個人化您的 Sagafisc 體驗</p>
      </div>

      {/* Gemini API Key 設定 */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
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
              <span>API Key 已驗證且儲存 - Web Search 功能可用</span>
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

          {/* Web Search 說明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Web Search 功能說明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>- 所有 AI 分析工具都使用 Google Search Grounding 取得即時數據</li>
              <li>- API Key 需具備 Gemini API 權限即可自動啟用 Web Search</li>
              <li>- 系統會驗證 API Key 時同時檢查 Web Search 是否可用</li>
            </ul>
          </div>

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
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  驗證中...
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

      {/* 首頁設定 */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
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

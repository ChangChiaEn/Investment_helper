'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, ExternalLink, AlertTriangle, Bot } from 'lucide-react'
import { sendMessageToGemini } from '@/lib/tools/alphastrategist/service'
import { Message, Sender, GroundingChunk } from '@/lib/tools/alphastrategist/types'

const INITIAL_MESSAGE: Message = {
  id: 'init',
  text: '你好！我是您的專屬首席投資策略師。我可以為您分析台股籌碼面、美股基本面，或是推薦鉅亨網上架的優質基金。請問今天想了解哪一檔股票或基金？',
  sender: Sender.Bot,
  timestamp: Date.now(),
}

// Simple inline markdown renderer: ##, ###, *, **bold**, numbered lists
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')

  return lines.map((line, idx) => {
    const trimmed = line.trim()

    if (trimmed === '') {
      return <div key={idx} className="h-2" />
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-base font-semibold text-gray-800 mt-3 mb-1">
          {renderInline(trimmed.slice(4))}
        </h3>
      )
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-lg font-bold text-gray-900 mt-4 mb-2">
          {renderInline(trimmed.slice(3))}
        </h2>
      )
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
          <span className="text-blue-500 mt-1.5 text-xs leading-none">{'\u2022'}</span>
          <span className="text-gray-700 text-sm leading-relaxed">{renderInline(trimmed.slice(2))}</span>
        </div>
      )
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/)
    if (numberedMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
          <span className="text-blue-600 font-semibold text-sm min-w-[1.25rem]">{numberedMatch[1]}.</span>
          <span className="text-gray-700 text-sm leading-relaxed">{renderInline(numberedMatch[2])}</span>
        </div>
      )
    }

    return (
      <p key={idx} className="text-gray-700 text-sm leading-relaxed my-0.5">
        {renderInline(trimmed)}
      </p>
    )
  })
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <Bot className="w-4 h-4 text-blue-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function GroundingSources({ chunks }: { chunks: GroundingChunk[] }) {
  const validChunks = chunks.filter((c) => c.web?.uri)
  if (validChunks.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {validChunks.map((chunk, idx) => {
        const uri = chunk.web?.uri || ''
        let label = chunk.web?.title || ''
        if (!label) {
          try { label = new URL(uri).hostname } catch { label = 'Source' }
        }
        return (
          <a
            key={idx}
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors border border-gray-100"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span className="truncate max-w-[180px]">{label}</span>
          </a>
        )
      })}
    </div>
  )
}

function MessageDisclaimer() {
  return (
    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
      <AlertTriangle className="w-2.5 h-2.5" />
      <span>AI 生成內容僅供參考，投資有風險請謹慎評估</span>
    </div>
  )
}

export default function AlphaStrategistPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: Sender.User,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await sendMessageToGemini(
        messages.filter((m) => m.id !== 'init'),
        text
      )

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: result.text,
        sender: Sender.Bot,
        timestamp: Date.now(),
        groundingChunks: result.groundingChunks,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        text: '連線發生錯誤，請稍後再試。',
        sender: Sender.Bot,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
        {messages.map((msg) => {
          if (msg.sender === Sender.User) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-xl bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-3xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                  <div className="prose-sm max-w-none">{renderMarkdown(msg.text)}</div>
                  {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <GroundingSources chunks={msg.groundingChunks} />
                  )}
                  <MessageDisclaimer />
                </div>
              </div>
            </div>
          )
        })}

        {isLoading && <ThinkingBubble />}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      <div className="border-t border-surface-700 bg-surface-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="請輸入您想分析的股票或基金..."
            className="flex-1 px-4 py-2.5 bg-surface-800 border border-surface-600 rounded-xl text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

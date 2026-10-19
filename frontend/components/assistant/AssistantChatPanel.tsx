'use client'

/**
 * 綜合助理聊天本體：訊息列表、markdown、grounding、輸入框。
 * 狀態由 AssistantContext 提供，可嵌入全頁或懸浮抽屜。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Send, Loader2, ExternalLink, AlertTriangle, Bot } from 'lucide-react'
import { useAssistant } from '@/contexts/AssistantContext'
import { Sender, type GroundingChunk } from '@/lib/tools/alphastrategist/types'

/**
 * 簡易 markdown：##、###、列表、**粗體**。
 * @param text - 原始文字
 */
function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n')

  return lines.map((line, idx) => {
    const trimmed = line.trim()

    if (trimmed === '') {
      return <div key={idx} className="h-2" />
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-base font-semibold text-card-fg mt-3 mb-1">
          {renderInline(trimmed.slice(4))}
        </h3>
      )
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-lg font-bold text-card-fg mt-4 mb-2">
          {renderInline(trimmed.slice(3))}
        </h2>
      )
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
          <span className="text-primary mt-1.5 text-xs leading-none">{'\u2022'}</span>
          <span className="text-card-fg text-sm leading-relaxed">{renderInline(trimmed.slice(2))}</span>
        </div>
      )
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/)
    if (numberedMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
          <span className="text-primary font-semibold text-sm min-w-[1.25rem]">{numberedMatch[1]}.</span>
          <span className="text-card-fg text-sm leading-relaxed">{renderInline(numberedMatch[2])}</span>
        </div>
      )
    }

    return (
      <p key={idx} className="text-card-fg text-sm leading-relaxed my-0.5">
        {renderInline(trimmed)}
      </p>
    )
  })
}

/**
 * 行內 **粗體**。
 * @param text - 單行文字
 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-card-fg">
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
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
          try {
            label = new URL(uri).hostname
          } catch {
            label = 'Source'
          }
        }
        return (
          <a
            key={idx}
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-fg hover:text-primary bg-muted hover:bg-primary-soft px-2 py-1 rounded-md transition-colors border border-border"
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
    <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-fg">
      <AlertTriangle className="w-2.5 h-2.5" />
      <span>AI 生成內容僅供參考，投資有風險請謹慎評估</span>
    </div>
  )
}

/**
 * 聊天面板本體（無外框標題列）。
 */
export function AssistantChatPanel() {
  const { messages, isLoading, send } = useAssistant()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await send(text)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          if (msg.sender === Sender.User) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[90%] bg-primary text-primary-fg rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-full">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
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

      <div className="border-t border-border bg-card px-3 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="請輸入您想分析的股票或基金..."
            className="flex-1 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-fg placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            disabled={isLoading}
            aria-label="助理訊息輸入"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-primary hover:opacity-90 disabled:bg-muted disabled:cursor-not-allowed text-primary-fg rounded-xl transition-colors flex-shrink-0"
            aria-label="送出"
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

'use client'

/**
 * 全域綜合助理狀態：面板開關、對話紀錄與送訊。
 * 對話寫入 localStorage，切換工具頁不丟失。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { sendMessageToGemini } from '@/lib/tools/alphastrategist/service'
import { Message, Sender } from '@/lib/tools/alphastrategist/types'

/** localStorage：對話訊息 */
const CHAT_STORAGE_KEY = 'sagafisc_assistant_chat'
/** localStorage：面板是否開啟（可選還原） */
const OPEN_STORAGE_KEY = 'sagafisc_assistant_open'

/** 首次進入的歡迎訊息 */
export const ASSISTANT_INITIAL_MESSAGE: Message = {
  id: 'init',
  text: '你好！我是您的專屬首席投資策略師。我可以為您分析台股籌碼面、美股基本面，或是推薦鉅亨網上架的優質基金。請問今天想了解哪一檔股票或基金？',
  sender: Sender.Bot,
  timestamp: Date.now(),
}

interface AssistantContextValue {
  open: boolean
  messages: Message[]
  isLoading: boolean
  /** 切換面板 */
  toggle: () => void
  /** 開啟面板 */
  openPanel: () => void
  /** 關閉面板 */
  closePanel: () => void
  /** 送出使用者訊息 */
  send: (text: string) => Promise<void>
  /** 清空對話（保留歡迎句） */
  clearChat: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

/**
 * 自 localStorage 讀取對話；失敗時回傳初始歡迎訊息。
 * @returns Message[]
 */
function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [ASSISTANT_INITIAL_MESSAGE]
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return [ASSISTANT_INITIAL_MESSAGE]
    const parsed = JSON.parse(raw) as Message[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [ASSISTANT_INITIAL_MESSAGE]
    }
    return parsed
  } catch {
    return [ASSISTANT_INITIAL_MESSAGE]
  }
}

/**
 * 提供全站綜合助理狀態與操作。
 * @param children - 子節點
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([ASSISTANT_INITIAL_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // 掛載後還原對話與面板狀態（避免 SSR hydration 不一致）
  useEffect(() => {
    setMessages(loadMessages())
    setOpen(localStorage.getItem(OPEN_STORAGE_KEY) === '1')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // 儲存空間不足時略過，不中斷聊天
    }
  }, [messages, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0')
  }, [open, hydrated])

  const toggle = useCallback(() => setOpen((v) => !v), [])
  const openPanel = useCallback(() => setOpen(true), [])
  const closePanel = useCallback(() => setOpen(false), [])

  const clearChat = useCallback(() => {
    setMessages([{ ...ASSISTANT_INITIAL_MESSAGE, timestamp: Date.now() }])
  }, [])

  /**
   * 送出訊息並呼叫既有 Gemini 服務（不改 system prompt）。
   * @param text - 使用者輸入
   */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: trimmed,
        sender: Sender.User,
        timestamp: Date.now(),
      }

      // 先寫入使用者訊息，再以「含此則之前的歷史」呼叫 API
      setMessages((prev) => {
        const next = [...prev, userMessage]
        return next
      })
      setIsLoading(true)

      try {
        // 歷史不含歡迎句與剛加入的 user（service 會再 push newMessage）
        const historyForApi = [...messages, userMessage].filter((m) => m.id !== 'init')
        // sendMessageToGemini 會自行 append newMessage，故 history 不含最新 user
        const historyWithoutLatest = historyForApi.slice(0, -1)
        const result = await sendMessageToGemini(historyWithoutLatest, trimmed)

        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: result.text,
          sender: Sender.Bot,
          timestamp: Date.now(),
          groundingChunks: result.groundingChunks,
        }
        setMessages((prev) => [...prev, botMessage])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            text: '連線發生錯誤，請稍後再試。',
            sender: Sender.Bot,
            timestamp: Date.now(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  const value = useMemo(
    () => ({
      open,
      messages,
      isLoading,
      toggle,
      openPanel,
      closePanel,
      send,
      clearChat,
    }),
    [open, messages, isLoading, toggle, openPanel, closePanel, send, clearChat]
  )

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  )
}

/**
 * 讀取綜合助理 Context。
 * @throws 未包在 AssistantProvider 內時
 */
export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider')
  return ctx
}

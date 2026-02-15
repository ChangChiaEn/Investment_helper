'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// ============================================================
// Types
// ============================================================

export interface WatchlistItem {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'fund'
  source?: string
  addedAt: number
}

interface WatchlistContextType {
  items: WatchlistItem[]
  add: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
  remove: (id: string) => void
  has: (symbol: string, type: 'stock' | 'fund') => boolean
  toggle: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
}

// ============================================================
// Storage Adapter Interface
// 未來接後端時，只需實作此 interface 並替換 Provider 的 adapter prop
// ============================================================

export interface WatchlistStorage {
  load: () => Promise<WatchlistItem[]>
  save: (items: WatchlistItem[]) => Promise<void>
}

// --- localStorage 實作 (預設) ---

const STORAGE_KEY = 'sagafisc_watchlist'

export const localStorageAdapter: WatchlistStorage = {
  load: async () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },
  save: async (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },
}

// --- API 實作範例 (未來啟用時取消註解或新增檔案) ---
//
// export const apiStorageAdapter: WatchlistStorage = {
//   load: async () => {
//     const res = await fetch('/api/v1/watchlist', {
//       headers: { Authorization: `Bearer ${getToken()}` },
//     })
//     if (!res.ok) throw new Error('Failed to load watchlist')
//     return res.json()
//   },
//   save: async (items) => {
//     await fetch('/api/v1/watchlist', {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${getToken()}`,
//       },
//       body: JSON.stringify(items),
//     })
//   },
// }

// ============================================================
// Context & Provider
// ============================================================

function makeId(symbol: string, type: string) {
  return `${type}-${symbol}`
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined)

interface WatchlistProviderProps {
  children: ReactNode
  storage?: WatchlistStorage  // 預設使用 localStorage，傳入可替換
}

export function WatchlistProvider({ children, storage = localStorageAdapter }: WatchlistProviderProps) {
  const [items, setItems] = useState<WatchlistItem[]>([])

  useEffect(() => {
    storage.load().then(setItems).catch(() => setItems([]))
  }, [storage])

  const persist = useCallback((next: WatchlistItem[]) => {
    storage.save(next).catch(console.error)
  }, [storage])

  const add = useCallback((item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    setItems(prev => {
      const id = makeId(item.symbol, item.type)
      if (prev.some(i => i.id === id)) return prev
      const next = [...prev, { ...item, id, addedAt: Date.now() }]
      persist(next)
      return next
    })
  }, [persist])

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      persist(next)
      return next
    })
  }, [persist])

  const has = useCallback((symbol: string, type: 'stock' | 'fund') => {
    return items.some(i => i.id === makeId(symbol, type))
  }, [items])

  const toggle = useCallback((item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    const id = makeId(item.symbol, item.type)
    setItems(prev => {
      if (prev.some(i => i.id === id)) {
        const next = prev.filter(i => i.id !== id)
        persist(next)
        return next
      }
      const next = [...prev, { ...item, id, addedAt: Date.now() }]
      persist(next)
      return next
    })
  }, [persist])

  return (
    <WatchlistContext.Provider value={{ items, add, remove, has, toggle }}>
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return context
}

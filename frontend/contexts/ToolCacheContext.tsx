'use client'

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react'

interface ToolCacheContextType {
  getCache: (toolId: string) => any | null
  setCache: (toolId: string, state: any) => void
}

const ToolCacheContext = createContext<ToolCacheContextType | undefined>(undefined)

export function ToolCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, any>>(new Map())

  const getCache = useCallback((toolId: string) => {
    return cacheRef.current.get(toolId) ?? null
  }, [])

  const setCache = useCallback((toolId: string, state: any) => {
    cacheRef.current.set(toolId, state)
  }, [])

  return (
    <ToolCacheContext.Provider value={{ getCache, setCache }}>
      {children}
    </ToolCacheContext.Provider>
  )
}

export function useToolCacheContext() {
  const context = useContext(ToolCacheContext)
  if (!context) {
    throw new Error('useToolCacheContext must be used within ToolCacheProvider')
  }
  return context
}

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useToolCacheContext } from '@/contexts/ToolCacheContext'

export function useToolCache<T = any>(toolId: string) {
  const { getCache, setCache } = useToolCacheContext()
  const initialRef = useRef<T | null>(null)

  // Only read cache once on first call
  if (initialRef.current === null) {
    initialRef.current = getCache(toolId) as T | null
  }

  const save = useCallback((state: T) => {
    setCache(toolId, state)
  }, [toolId, setCache])

  return {
    cached: initialRef.current,
    save,
  }
}

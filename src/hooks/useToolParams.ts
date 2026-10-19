/**
 * Hook 用於從 URL 參數讀取標的資料
 * 供各個工具使用
 */
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface ToolParams {
  symbol?: string
  name?: string
  type?: 'stock' | 'fund'
  source?: string
}

export function useToolParams(): ToolParams {
  const searchParams = useSearchParams()
  const [params, setParams] = useState<ToolParams>({})

  useEffect(() => {
    const symbol = searchParams.get('symbol') || undefined
    const name = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : undefined
    const type = (searchParams.get('type') as 'stock' | 'fund') || undefined
    const source = searchParams.get('source') || undefined

    setParams({ symbol, name, type, source })
  }, [searchParams])

  return params
}


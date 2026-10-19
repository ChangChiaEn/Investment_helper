'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ToolData {
  symbol?: string
  name?: string
  type?: 'stock' | 'fund'
  source?: string
  [key: string]: any
}

interface ToolDataState {
  targetTool: string | null
  data: ToolData | null
}

interface ToolDataContextType {
  toolData: ToolDataState | null
  setToolData: (toolId: string, data: ToolData) => void
  clearToolData: () => void
}

const ToolDataContext = createContext<ToolDataContextType | undefined>(undefined)

export function ToolDataProvider({ children }: { children: ReactNode }) {
  const [toolData, setToolDataState] = useState<ToolDataState | null>(null)

  const setToolData = (toolId: string, data: ToolData) => {
    setToolDataState({ targetTool: toolId, data })
  }

  const clearToolData = () => {
    setToolDataState(null)
  }

  return (
    <ToolDataContext.Provider value={{ toolData, setToolData, clearToolData }}>
      {children}
    </ToolDataContext.Provider>
  )
}

export function useToolData() {
  const context = useContext(ToolDataContext)
  if (!context) {
    throw new Error('useToolData must be used within ToolDataProvider')
  }
  return context
}


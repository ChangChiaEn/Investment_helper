/**
 * 工具圖標組件
 * 使用 lucide-react 圖標替代 emoji
 */
'use client'

import { 
  BarChart3, 
  Search, 
  TrendingUp, 
  Briefcase, 
  AlertTriangle, 
  Wallet, 
  Bot, 
  BookOpen,
  GitBranch,
  Crosshair,
  History,
  Package,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'trend-dashboard': BarChart3,
  'ai-stock-analyst': Search,
  'gemini-stock-prophet': TrendingUp,
  'tw-stock-target': Crosshair,
  'fund-assistant': Briefcase,
  'fund-risk-analysis': AlertTriangle,
  'asset-analysis': Wallet,
  inventory: Package,
  'decision-tree': GitBranch,
  history: History,
  'alphastrategist': Bot,
  'fund-insight': BookOpen,
}

interface ToolIconProps {
  toolId: string
  className?: string
}

export function ToolIcon({ toolId, className = 'w-5 h-5' }: ToolIconProps) {
  const IconComponent = iconMap[toolId] || BarChart3
  return <IconComponent className={className} />
}


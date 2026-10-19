import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'

// Direct page imports to ensure all routes are immediately available and avoid dynamic import fetch errors
import HomePage from '@/pages/HomePage'
import SettingsPage from '@/pages/SettingsPage'
import AIStockAnalystPage from '@/pages/tools/ai-stock-analyst/page'
import AlphaStrategistPage from '@/pages/tools/alphastrategist/page'
import AssetAnalysisPage from '@/pages/tools/asset-analysis/page'
import DecisionTreePage from '@/pages/tools/decision-tree/page'
import FundAssistantPage from '@/pages/tools/fund-assistant/page'
import FundInsightPage from '@/pages/tools/fund-insight/page'
import FundRiskAnalysisPage from '@/pages/tools/fund-risk-analysis/page'
import GeminiStockProphetPage from '@/pages/tools/gemini-stock-prophet/page'
import HistoryPage from '@/pages/tools/history/page'
import InventoryPage from '@/pages/tools/inventory/page'
import TrendDashboardPage from '@/pages/tools/trend-dashboard/page'
import TaiwanStockTargetPage from '@/pages/tools/tw-stock-target/page'
import ToolPage from '@/pages/tools/[toolId]/page'

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tools/inventory" element={<InventoryPage />} />
        <Route path="/tools/history" element={<HistoryPage />} />
        <Route path="/tools/trend-dashboard" element={<TrendDashboardPage />} />
        <Route path="/tools/ai-stock-analyst" element={<AIStockAnalystPage />} />
        <Route path="/tools/fund-insight" element={<FundInsightPage />} />
        <Route path="/tools/gemini-stock-prophet" element={<GeminiStockProphetPage />} />
        <Route path="/tools/fund-assistant" element={<FundAssistantPage />} />
        <Route path="/tools/fund-risk-analysis" element={<FundRiskAnalysisPage />} />
        <Route path="/tools/tw-stock-target" element={<TaiwanStockTargetPage />} />
        <Route path="/tools/decision-tree" element={<DecisionTreePage />} />
        <Route path="/tools/asset-analysis" element={<AssetAnalysisPage />} />
        <Route path="/tools/alphastrategist" element={<AlphaStrategistPage />} />
        <Route path="/tools/:toolId" element={<ToolPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App

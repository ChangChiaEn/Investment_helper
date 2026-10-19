import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Loader } from '@/components/Loader'

const Home = lazy(() => import('@/pages/Home'))
const Settings = lazy(() => import('@/pages/Settings'))
const InventoryPage = lazy(() => import('@/pages/tools/inventory/page'))
const HistoryPage = lazy(() => import('@/pages/tools/history/page'))
const TrendDashboardPage = lazy(() => import('@/pages/tools/trend-dashboard/page'))
const AIStockAnalystPage = lazy(() => import('@/pages/tools/ai-stock-analyst/page'))
const FundInsightPage = lazy(() => import('@/pages/tools/fund-insight/page'))
const GeminiStockProphetPage = lazy(() => import('@/pages/tools/gemini-stock-prophet/page'))
const FundAssistantPage = lazy(() => import('@/pages/tools/fund-assistant/page'))
const FundRiskAnalysisPage = lazy(() => import('@/pages/tools/fund-risk-analysis/page'))
const TaiwanStockTargetPage = lazy(() => import('@/pages/tools/tw-stock-target/page'))
const DecisionTreePage = lazy(() => import('@/pages/tools/decision-tree/page'))
const AssetAnalysisPage = lazy(() => import('@/pages/tools/asset-analysis/page'))
const AlphaStrategistPage = lazy(() => import('@/pages/tools/alphastrategist/page'))
const ToolPage = lazy(() => import('@/pages/tools/[toolId]/page'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
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
        </Suspense>
      </AppShell>
    </BrowserRouter>
  )
}

export default App

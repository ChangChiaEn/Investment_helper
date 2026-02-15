import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { ToolDataProvider } from '@/contexts/ToolDataContext'
import { WatchlistProvider } from '@/contexts/WatchlistContext'
import { ToolCacheProvider } from '@/contexts/ToolCacheContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sagafisc 智慧投研平台',
  description: '整合多個 AI 分析工具的智慧投資研究平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <ToolDataProvider>
          <WatchlistProvider>
            <ToolCacheProvider>
              <div className="flex h-screen bg-surface-950">
                <Navigation />
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </ToolCacheProvider>
          </WatchlistProvider>
        </ToolDataProvider>
      </body>
    </html>
  )
}


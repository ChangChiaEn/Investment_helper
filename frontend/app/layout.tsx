import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { ToolDataProvider } from '@/contexts/ToolDataContext'

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
          <div className="flex h-screen bg-gray-50">
            <Navigation />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </ToolDataProvider>
      </body>
    </html>
  )
}


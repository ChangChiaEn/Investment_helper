import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sagafisc 智慧投研平台',
  description: '整合多個 AI 分析工具的智慧投資研究平台',
  // 明確指定圖示，避免瀏覽器另請求不存在的 /favicon.ico
  icons: {
    icon: '/Sagafisc.png',
  },
}

/**
 * 根版面：僅負責 html/body 與字型，互動外殼交給 AppShell（客戶端掛載後渲染）。
 * @param children - 各頁面內容
 * @returns 全站根節點
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

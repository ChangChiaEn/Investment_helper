import type { Metadata } from 'next'
import { Noto_Sans_TC, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  THEME_CSS_VAR_MAP,
} from '@/config/themes'

/**
 * 全站 UI 字體：Noto Sans TC（繁中＋拉丁一體，避免中英混排跳字型）。
 * next/font 的 variable 必須是字面量，不可從常數匯入（編譯期靜態分析限制）。
 * 變數名需與 config/typography.ts、tailwind.config.js 的 --font-sans 對齊。
 */
const fontSans = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

/**
 * 等寬字體：代號、價格、API 路徑等數字資訊。
 * variable 同樣必須為字面量，與 --font-mono 對齊。
 */
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sagafisc 智慧投研平台',
  description: '整合多個 AI 分析工具的智慧投資研究平台',
  // 明確指定圖示，避免瀏覽器另請求不存在的 /favicon.ico
  icons: {
    icon: '/Sagafisc.png',
  },
}

/**
 * 首屏前同步套用主題，避免 FOUC。
 * 色票自 themes.ts 序列化進腳本，與 ThemeProvider 共用同一來源。
 * @returns 可注入的 IIFE 腳本字串
 */
function buildThemeBootstrapScript(): string {
  const colorMap = Object.fromEntries(
    Object.entries(THEMES).map(([id, def]) => [id, def.colors]),
  )
  return `(function(){try{var themes=${JSON.stringify(colorMap)};var map=${JSON.stringify(THEME_CSS_VAR_MAP)};var id=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_THEME_ID)};if(!themes[id])id=${JSON.stringify(DEFAULT_THEME_ID)};var colors=themes[id];var el=document.documentElement;el.setAttribute("data-theme",id);for(var k in map){if(colors[k])el.style.setProperty(map[k],colors[k]);}}catch(e){}})();`
}

/**
 * 根版面：主題預載腳本 + AppShell（含 Provider／導覽／路由載入覆蓋）。
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
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

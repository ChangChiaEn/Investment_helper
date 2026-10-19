import { Loader } from '@/components/Loader'

/**
 * 工具路由區段的 Next.js loading UI。
 * 在伺服器／客戶端尚未交出頁面內容前顯示，避免主內容區空白。
 * @returns 全高載入畫面
 */
export default function ToolsLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

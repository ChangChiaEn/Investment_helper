import { Loader } from '@/components/Loader'

/**
 * 根路由區段的 Next.js loading UI。
 * 首頁等尚未渲染完成時顯示，避免使用者覺得卡住。
 * @returns 全高載入畫面
 */
export default function RootLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

import { Loader } from '@/components/Loader'

/**
 * 設定頁的 Next.js loading UI。
 * @returns 全高載入畫面
 */
export default function SettingsLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader size="lg" text="載入中..." />
    </div>
  )
}

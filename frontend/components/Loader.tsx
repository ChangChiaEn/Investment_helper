'use client'

import { useEffect, useState } from 'react'
import {
  DISGUISE_STORAGE_KEY,
  getDisguiseBrand,
  resolveDisguiseVariant,
} from '@/config/disguise'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  showBrand?: boolean
}

/**
 * 全站載入指示：品牌字在偽裝模式下改顯示對應變體名稱，避免露餡。
 * @param size 尺寸
 * @param text 下方說明文字
 * @param showBrand 是否顯示品牌字
 */
export function Loader({ size = 'md', text = '載入中...', showBrand = true }: LoaderProps) {
  // 初次渲染用真實品牌，掛載後再讀 localStorage，避免 SSR 不一致
  const [brand, setBrand] = useState('Sagafisc')

  useEffect(() => {
    const variant = resolveDisguiseVariant(localStorage.getItem(DISGUISE_STORAGE_KEY))
    setBrand(getDisguiseBrand(variant))
  }, [])

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  }

  const brandSizeClasses = {
    sm: 'loader-brand-sm',
    md: 'loader-brand-md',
    lg: 'loader-brand-lg',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="loader-wrapper">
        {showBrand && (
          <span className={`loader-brand ${brandSizeClasses[size]}`}>
            {brand}
          </span>
        )}
        <div className={`loader ${sizeClasses[size]}`}>
          <span></span>
        </div>
      </div>
      {text && <p className="text-muted-fg font-medium text-sm tracking-wide">{text}</p>}
    </div>
  )
}

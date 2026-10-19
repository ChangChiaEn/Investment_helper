'use client'

import { ReactNode } from 'react'

interface ButtonProps {
  /** 按鈕內容 */
  children: ReactNode
  /** 點擊回呼 */
  onClick?: () => void
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset'
  /** 主色或次要（muted）樣式 */
  variant?: 'primary' | 'secondary'
  /** 額外 class */
  className?: string
}

/**
 * 立體風格共用按鈕，背景色對應主題語意 token。
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
}: ButtonProps) {
  // primary／muted 對應 globals.css .button 的語意背景變數
  const variantClasses = variant === 'primary' ? 'bg-primary' : 'bg-muted'

  return (
    <button
      type={type}
      onClick={onClick}
      className={`button ${variantClasses} ${className}`}
    >
      <div className="wrap">
        <p>
          <span>{children}</span>
          <span>{children}</span>
        </p>
      </div>
    </button>
  )
}

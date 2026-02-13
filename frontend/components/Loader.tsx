'use client'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  showBrand?: boolean
}

export function Loader({ size = 'md', text = '載入中...', showBrand = true }: LoaderProps) {
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
            Sagafisc
          </span>
        )}
        <div className={`loader ${sizeClasses[size]}`}>
          <span></span>
        </div>
      </div>
      {text && <p className="text-surface-400 font-medium text-sm tracking-wide">{text}</p>}
    </div>
  )
}

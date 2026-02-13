'use client'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function Loader({ size = 'md', text = '載入中...' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`loader ${sizeClasses[size]}`}>
        <span></span>
      </div>
      {text && <p className="text-gray-600 font-medium">{text}</p>}
    </div>
  )
}


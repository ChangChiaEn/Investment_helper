'use client'

import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
  className?: string
}

export function Button({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'primary',
  className = '' 
}: ButtonProps) {
  const variantClasses = variant === 'primary' 
    ? 'bg-primary-600' 
    : 'bg-gray-600'

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


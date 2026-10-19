import React from 'react'

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  priority?: boolean
  fill?: boolean
}

export function Image({ src, alt, width, height, priority, fill, className, style, ...props }: ImageProps) {
  const fillStyle: React.CSSProperties = fill
    ? { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }
    : {}

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      style={{ ...fillStyle, ...style }}
      {...props}
    />
  )
}

export default Image

import React from 'react'

export interface NextImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  priority?: boolean
}

export default function Image({
  src,
  alt = '',
  width,
  height,
  className,
  priority,
  ...props
}: NextImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...props}
    />
  )
}

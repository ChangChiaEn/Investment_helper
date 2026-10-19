import React from 'react'
import { Link as RouterLink } from 'react-router-dom'

export interface NextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  replace?: boolean
  scroll?: boolean
  prefetch?: boolean
  children?: React.ReactNode
}

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, replace, children, className, ...rest }, ref) => {
    return (
      <RouterLink
        ref={ref}
        to={href}
        replace={replace}
        className={className}
        {...rest}
      >
        {children}
      </RouterLink>
    )
  }
)

Link.displayName = 'NextLinkCompat'
export default Link

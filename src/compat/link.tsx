import React from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | { pathname: string; query?: Record<string, string> }
  replace?: boolean
  scroll?: boolean
  prefetch?: boolean
  children?: React.ReactNode
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, replace, children, ...props }, ref) => {
    let to = ''
    if (typeof href === 'string') {
      to = href
    } else if (href && typeof href === 'object') {
      to = href.pathname || ''
      if (href.query && Object.keys(href.query).length > 0) {
        const params = new URLSearchParams(href.query)
        to += `?${params.toString()}`
      }
    }

    return (
      <RouterLink ref={ref} to={to} replace={replace} {...props}>
        {children}
      </RouterLink>
    )
  }
)

Link.displayName = 'NextLinkCompat'

export default Link

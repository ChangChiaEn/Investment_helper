import {
  useNavigate,
  useLocation,
  useSearchParams as useRouterSearchParams,
  useParams as useRouterParams,
} from 'react-router-dom'
import { useMemo } from 'react'

export function useRouter() {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      push: (url: string) => navigate(url),
      replace: (url: string) => navigate(url, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => window.location.reload(),
      prefetch: () => {},
    }),
    [navigate]
  )
}

export function usePathname(): string {
  const location = useLocation()
  return location.pathname
}

export function useSearchParams(): URLSearchParams {
  const location = useLocation()
  return useMemo(() => new URLSearchParams(location.search), [location.search])
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  const params = useRouterParams()
  return params as unknown as T
}

export function redirect(url: string) {
  window.location.href = url
}

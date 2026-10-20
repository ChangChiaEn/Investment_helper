import {
  useNavigate,
  useLocation,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from 'react-router-dom'
import { useMemo } from 'react'

export interface RouterInstance {
  push: (url: string) => void
  replace: (url: string) => void
  back: () => void
  forward: () => void
  refresh: () => void
  prefetch: (url: string) => void
}

export function useRouter(): RouterInstance {
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
  const [searchParams] = useRouterSearchParams()
  return searchParams
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string>>(): T {
  const params = useRouterParams()
  return params as unknown as T
}

import React, { Suspense, ComponentType } from 'react'

export interface DynamicOptions {
  loading?: () => React.ReactNode
  ssr?: boolean
}

export default function dynamic<P = {}>(
  loadFn: () => Promise<{ default: ComponentType<P> }>,
  options?: DynamicOptions
) {
  const LazyComponent = React.lazy(loadFn)
  const Loading = options?.loading || (() => null)

  return function DynamicComponent(props: any) {
    return (
      <Suspense fallback={<Loading />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

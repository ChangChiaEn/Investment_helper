import React, { Suspense, ComponentType } from 'react'

export interface DynamicOptions {
  ssr?: boolean
  loading?: () => React.ReactNode
}

export function dynamic<P = {}>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: DynamicOptions
): ComponentType<P> {
  const LazyComponent = React.lazy(loader)

  return function DynamicWrapper(props: P) {
    const Fallback = options?.loading ? options.loading() : null
    return (
      <Suspense fallback={Fallback}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    )
  }
}

export default dynamic

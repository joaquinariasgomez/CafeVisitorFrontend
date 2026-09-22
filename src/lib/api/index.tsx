'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import type { Api } from './api'
import { createHttpApi } from './http'

export type { Api } from './api'
export * from './types'
export * from './errors'

const ApiContext = createContext<Api | null>(null)

// Literal comparison (not the shared `useMocks` constant) so the bundler can inline the flag and
// drop the dynamic mock import from production builds.
const MOCKS_ENABLED = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

export function ApiProvider({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [api, setApi] = useState<Api | null>(() => (MOCKS_ENABLED ? null : createHttpApi()))

  useEffect(() => {
    if (!MOCKS_ENABLED) return
    let cancelled = false
    import('./mock').then(({ createMockApi }) => {
      if (!cancelled) setApi(createMockApi())
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!api) return <>{fallback}</>
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

export function useApi(): Api {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used inside <ApiProvider>')
  return api
}

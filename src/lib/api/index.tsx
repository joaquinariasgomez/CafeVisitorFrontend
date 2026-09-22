'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import { useMocks } from '@/lib/config'
import type { Api } from './api'
import { createHttpApi } from './http'

export type { Api } from './api'
export * from './types'
export * from './errors'

const ApiContext = createContext<Api | null>(null)

export function ApiProvider({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [api, setApi] = useState<Api | null>(() => (useMocks ? null : createHttpApi()))

  useEffect(() => {
    if (!useMocks) return
    let cancelled = false
    // Dynamic import keeps fixtures out of the bundle unless mocks are enabled at build time.
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

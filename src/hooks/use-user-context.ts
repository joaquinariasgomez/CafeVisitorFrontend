'use client'

import { useQuery } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import { queryKeys } from '@/lib/query/keys'

export function useUserContext(options?: { refresh?: boolean }) {
  const api = useApi()
  const refresh = options?.refresh ?? false
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => api.getUserContext(),
    staleTime: refresh ? 0 : Infinity,
    refetchOnMount: refresh,
  })
}

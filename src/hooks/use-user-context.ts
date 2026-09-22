'use client'

import { useQuery } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import { queryKeys } from '@/lib/query/keys'

export function useUserContext() {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => api.getUserContext(),
    staleTime: Infinity,
  })
}

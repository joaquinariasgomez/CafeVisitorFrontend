'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import type { ProfileInput } from '@/lib/api/api'
import { queryKeys } from '@/lib/query/keys'

export function useUserContext() {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.userContext,
    queryFn: () => api.getUserContext(),
    staleTime: Infinity,
  })
}

export function useUpdateProfile() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => api.updateProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userContext }),
  })
}

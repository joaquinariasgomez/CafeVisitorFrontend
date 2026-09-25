'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import { queryKeys } from '@/lib/query/keys'

export function useMyOrders(cafeteriaId?: string) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.myOrders(cafeteriaId),
    queryFn: () => api.listMyOrders(cafeteriaId ? { cafeteriaId } : undefined),
  })
}

export function useStampCards() {
  const api = useApi()
  return useQuery({ queryKey: queryKeys.stampCards, queryFn: () => api.getStampCards() })
}

export function useInvitationAction(action: 'accept' | 'reject', invalidateContext = true) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      action === 'accept' ? api.acceptInvitation(invitationId) : api.rejectInvitation(invitationId),
    onSuccess: () => {
      if (invalidateContext) return queryClient.invalidateQueries({ queryKey: queryKeys.userContext })
    },
  })
}

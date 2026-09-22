'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import type { InvitationDecision } from '@/lib/api/api'
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

export function useRespondToInvitation() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, decision }: { invitationId: string; decision: InvitationDecision }) =>
      api.respondToInvitation(invitationId, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userContext }),
  })
}

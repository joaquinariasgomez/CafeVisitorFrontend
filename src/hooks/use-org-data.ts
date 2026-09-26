'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApi } from '@/lib/api'
import type { CafeteriaInput, RegisterOrderInput } from '@/lib/api/api'
import type { OrganizationRole } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'

export function useCustomerLookup(qrToken: string | null, cafeteriaId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.customer(qrToken ?? '', cafeteriaId ?? ''),
    queryFn: () => api.lookupCustomer({ qrToken: qrToken as string, cafeteriaId: cafeteriaId as string }),
    enabled: Boolean(qrToken && cafeteriaId),
    retry: false,
  })
}

export function useRegisterOrder() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterOrderInput) => api.registerOrder(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cafeteriaStats(input.cafeteriaId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(input.qrToken, input.cafeteriaId) })
    },
  })
}

export function useCafeteriaStats(cafeteriaId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.cafeteriaStats(cafeteriaId ?? ''),
    queryFn: () => api.getCafeteriaStats(cafeteriaId as string),
    enabled: Boolean(cafeteriaId),
  })
}

export function useMembers(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.members(organizationId ?? ''),
    queryFn: () => api.listMembers(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useOrganizationInvitations(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.organizationInvitations(organizationId ?? ''),
    queryFn: () => api.listOrganizationInvitations(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useSendInvitation(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { email: string; role: OrganizationRole }) => api.sendInvitation(organizationId, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvitations(organizationId) }),
  })
}

export function useCancelInvitation(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => api.cancelInvitation(organizationId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvitations(organizationId) }),
  })
}

export function useCafeterias(organizationId: string | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.cafeterias(organizationId ?? ''),
    queryFn: () => api.listCafeterias(organizationId as string),
    enabled: Boolean(organizationId),
  })
}

export function useCreateCafeteria(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CafeteriaInput) => api.createCafeteria(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cafeterias(organizationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.userContext })
    },
  })
}

export function useCompleteOrganizationSetup(organizationId: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { displayName: string; cafeteria: CafeteriaInput }) =>
      api.completeOrganizationSetup(organizationId, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userContext }),
  })
}

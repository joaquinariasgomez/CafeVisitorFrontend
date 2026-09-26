import { z } from 'zod'

import { backendFetch } from '@/lib/backend/client'
import type { Api } from './api'
import { ApiError } from './errors'
import {
  customerLookupSchema,
  organizationInvitationSchema,
  organizationSchema,
  registerOrderResultSchema,
  userContextSchema,
  userSchema,
} from './types'

const problemDetailSchema = z.object({ detail: z.string().min(1) })

// Error responses are Spring ProblemDetail bodies; their `detail` is safe to show to the user.
async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  const body: unknown = await response.json().catch(() => null)
  const detail = problemDetailSchema.safeParse(body).data?.detail
  if (response.status === 403) {
    throw new ApiError('forbidden', detail ?? 'You do not have permission to do that', 403)
  }
  if (response.status === 404) throw new ApiError('not_found', detail ?? 'Not found', 404)
  throw new ApiError('unknown', detail ?? `Backend request failed (${response.status})`, response.status)
}

async function fetchJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await backendFetch(path, init)
  await throwIfNotOk(response)
  const body: unknown = await response.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiError('invalid_response', `Unexpected response from ${path}`)
  return parsed.data
}

async function postVoid(path: string, body?: unknown): Promise<void> {
  const response = await backendFetch(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  await throwIfNotOk(response)
}

// Endpoints below that use notImplemented do not exist in the backend yet. Each placeholder names
// the intended route so wiring them later is a one-line change to a fetchJson call.
const notImplemented = (name: string, intendedRoute: string) => async () => {
  throw new ApiError('not_implemented', `${name} is not connected yet (planned: ${intendedRoute})`)
}

export function createHttpApi(): Api {
  return {
    getUserContext: () => fetchJson('/users/context', userContextSchema),
    updateProfile: ({ displayName, email }) =>
      fetchJson('/users/profile', userSchema, {
        method: 'PATCH',
        body: JSON.stringify({ displayName: displayName?.trim(), email: email?.trim() }),
      }),
    listMyOrders: notImplemented('listMyOrders', 'GET /users/orders?cafeteriaId='),
    getStampCards: notImplemented('getStampCards', 'GET /users/stamp-cards'),
    acceptInvitation: (invitationId) => postVoid(`/organizations/invitations/${encodeURIComponent(invitationId)}/accept`),
    rejectInvitation: (invitationId) => postVoid(`/organizations/invitations/${encodeURIComponent(invitationId)}/reject`),
    lookupCustomer: ({ qrToken, cafeteriaId }) =>
      fetchJson(`/users/info?${new URLSearchParams({ qrToken, cafeteriaId })}`, customerLookupSchema),
    registerOrder: ({ cafeteriaId, qrToken, items, note }) =>
      fetchJson('/orders', registerOrderResultSchema, {
        method: 'POST',
        body: JSON.stringify({ qrToken, cafeteriaId, items, note: note ?? null }),
      }),
    getCafeteriaStats: notImplemented('getCafeteriaStats', 'GET /cafeterias/:id/stats'),
    listMembers: notImplemented('listMembers', 'GET /organizations/:id/members'),
    listOrganizationInvitations: (organizationId) =>
      fetchJson(`/organizations/${encodeURIComponent(organizationId)}/invitations`, z.array(organizationInvitationSchema)),
    sendInvitation: (organizationId, { email, role }) =>
      fetchJson('/organizations/invitations/send', organizationInvitationSchema, {
        method: 'POST',
        body: JSON.stringify({ organizationId, targetUserEmail: email.trim(), role }),
      }),
    cancelInvitation: (_organizationId, invitationId) =>
      postVoid(`/organizations/invitations/${encodeURIComponent(invitationId)}/cancel`),
    listCafeterias: notImplemented('listCafeterias', 'GET /organizations/:id/cafeterias'),
    createCafeteria: notImplemented('createCafeteria', 'POST /organizations/:id/cafeterias'),
    completeOrganizationSetup: (organizationId, { displayName, cafeteria }) =>
      fetchJson('/organizations/setup', organizationSchema, {
        method: 'POST',
        body: JSON.stringify({ organizationId, displayName, setupCafeteriaRequest: cafeteria }),
      }),
  }
}

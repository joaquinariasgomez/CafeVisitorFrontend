import type { Api } from '../api'
import { ApiError } from '../errors'
import type { CafeteriaStats, Organization, OrganizationRole, UserContext } from '../types'
import { buildState, type MockState } from './fixtures'
import { readPersona, type MockPersona } from './persona'
import { delay, stampCardFor, startOfDay, toOrder, uuid } from './store'

export { MOCK_CUSTOMER_TOKEN } from './fixtures'
export * from './persona'

const DAY_MS = 86_400_000

export function createMockApi(persona: MockPersona = readPersona()): Api {
  const state: MockState = buildState(persona)

  function organizationsFor(userEmail: string): Organization[] {
    return state.memberships
      .filter((m) => m.userEmail === userEmail)
      .map((m) => {
        const org = state.organizations.find((o) => o.id === m.organizationId)
        if (!org) throw new ApiError('not_found', 'Organization not found', 404)
        return { ...org, role: m.role, cafeterias: state.cafeterias.filter((c) => c.organizationId === org.id) }
      })
  }

  function requireOrg(organizationId: string) {
    const org = state.organizations.find((o) => o.id === organizationId)
    if (!org) throw new ApiError('not_found', 'Organization not found', 404)
    return org
  }

  function requireMembership(organizationId: string, roles: OrganizationRole[] = ['owner', 'admin', 'member']) {
    const membership = state.memberships.find((m) => m.userEmail === state.me.email && m.organizationId === organizationId)
    if (!membership || !roles.includes(membership.role)) {
      throw new ApiError('forbidden', 'You do not have access to this organization', 403)
    }
    return membership
  }

  function requireCafeteria(cafeteriaId: string) {
    const cafeteria = state.cafeterias.find((c) => c.id === cafeteriaId)
    if (!cafeteria) throw new ApiError('not_found', 'Cafeteria not found', 404)
    requireMembership(cafeteria.organizationId)
    return cafeteria
  }

  function requireCustomer(qrToken: string) {
    const user = state.users.find((u) => u.qrToken === qrToken)
    if (!user) throw new ApiError('not_found', 'No customer matches this QR code', 404)
    return user
  }

  function requirePendingInvitation(invitationId: string) {
    const invitation = state.invitations.find(
      (i) => i.id === invitationId && i.email === state.me.email && i.status === 'pending'
    )
    if (!invitation) throw new ApiError('not_found', 'Invitation not found', 404)
    return invitation
  }

  function context(): UserContext {
    return {
      user: state.me,
      organizations: organizationsFor(state.me.email),
      pendingInvitations: state.invitations
        .filter((i) => i.email === state.me.email && i.status === 'pending')
        .map(({ id, organization, role, status, expiresAt }) => ({ id, organization, role, status, expiresAt })),
    }
  }

  const api: Api = {
    async getUserContext() {
      await delay()
      return context()
    },

    async listMyOrders(params) {
      await delay()
      return state.orders
        .filter((o) => o.userEmail === state.me.email && (!params?.cafeteriaId || o.cafeteriaId === params.cafeteriaId))
        .map((o) => toOrder(state, o))
    },

    async getStampCards() {
      await delay()
      const visited = new Set(state.orders.filter((o) => o.userEmail === state.me.email).map((o) => o.cafeteriaId))
      return state.cafeterias.filter((c) => visited.has(c.id)).map((c) => stampCardFor(state, state.me.email, c))
    },

    async acceptInvitation(invitationId) {
      await delay()
      const invitation = requirePendingInvitation(invitationId)
      invitation.status = 'accepted'
      state.memberships.push({ userEmail: state.me.email, organizationId: invitation.organization.id, role: invitation.role })
    },

    async rejectInvitation(invitationId) {
      await delay()
      requirePendingInvitation(invitationId).status = 'rejected'
    },

    async lookupCustomer({ qrToken, cafeteriaId }) {
      await delay()
      const cafeteria = requireCafeteria(cafeteriaId)
      const { displayName, email, avatarUrl } = requireCustomer(qrToken)
      const hasVisited = state.orders.some((o) => o.userEmail === email && o.cafeteriaId === cafeteriaId)
      return { user: { displayName, email, avatarUrl }, stampCard: hasVisited ? stampCardFor(state, email, cafeteria) : null }
    },

    async registerOrder({ cafeteriaId, qrToken, items, note }) {
      await delay(500)
      const cafeteria = requireCafeteria(cafeteriaId)
      const user = requireCustomer(qrToken)
      const row = {
        id: uuid(),
        cafeteriaId,
        userEmail: user.email,
        recordedByEmail: state.me.email,
        createdAt: new Date().toISOString(),
        items,
        note: note?.trim() ? note.trim() : null,
      }
      state.orders.unshift(row)
      return { order: toOrder(state, row), stampCard: stampCardFor(state, user.email, cafeteria) }
    },

    async getCafeteriaStats(cafeteriaId) {
      await delay()
      requireCafeteria(cafeteriaId)
      const rows = state.orders.filter((o) => o.cafeteriaId === cafeteriaId)
      const today = startOfDay(new Date())
      const todayRows = rows.filter((o) => new Date(o.createdAt) >= today)
      const since = (days: number) => new Date(today.getTime() - (days - 1) * DAY_MS)
      const ordersPerDay = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(today.getTime() - (29 - i) * DAY_MS)
        const next = new Date(day.getTime() + DAY_MS)
        const count = rows.filter((o) => {
          const t = new Date(o.createdAt)
          return t >= day && t < next
        }).length
        return { date: day.toISOString(), count }
      })
      const stats: CafeteriaStats = {
        ordersToday: todayRows.length,
        uniqueCustomersToday: new Set(todayRows.map((o) => o.userEmail)).size,
        lastOrderAt: rows[0]?.createdAt ?? null,
        ordersLast7Days: rows.filter((o) => new Date(o.createdAt) >= since(7)).length,
        ordersLast30Days: rows.filter((o) => new Date(o.createdAt) >= since(30)).length,
        ordersPerDay,
        recentOrders: rows.slice(0, 10).map((o) => {
          const customer = state.users.find((u) => u.email === o.userEmail)
          return {
            ...toOrder(state, o),
            customer: { displayName: customer?.displayName ?? null, avatarUrl: customer?.avatarUrl ?? null },
          }
        }),
      }
      return stats
    },

    async listMembers(organizationId) {
      await delay()
      requireOrg(organizationId)
      requireMembership(organizationId)
      return state.memberships
        .filter((m) => m.organizationId === organizationId)
        .map((m) => {
          const user = state.users.find((u) => u.email === m.userEmail)
          if (!user) throw new ApiError('not_found', 'User not found', 404)
          const { displayName, email, avatarUrl } = user
          return { user: { displayName, email, avatarUrl }, role: m.role }
        })
    },

    async listOrganizationInvitations(organizationId) {
      await delay()
      requireMembership(organizationId)
      return state.orgInvitations
        .filter((i) => i.organizationId === organizationId)
        .map(({ id, email, role, status, createdAt }) => ({ id, email, role, status, createdAt }))
    },

    async sendInvitation(organizationId, { email, role }) {
      await delay(500)
      requireMembership(organizationId, ['owner', 'admin'])
      const invitation = {
        id: uuid(),
        organizationId,
        email: email.trim().toLowerCase(),
        role,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }
      state.orgInvitations.unshift(invitation)
      const { id, email: normalizedEmail, role: invitedRole, status, createdAt } = invitation
      return { id, email: normalizedEmail, role: invitedRole, status, createdAt }
    },

    async listCafeterias(organizationId) {
      await delay()
      requireMembership(organizationId)
      return state.cafeterias.filter((c) => c.organizationId === organizationId)
    },

    async createCafeteria(organizationId, { displayName, location }) {
      await delay(500)
      requireMembership(organizationId, ['owner', 'admin'])
      const cafeteria = { id: uuid(), organizationId, displayName: displayName.trim(), location: location.trim() }
      state.cafeterias.push(cafeteria)
      return cafeteria
    },

    async completeOrganizationSetup(organizationId, { displayName, cafeteria }) {
      await delay(600)
      const org = requireOrg(organizationId)
      const membership = requireMembership(organizationId, ['owner'])
      org.displayName = displayName.trim()
      org.status = 'created'
      state.cafeterias.push({
        id: uuid(),
        organizationId,
        displayName: cafeteria.displayName.trim(),
        location: cafeteria.location.trim(),
      })
      return { ...org, role: membership.role, cafeterias: state.cafeterias.filter((c) => c.organizationId === organizationId) }
    },
  }

  return api
}

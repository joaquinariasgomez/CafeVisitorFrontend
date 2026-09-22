import type { Cafeteria, Invitation, Organization, OrganizationInvitation, OrganizationRole, User } from '../types'
import type { MockPersona } from './persona'

/** Ana's QR token. Keep in sync with the hint in components/org/manual-token-form.tsx. */
export const MOCK_CUSTOMER_TOKEN = '11111111-1111-4111-8111-111111111111'

export interface MockOrderRow {
  id: string
  cafeteriaId: string
  userId: string
  recordedByUserId: string | null
  createdAt: string
  items: string[]
  note: string | null
}

export interface MockState {
  me: User
  users: User[]
  organizations: Array<Omit<Organization, 'role' | 'cafeterias'>>
  memberships: Array<{ userId: string; organizationId: string; role: OrganizationRole }>
  cafeterias: Cafeteria[]
  orders: MockOrderRow[]
  invitations: Array<Invitation & { userId: string; status: 'pending' | 'accepted' | 'rejected' }>
  orgInvitations: Array<OrganizationInvitation & { organizationId: string }>
}

const ORG_NORTHSIDE = 'a0000000-0000-4000-8000-000000000001'
const ORG_BEAN = 'a0000000-0000-4000-8000-000000000002'
const CAF_NORTH_MAIN = 'c0000000-0000-4000-8000-000000000001'
const CAF_NORTH_STATION = 'c0000000-0000-4000-8000-000000000002'
const CAF_BEAN_HARBOR = 'c0000000-0000-4000-8000-000000000003'

const ana: User = {
  id: 'u0000000-0000-4000-8000-000000000001',
  displayName: 'Ana Pérez',
  email: 'ana@example.com',
  avatarUrl: null,
  qrToken: MOCK_CUSTOMER_TOKEN,
}
const luis: User = {
  id: 'u0000000-0000-4000-8000-000000000002',
  displayName: 'Luis Romero',
  email: 'luis@northside.example',
  avatarUrl: null,
  qrToken: '22222222-2222-4222-8222-222222222222',
}
const marta: User = {
  id: 'u0000000-0000-4000-8000-000000000003',
  displayName: 'Marta Ruiz',
  email: 'marta@northside.example',
  avatarUrl: null,
  qrToken: '33333333-3333-4333-8333-333333333333',
}
const diego: User = {
  id: 'u0000000-0000-4000-8000-000000000004',
  displayName: 'Diego Sanz',
  email: 'diego@example.com',
  avatarUrl: null,
  qrToken: '44444444-4444-4444-8444-444444444444',
}

const cafeterias: Cafeteria[] = [
  { id: CAF_NORTH_MAIN, organizationId: ORG_NORTHSIDE, displayName: 'Northside Main', location: '12 Market St' },
  { id: CAF_NORTH_STATION, organizationId: ORG_NORTHSIDE, displayName: 'Northside Station', location: 'Central Station, Hall B' },
  { id: CAF_BEAN_HARBOR, organizationId: ORG_BEAN, displayName: 'Bean & Co Harbor', location: '3 Harbor Walk' },
]

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function daysAgo(days: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

let orderSeq = 0
function order(
  cafeteriaId: string,
  userId: string,
  createdAt: string,
  items: string[],
  note: string | null = null,
  recordedByUserId: string | null = luis.id
): MockOrderRow {
  orderSeq += 1
  return {
    id: `o0000000-0000-4000-8000-${String(orderSeq).padStart(12, '0')}`,
    cafeteriaId,
    userId,
    recordedByUserId,
    createdAt,
    items,
    note,
  }
}

function baseOrders(): MockOrderRow[] {
  const rows: MockOrderRow[] = []
  // Ana: 7 stamps at Northside Main, 10 at Bean & Co Harbor (reward ready)
  for (let i = 0; i < 7; i++) {
    rows.push(order(CAF_NORTH_MAIN, ana.id, daysAgo(i * 3 + 1, 8), ['Coffee'], i === 2 ? 'Oat milk' : null))
  }
  for (let i = 0; i < 10; i++) {
    rows.push(order(CAF_BEAN_HARBOR, ana.id, daysAgo(i * 2 + 2, 16), i % 3 === 0 ? ['Coffee', 'Pastry'] : ['Tea']))
  }
  // Today at Northside Main from other customers
  rows.push(order(CAF_NORTH_MAIN, diego.id, hoursAgo(0.5), ['Coffee', 'Sandwich']))
  rows.push(order(CAF_NORTH_MAIN, marta.id, hoursAgo(2), ['Tea']))
  rows.push(order(CAF_NORTH_MAIN, diego.id, hoursAgo(4), ['Coffee']))
  // Spread over the last 30 days at Northside Main
  for (let d = 1; d <= 30; d++) {
    const count = (d * 7) % 5
    for (let i = 0; i < count; i++) {
      rows.push(order(CAF_NORTH_MAIN, i % 2 ? diego.id : marta.id, daysAgo(d, 8 + i), ['Coffee']))
    }
  }
  for (let d = 0; d <= 30; d += 2) {
    rows.push(order(CAF_NORTH_STATION, diego.id, daysAgo(d, 7), ['Coffee', 'Pastry']))
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function buildState(persona: MockPersona): MockState {
  orderSeq = 0
  const organizations = [
    { id: ORG_NORTHSIDE, displayName: 'Northside Roasters', status: 'created' as const },
    { id: ORG_BEAN, displayName: 'Bean & Co', status: 'created' as const },
  ]
  const memberships = [
    { userId: luis.id, organizationId: ORG_NORTHSIDE, role: 'member' as const },
    { userId: marta.id, organizationId: ORG_NORTHSIDE, role: 'admin' as const },
    { userId: marta.id, organizationId: ORG_BEAN, role: 'owner' as const },
  ]
  const orgInvitations = [
    {
      id: 'i0000000-0000-4000-8000-000000000101',
      organizationId: ORG_NORTHSIDE,
      email: 'new.barista@example.com',
      role: 'member' as const,
      status: 'pending' as const,
      createdAt: daysAgo(1),
    },
  ]
  const base: MockState = {
    me: ana,
    users: [ana, luis, marta, diego],
    organizations,
    memberships,
    cafeterias: [...cafeterias],
    orders: baseOrders(),
    invitations: [],
    orgInvitations,
  }

  switch (persona) {
    case 'client':
      return base
    case 'client-with-invites': {
      const pendingOrg = {
        id: 'a0000000-0000-4000-8000-000000000003',
        displayName: "Ana's Corner Café",
        status: 'pending' as const,
      }
      return {
        ...base,
        organizations: [...organizations, pendingOrg],
        invitations: [
          {
            id: 'i0000000-0000-4000-8000-000000000001',
            userId: ana.id,
            organization: { id: ORG_NORTHSIDE, displayName: 'Northside Roasters' },
            role: 'member',
            sentBy: { displayName: 'Marta Ruiz' },
            expiresAt: daysFromNow(5),
            status: 'pending',
          },
          {
            id: 'i0000000-0000-4000-8000-000000000002',
            userId: ana.id,
            organization: { id: pendingOrg.id, displayName: pendingOrg.displayName },
            role: 'owner',
            sentBy: { displayName: 'CafeVisitor team' },
            expiresAt: daysFromNow(12),
            status: 'pending',
          },
        ],
      }
    }
    case 'org-member':
      return { ...base, me: luis }
    case 'org-admin':
      return { ...base, me: marta }
  }
}

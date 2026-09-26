import type { Organization, OrganizationRole, UserContext } from '@/lib/api/types'

export function canManage(role: OrganizationRole | undefined) {
  return role === 'owner' || role === 'admin'
}

export function hasOrganizations(context: UserContext | undefined) {
  return (context?.organizations.length ?? 0) > 0
}

export function needsSetup(organization: Organization) {
  return organization.status === 'pending' && organization.role === 'owner'
}

export function roleLabel(role: OrganizationRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

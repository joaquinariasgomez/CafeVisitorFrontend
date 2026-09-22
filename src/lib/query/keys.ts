export const queryKeys = {
  userContext: ['user-context'] as const,
  myOrders: (cafeteriaId?: string) => ['my-orders', cafeteriaId ?? 'all'] as const,
  stampCards: ['stamp-cards'] as const,
  customer: (qrToken: string, cafeteriaId: string) => ['customer', qrToken, cafeteriaId] as const,
  cafeteriaStats: (cafeteriaId: string) => ['cafeteria-stats', cafeteriaId] as const,
  members: (organizationId: string) => ['members', organizationId] as const,
  organizationInvitations: (organizationId: string) => ['organization-invitations', organizationId] as const,
  cafeterias: (organizationId: string) => ['cafeterias', organizationId] as const,
}

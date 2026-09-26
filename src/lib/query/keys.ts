export const queryKeys = {
  userContext: ['user-context'] as const,
  myOrders: (cafeteriaId?: string) => ['my-orders', cafeteriaId ?? 'all'] as const,
  recentOrders: (limit: number) => ['my-orders', 'recent', limit] as const,
  stampCards: ['stamp-cards'] as const,
  customer: (qrToken: string, cafeteriaId: string) => ['customer', qrToken, cafeteriaId] as const,
  cafeteriaStats: (cafeteriaId: string) => ['cafeteria-stats', cafeteriaId] as const,
  cafeteriaOrders: (cafeteriaId: string) => ['cafeteria-orders', cafeteriaId] as const,
  recentCafeteriaOrders: (cafeteriaId: string, limit: number) =>
    ['cafeteria-orders', cafeteriaId, 'recent', limit] as const,
  members: (organizationId: string) => ['members', organizationId] as const,
  organizationInvitations: (organizationId: string) => ['organization-invitations', organizationId] as const,
  cafeterias: (organizationId: string) => ['cafeterias', organizationId] as const,
}

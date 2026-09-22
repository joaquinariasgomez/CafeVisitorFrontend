import type {
  Cafeteria,
  CafeteriaStats,
  CustomerLookup,
  Member,
  Order,
  Organization,
  OrganizationInvitation,
  OrganizationRole,
  RegisterOrderResult,
  StampCard,
  UserContext,
} from './types'

export type InvitationDecision = 'accepted' | 'rejected'

export interface RegisterOrderInput {
  cafeteriaId: string
  qrToken: string
  items: string[]
  note?: string
}

export interface CafeteriaInput {
  displayName: string
  location: string
}

export interface Api {
  getUserContext(): Promise<UserContext>
  listMyOrders(params?: { cafeteriaId?: string }): Promise<Order[]>
  getStampCards(): Promise<StampCard[]>
  respondToInvitation(invitationId: string, decision: InvitationDecision): Promise<void>

  lookupCustomer(params: { qrToken: string; cafeteriaId: string }): Promise<CustomerLookup>
  registerOrder(input: RegisterOrderInput): Promise<RegisterOrderResult>
  getCafeteriaStats(cafeteriaId: string): Promise<CafeteriaStats>

  listMembers(organizationId: string): Promise<Member[]>
  listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]>
  sendInvitation(
    organizationId: string,
    params: { email: string; role: OrganizationRole }
  ): Promise<OrganizationInvitation>
  listCafeterias(organizationId: string): Promise<Cafeteria[]>
  createCafeteria(organizationId: string, input: CafeteriaInput): Promise<Cafeteria>
  completeOrganizationSetup(
    organizationId: string,
    params: { displayName: string; cafeteria: CafeteriaInput }
  ): Promise<Organization>
}

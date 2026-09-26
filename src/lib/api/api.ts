import type {
  Cafeteria,
  CafeteriaOrderPage,
  CafeteriaStats,
  CustomerLookup,
  Member,
  OrderPage,
  Organization,
  OrganizationInvitation,
  OrganizationRole,
  RegisterOrderResult,
  StampCard,
  User,
  UserContext,
} from './types'

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

export interface CafeteriaOrdersParams {
  cursor?: string
  limit?: number
}

export interface MyOrdersParams {
  cafeteriaId?: string
  cursor?: string
  limit?: number
}

export interface ProfileInput {
  displayName?: string
  email?: string
}

export interface Api {
  getUserContext(): Promise<UserContext>
  updateProfile(input: ProfileInput): Promise<User>
  listMyOrders(params: MyOrdersParams): Promise<OrderPage>
  getStampCards(): Promise<StampCard[]>
  acceptInvitation(invitationId: string): Promise<void>
  rejectInvitation(invitationId: string): Promise<void>

  lookupCustomer(params: { qrToken: string; cafeteriaId: string }): Promise<CustomerLookup>
  registerOrder(input: RegisterOrderInput): Promise<RegisterOrderResult>
  getCafeteriaStats(cafeteriaId: string): Promise<CafeteriaStats>
  listCafeteriaOrders(cafeteriaId: string, params: CafeteriaOrdersParams): Promise<CafeteriaOrderPage>

  listMembers(organizationId: string): Promise<Member[]>
  listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]>
  sendInvitation(
    organizationId: string,
    params: { email: string; role: OrganizationRole }
  ): Promise<OrganizationInvitation>
  cancelInvitation(organizationId: string, invitationId: string): Promise<void>
  listCafeterias(organizationId: string): Promise<Cafeteria[]>
  createCafeteria(organizationId: string, input: CafeteriaInput): Promise<Cafeteria>
  completeOrganizationSetup(
    organizationId: string,
    params: { displayName: string; cafeteria: CafeteriaInput }
  ): Promise<Organization>
}

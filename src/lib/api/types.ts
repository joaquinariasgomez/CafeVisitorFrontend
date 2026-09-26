import { z } from 'zod'

export const organizationRoleSchema = z.enum(['owner', 'admin', 'member'])
export type OrganizationRole = z.infer<typeof organizationRoleSchema>

export const userSchema = z.object({
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  qrToken: z.string(),
})
export type User = z.infer<typeof userSchema>

export const cafeteriaSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  displayName: z.string(),
  location: z.string(),
})
export type Cafeteria = z.infer<typeof cafeteriaSchema>

export const organizationSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: z.enum(['pending', 'created']),
  role: organizationRoleSchema,
  cafeterias: z.array(cafeteriaSchema),
})
export type Organization = z.infer<typeof organizationSchema>

export const invitationSchema = z.object({
  id: z.string(),
  organization: z.object({ id: z.string(), displayName: z.string() }),
  role: organizationRoleSchema,
  status: z.enum(['pending', 'accepted', 'rejected']),
  expiresAt: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>

export const userContextSchema = z.object({
  user: userSchema,
  organizations: z.array(organizationSchema),
  pendingInvitations: z.array(invitationSchema),
})
export type UserContext = z.infer<typeof userContextSchema>

export const orderSchema = z.object({
  id: z.string(),
  cafeteria: z.object({ id: z.string(), displayName: z.string() }),
  createdAt: z.string(),
  items: z.array(z.string()),
  note: z.string().nullable(),
  recordedBy: z.object({ displayName: z.string().nullable() }).nullable(),
})
export type Order = z.infer<typeof orderSchema>

export const stampCardSchema = z.object({
  cafeteria: cafeteriaSchema,
  orderCount: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  rewardsAvailable: z.number().int().nonnegative(),
})
export type StampCard = z.infer<typeof stampCardSchema>

export const customerLookupSchema = z.object({
  user: userSchema.pick({ displayName: true, email: true, avatarUrl: true }),
  stampCard: stampCardSchema.nullable(),
})
export type CustomerLookup = z.infer<typeof customerLookupSchema>

export const registerOrderResultSchema = z.object({
  order: orderSchema,
  stampCard: stampCardSchema,
})
export type RegisterOrderResult = z.infer<typeof registerOrderResultSchema>

export const cafeteriaOrderSchema = orderSchema.extend({
  customer: z.object({ displayName: z.string().nullable(), avatarUrl: z.string().nullable() }),
})
export type CafeteriaOrder = z.infer<typeof cafeteriaOrderSchema>

export const cafeteriaStatsSchema = z.object({
  ordersToday: z.number().int(),
  uniqueCustomersToday: z.number().int(),
  lastOrderAt: z.string().nullable(),
  ordersLast7Days: z.number().int(),
  ordersLast30Days: z.number().int(),
  ordersPerDay: z.array(z.object({ date: z.string(), count: z.number().int() })),
  recentOrders: z.array(cafeteriaOrderSchema),
})
export type CafeteriaStats = z.infer<typeof cafeteriaStatsSchema>

export const memberSchema = z.object({
  user: userSchema.pick({ displayName: true, email: true, avatarUrl: true }),
  role: organizationRoleSchema,
})
export type Member = z.infer<typeof memberSchema>

export const organizationInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: organizationRoleSchema,
  status: z.enum(['pending', 'accepted', 'rejected']),
  createdAt: z.string(),
})
export type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>

export const APP_NAME = 'CafeVisitor'

export const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

export const ORDER_ITEM_OPTIONS = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other'] as const
export type OrderItemOption = (typeof ORDER_ITEM_OPTIONS)[number]

export const STAMP_THRESHOLD_FALLBACK = 10

import { STAMP_THRESHOLD_FALLBACK } from '@/lib/config'
import type { Cafeteria, Order, StampCard } from '../types'
import type { MockOrderRow, MockState } from './fixtures'

export const MOCK_LATENCY_MS = 300

export function delay(ms = MOCK_LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function uuid() {
  return crypto.randomUUID()
}

export function toOrder(state: MockState, row: MockOrderRow): Order {
  const cafeteria = state.cafeterias.find((c) => c.id === row.cafeteriaId)
  const recorder = state.users.find((u) => u.id === row.recordedByUserId)
  return {
    id: row.id,
    cafeteria: { id: row.cafeteriaId, displayName: cafeteria?.displayName ?? 'Unknown cafeteria' },
    createdAt: row.createdAt,
    items: row.items,
    note: row.note,
    recordedBy: recorder ? { displayName: recorder.displayName } : null,
  }
}

export function stampCardFor(state: MockState, userId: string, cafeteria: Cafeteria): StampCard {
  const total = state.orders.filter((o) => o.userId === userId && o.cafeteriaId === cafeteria.id).length
  const threshold = STAMP_THRESHOLD_FALLBACK
  const remainder = total % threshold
  return {
    cafeteria,
    // A full card shows as threshold/threshold until the reward is redeemed.
    orderCount: total > 0 && remainder === 0 ? threshold : remainder,
    threshold,
    rewardsAvailable: Math.floor(total / threshold),
  }
}

export function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

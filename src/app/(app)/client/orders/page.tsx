'use client'

import { useState } from 'react'

import { OrderList } from '@/components/client/order-list'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyOrders, useStampCards } from '@/hooks/use-client-data'

const ALL = 'all'

export default function ClientOrdersPage() {
  const [cafeteriaId, setCafeteriaId] = useState<string>(ALL)
  const stampCards = useStampCards()
  const orders = useMyOrders(cafeteriaId === ALL ? undefined : cafeteriaId)

  const items = [
    { value: ALL, label: 'All cafeterias' },
    ...(stampCards.data ?? []).map((card) => ({ value: card.cafeteria.id, label: card.cafeteria.displayName })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orders" description="Everything staff have registered for you." />

      <Select items={items} value={cafeteriaId} onValueChange={(value) => setCafeteriaId(value ?? ALL)}>
        <SelectTrigger className="w-full" aria-label="Filter by cafeteria">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {orders.isPending ? <Skeleton className="h-64 w-full rounded-2xl" /> : null}
      {orders.isError ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
      {orders.data ? <OrderList orders={orders.data} /> : null}
    </div>
  )
}

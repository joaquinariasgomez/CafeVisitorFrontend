'use client'

import { useEffect, useRef, useState } from 'react'

import { OrderList } from '@/components/client/order-list'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useMyOrders } from '@/hooks/use-client-data'
import type { Order } from '@/lib/api/types'

const ALL = 'all'

function cafeteriasIn(orders: Order[]) {
  const seen = new Map<string, string>()
  for (const order of orders) seen.set(order.cafeteria.id, order.cafeteria.displayName)
  return [...seen].map(([id, displayName]) => ({ id, displayName }))
}

export default function ClientOrdersPage() {
  const [cafeteriaId, setCafeteriaId] = useState<string>(ALL)
  // Kept mounted so the dropdown still lists every cafeteria after a filter replaces the visible page.
  const allOrders = useMyOrders()
  const orders = useMyOrders(cafeteriaId === ALL ? undefined : cafeteriaId)
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = orders
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    // After a failed page, wait for an explicit retry instead of refetching while the sentinel stays visible.
    if (!sentinel || !hasNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const items = [
    { value: ALL, label: 'All cafeterias' },
    ...cafeteriasIn(allOrders.data?.pages.flatMap((page) => page.items) ?? []).map((cafeteria) => ({
      value: cafeteria.id,
      label: cafeteria.displayName,
    })),
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
      {orders.isError && !orders.data ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
      {orders.data ? <OrderList orders={orders.data.pages.flatMap((page) => page.items)} /> : null}

      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <Button variant="ghost" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? <Spinner /> : null} {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
      {isFetchNextPageError ? (
        <ErrorCard error={orders.error} onRetry={() => fetchNextPage()} />
      ) : null}
    </div>
  )
}

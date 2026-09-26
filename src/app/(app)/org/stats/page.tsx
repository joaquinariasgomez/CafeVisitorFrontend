'use client'

import { useEffect, useRef } from 'react'

import { OrderList } from '@/components/client/order-list'
import { OrdersPerDayChart } from '@/components/org/orders-per-day-chart'
import { OrgGuard } from '@/components/org/org-guard'
import { StatTile } from '@/components/org/stat-tile'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useCafeteriaOrders, useCafeteriaStats } from '@/hooks/use-org-data'
import type { Cafeteria } from '@/lib/api/types'

function Stats({ cafeteria }: { cafeteria: Cafeteria }) {
  const stats = useCafeteriaStats(cafeteria.id)
  const orders = useCafeteriaOrders(cafeteria.id)
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = orders
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
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

  if (stats.isError) return <ErrorCard error={stats.error} onRetry={() => stats.refetch()} />
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Today" value={stats.data?.ordersToday ?? 0} loading={stats.isPending} />
        <StatTile label="7 days" value={stats.data?.ordersLast7Days ?? 0} loading={stats.isPending} />
        <StatTile label="30 days" value={stats.data?.ordersLast30Days ?? 0} loading={stats.isPending} />
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Orders per day</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.data ? <OrdersPerDayChart data={stats.data.ordersPerDay} /> : <Skeleton className="h-32 w-full" />}
        </CardContent>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Latest orders</h2>
        {orders.isPending ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}
        {orders.isError && !orders.data ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
        {orders.data ? (
          <OrderList orders={orders.data.pages.flatMap((page) => page.items)} />
        ) : null}
        {hasNextPage ? (
          <div ref={sentinelRef} className="flex justify-center py-2">
            <Button variant="ghost" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? <Spinner /> : null} {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
        {isFetchNextPageError ? <ErrorCard error={orders.error} onRetry={() => fetchNextPage()} /> : null}
      </section>
    </div>
  )
}

export default function StatsPage() {
  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Stats" description={cafeteria ? cafeteria.displayName : 'Select a cafeteria on Home'} />
          {cafeteria ? <Stats cafeteria={cafeteria} /> : null}
        </div>
      )}
    </OrgGuard>
  )
}

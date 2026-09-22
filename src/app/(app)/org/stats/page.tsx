'use client'

import { OrderList } from '@/components/client/order-list'
import { OrdersPerDayChart } from '@/components/org/orders-per-day-chart'
import { OrgGuard } from '@/components/org/org-guard'
import { StatTile } from '@/components/org/stat-tile'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeteriaStats } from '@/hooks/use-org-data'
import type { Cafeteria } from '@/lib/api/types'

function Stats({ cafeteria }: { cafeteria: Cafeteria }) {
  const stats = useCafeteriaStats(cafeteria.id)
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
        {stats.data ? <OrderList orders={stats.data.recentOrders} /> : <Skeleton className="h-40 w-full rounded-2xl" />}
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

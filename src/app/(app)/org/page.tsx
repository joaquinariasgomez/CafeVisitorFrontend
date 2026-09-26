'use client'

import Link from 'next/link'
import { ChevronRightIcon, ScanLineIcon } from 'lucide-react'

import { OrderList } from '@/components/client/order-list'
import { CafeteriaSelector } from '@/components/org/cafeteria-selector'
import { FinishSetupBanner } from '@/components/org/finish-setup-banner'
import { OrgGuard, type ActiveOrganization } from '@/components/org/org-guard'
import { StatTile } from '@/components/org/stat-tile'
import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeteriaStats } from '@/hooks/use-org-data'
import { formatRelative } from '@/lib/format'

function OrgHome({ organization, organizations, unfinishedOrganization, cafeteria, setActive }: ActiveOrganization) {
  const stats = useCafeteriaStats(cafeteria?.id)

  return (
    <div className="flex flex-col gap-6">
      <CafeteriaSelector
        organizations={organizations}
        organization={organization}
        cafeteria={cafeteria}
        onSelect={setActive}
      />
      <FinishSetupBanner organization={unfinishedOrganization} />

      <div className="flex flex-col gap-2">
        <Button size="lg" className="h-16 w-full text-base" render={<Link href="/org/scan" />} nativeButton={false} disabled={!cafeteria}>
          <ScanLineIcon className="size-6" /> Register order
        </Button>
        {!cafeteria ? (
          <p className="text-center text-xs text-muted-foreground">Add a cafeteria before registering orders.</p>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Today at {cafeteria?.displayName ?? 'your cafeteria'}</h2>
        {stats.isError ? <ErrorCard error={stats.error} onRetry={() => stats.refetch()} /> : null}
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Orders" value={stats.data?.ordersToday ?? 0} loading={stats.isPending} />
          <StatTile label="Customers" value={stats.data?.uniqueCustomersToday ?? 0} loading={stats.isPending} />
          <StatTile
            label="Last order"
            value={stats.data?.lastOrderAt ? formatRelative(stats.data.lastOrderAt) : '—'}
            loading={stats.isPending}
          />
          <StatTile label="Last 7 days" value={stats.data?.ordersLast7Days ?? 0} loading={stats.isPending} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent orders</h2>
          <Button variant="ghost" size="sm" render={<Link href="/org/stats" />} nativeButton={false}>
            Stats <ChevronRightIcon />
          </Button>
        </div>
        {stats.isPending ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}
        {stats.data ? (
          <OrderList
            orders={stats.data.recentOrders.slice(0, 5)}
            grouped={false}
            emptyTitle="No orders yet"
            emptyDescription="Registered orders will appear here."
          />
        ) : null}
      </section>
    </div>
  )
}

export default function OrgHomePage() {
  return <OrgGuard>{(active) => <OrgHome {...active} />}</OrgGuard>
}

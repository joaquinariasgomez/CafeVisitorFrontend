import { CoffeeIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { CafeteriaOrder, Order } from '@/lib/api/types'
import { formatDay, formatTime } from '@/lib/format'

type AnyOrder = Order | CafeteriaOrder

function groupByDay(orders: AnyOrder[]): Array<[string, AnyOrder[]]> {
  const groups = new Map<string, AnyOrder[]>()
  for (const order of orders) {
    const key = formatDay(order.createdAt)
    groups.set(key, [...(groups.get(key) ?? []), order])
  }
  return Array.from(groups.entries())
}

export function OrderList({
  orders,
  emptyTitle = 'No orders yet',
  emptyDescription = 'Orders registered by cafeteria staff will show up here.',
  grouped = true,
}: {
  orders: AnyOrder[]
  emptyTitle?: string
  emptyDescription?: string
  grouped?: boolean
}) {
  if (orders.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CoffeeIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const sections: Array<[string, AnyOrder[]]> = grouped ? groupByDay(orders) : [['', orders]]

  return (
    <div className="flex flex-col gap-4">
      {sections.map(([day, dayOrders]) => (
        <section key={day || 'all'} className="flex flex-col gap-2">
          {day ? <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</h3> : null}
          <ul className="divide-y rounded-xl border bg-card">
            {dayOrders.map((order) => {
              const customer = 'customer' in order ? order.customer : null
              return (
                <li key={order.id} className="flex items-start gap-3 p-3">
                  {customer ? (
                    <UserAvatar name={customer.displayName} avatarUrl={customer.avatarUrl} size="sm" className="mt-0.5" />
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {customer ? customer.displayName ?? 'Customer' : order.cafeteria.displayName}
                      </span>
                      <time dateTime={order.createdAt} className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {order.items.length > 0 ? (
                        order.items.map((item, i) => (
                          <Badge key={`${item}-${i}`} variant="outline">
                            {item}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Visit registered</span>
                      )}
                    </div>
                    {order.note ? <p className="text-xs text-muted-foreground">“{order.note}”</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

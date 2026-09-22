import { StampCard } from '@/components/client/stamp-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Card, CardContent } from '@/components/ui/card'
import type { CustomerLookup } from '@/lib/api/types'

export function CustomerSummary({ customer }: { customer: CustomerLookup }) {
  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <UserAvatar name={customer.user.displayName} avatarUrl={customer.user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{customer.user.displayName ?? 'Customer'}</p>
            <p className="truncate text-sm text-muted-foreground">{customer.user.email}</p>
          </div>
        </CardContent>
      </Card>
      {customer.stampCard ? (
        <StampCard card={customer.stampCard} compact />
      ) : (
        <p className="text-sm text-muted-foreground">First visit to this cafeteria.</p>
      )}
    </div>
  )
}

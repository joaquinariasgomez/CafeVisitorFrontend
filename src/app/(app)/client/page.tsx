'use client'

import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'

import { InvitationCard } from '@/components/client/invitation-card'
import { OrderList } from '@/components/client/order-list'
import { QrCard } from '@/components/client/qr-card'
import { StampCard } from '@/components/client/stamp-card'
import { CompleteProfileBanner } from '@/components/shared/complete-profile-banner'
import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentOrders, useStampCards } from '@/hooks/use-client-data'
import { useUserContext } from '@/hooks/use-user-context'

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function ClientHomePage() {
  const context = useUserContext()
  const stampCards = useStampCards()
  const orders = useRecentOrders(5)

  if (context.isError) return <ErrorCard error={context.error} onRetry={() => context.refetch()} />
  if (!context.data) return <Skeleton className="h-40 w-full rounded-2xl" />

  const { user, pendingInvitations } = context.data

  return (
    <div className="flex flex-col gap-8">
      <CompleteProfileBanner />
      <QrCard user={user} />

      {pendingInvitations.length > 0 ? (
        <Section title="Pending invitations">
          <div className="flex flex-col gap-3">
            {pendingInvitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Your cafeterias">
        {stampCards.isPending ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}
        {stampCards.isError ? <ErrorCard error={stampCards.error} onRetry={() => stampCards.refetch()} /> : null}
        {stampCards.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Visit a participating cafeteria and show your QR to start collecting stamps.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {stampCards.data?.map((card) => <StampCard key={card.cafeteria.id} card={card} />)}
        </div>
      </Section>

      <Section
        title="Recent orders"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/client/orders" />} nativeButton={false}>
            See all <ChevronRightIcon />
          </Button>
        }
      >
        {orders.isPending ? <Skeleton className="h-32 w-full rounded-2xl" /> : null}
        {orders.isError ? <ErrorCard error={orders.error} onRetry={() => orders.refetch()} /> : null}
        {orders.data ? <OrderList orders={orders.data} grouped={false} /> : null}
      </Section>
    </div>
  )
}

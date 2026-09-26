'use client'

import Link from 'next/link'
import { BuildingIcon } from 'lucide-react'

import { ErrorCard } from '@/components/shared/error-card'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveCafeteria, type ActiveCafeteria } from '@/hooks/use-active-cafeteria'
import type { Organization } from '@/lib/api/types'

export type ActiveOrganization = ActiveCafeteria & { organization: Organization }

export function OrgGuard({ children }: { children: (active: ActiveOrganization) => React.ReactNode }) {
  const active = useActiveCafeteria()

  if (active.isPending) return <Skeleton className="h-40 w-full rounded-2xl" />
  if (active.isError) return <ErrorCard error={active.error} onRetry={() => active.refetch()} />
  if (!active.organization && active.unfinishedOrganization) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BuildingIcon />
          </EmptyMedia>
          <EmptyTitle>Finish setting up {active.unfinishedOrganization.displayName}</EmptyTitle>
          <EmptyDescription>Confirm the name and add your first cafeteria to start registering orders.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href={`/onboarding/${active.unfinishedOrganization.id}`} />} nativeButton={false}>
            Set up
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  if (!active.organization) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BuildingIcon />
          </EmptyMedia>
          <EmptyTitle>You are not part of an organization</EmptyTitle>
          <EmptyDescription>
            Ask an organization admin to invite you. Invitations appear on your client home.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/client" />} nativeButton={false}>Go to client view</Button>
        </EmptyContent>
      </Empty>
    )
  }

  return <>{children({ ...active, organization: active.organization })}</>
}

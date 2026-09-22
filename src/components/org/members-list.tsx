'use client'

import { ErrorCard } from '@/components/shared/error-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMembers, useOrganizationInvitations } from '@/hooks/use-org-data'
import { formatShortDay } from '@/lib/format'
import { roleLabel } from '@/lib/roles'

export function MembersList({ organizationId }: { organizationId: string }) {
  const members = useMembers(organizationId)
  const invitations = useOrganizationInvitations(organizationId)
  const pending = invitations.data?.filter((i) => i.status === 'pending') ?? []

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Members</h3>
        {members.isPending ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {members.isError ? <ErrorCard error={members.error} onRetry={() => members.refetch()} /> : null}
        {members.data ? (
          <ul className="divide-y rounded-xl border bg-card">
            {members.data.map((m) => (
              <li key={m.user.id} className="flex items-center gap-3 p-3">
                <UserAvatar name={m.user.displayName} avatarUrl={m.user.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.displayName ?? m.user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{roleLabel(m.role)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        {invitations.isPending ? <Skeleton className="h-12 w-full rounded-xl" /> : null}
        {invitations.isError ? <ErrorCard error={invitations.error} onRetry={() => invitations.refetch()} /> : null}
        {invitations.data && pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : null}
        {pending.length > 0 ? (
          <ul className="divide-y rounded-xl border bg-card">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">Sent {formatShortDay(i.createdAt)}</p>
                </div>
                <Badge variant="outline">{roleLabel(i.role)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

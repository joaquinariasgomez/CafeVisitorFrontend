'use client'

import { useRouter } from 'next/navigation'
import { MailIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { useInvitationAction } from '@/hooks/use-client-data'
import { errorMessage } from '@/lib/api/errors'
import type { Invitation } from '@/lib/api/types'
import { roleLabel } from '@/lib/roles'

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const router = useRouter()
  const organizationId = invitation.organization.id
  const accept = useInvitationAction('accept', invitation.role !== 'owner')
  const reject = useInvitationAction('reject')
  const isPending = accept.isPending || reject.isPending

  const handle = (decision: 'accepted' | 'rejected') => {
    if (decision === 'accepted' && invitation.role === 'owner') {
      router.push(`/onboarding/${organizationId}`)
      return
    }

    const mutation = decision === 'accepted' ? accept : reject
    mutation.mutate(
      invitation.id,
      {
        onSuccess: () => {
          if (decision === 'rejected') {
            toast.add({ title: 'Invitation declined' })
            return
          }
          toast.add({
            type: 'success',
            title: `Welcome to ${invitation.organization.displayName}`,
            description: 'The Organization view is now available from your account menu.',
          })
        },
        onError: (error) => toast.add({ type: 'error', title: 'Could not respond', description: errorMessage(error) }),
      }
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailIcon className="size-4 text-brand" aria-hidden="true" />
          {invitation.organization.displayName}
          <Badge variant="secondary">{roleLabel(invitation.role)}</Badge>
        </CardTitle>
        <CardDescription>
          {invitation.role === 'owner'
            ? 'Accepting makes you the owner and starts the setup of the organization.'
            : 'Accepting lets you register orders for this organization.'}
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={() => handle('accepted')} disabled={isPending}>
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handle('rejected')} disabled={isPending}>
          Decline
        </Button>
      </CardFooter>
    </Card>
  )
}

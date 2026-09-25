'use client'

import { useRouter } from 'next/navigation'
import { MailIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { useRespondToInvitation } from '@/hooks/use-client-data'
import { errorMessage } from '@/lib/api/errors'
import type { Invitation } from '@/lib/api/types'
import { roleLabel } from '@/lib/roles'

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const router = useRouter()
  const respond = useRespondToInvitation()

  const handle = (decision: 'accepted' | 'rejected') => {
    respond.mutate(
      { invitationId: invitation.id, decision },
      {
        onSuccess: () => {
          if (decision === 'rejected') {
            toast.add({ title: 'Invitation declined' })
            return
          }
          if (invitation.role === 'owner') {
            toast.add({
              type: 'success',
              title: `You now own ${invitation.displayName}`,
              description: 'Let’s finish setting it up.',
            })
            router.push(`/onboarding/${invitation.organization.id}`)
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
          {invitation.sentBy?.displayName ? `Invited by ${invitation.sentBy.displayName}. ` : ''}
          {invitation.role === 'owner'
            ? 'Accepting makes you the owner and starts the setup of the organization.'
            : 'Accepting lets you register orders for this organization.'}
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={() => handle('accepted')} disabled={respond.isPending}>
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handle('rejected')} disabled={respond.isPending}>
          Decline
        </Button>
      </CardFooter>
    </Card>
  )
}

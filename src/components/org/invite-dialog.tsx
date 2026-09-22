'use client'

import { useState } from 'react'
import { UserPlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useSendInvitation } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { OrganizationRole } from '@/lib/api/types'

const ROLE_ITEMS: Array<{ value: OrganizationRole; label: string }> = [
  { value: 'member', label: 'Member — can register orders' },
  { value: 'admin', label: 'Admin — can also manage team and cafeterias' },
]

export function InviteDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const send = useSendInvitation(organizationId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlusIcon /> Invite
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            send.mutate(
              { email, role },
              {
                onSuccess: () => {
                  toast.add({ type: 'success', title: `Invitation sent to ${email}` })
                  setEmail('')
                  setRole('member')
                  setOpen(false)
                },
                onError: (error) =>
                  toast.add({ type: 'error', title: 'Could not send invitation', description: errorMessage(error) }),
              }
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite to the team</DialogTitle>
            <DialogDescription>They will see the invitation on their CafeVisitor home after signing in.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barista@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <Select
              items={ROLE_ITEMS}
              value={role}
              onValueChange={(value) => {
                if (value) setRole(value as OrganizationRole)
              }}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Ownership cannot be transferred from here.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={send.isPending || !email}>
              {send.isPending ? <Spinner /> : null} Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

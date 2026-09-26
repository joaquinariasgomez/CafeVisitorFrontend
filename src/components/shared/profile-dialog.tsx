'use client'

import { useState } from 'react'

import { useSessionEmail } from '@/components/shell/session-email'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useUpdateProfile } from '@/hooks/use-user-context'
import type { ProfileInput } from '@/lib/api/api'
import { errorMessage } from '@/lib/api/errors'
import type { User } from '@/lib/api/types'

const MAX_DISPLAY_NAME_LENGTH = 80

function ProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const sessionEmail = useSessionEmail()
  const lockedEmail = user.email ?? sessionEmail
  const [email, setEmail] = useState(lockedEmail ?? '')
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const update = useUpdateProfile()

  const trimmedName = displayName.trim()
  const input: ProfileInput = {
    ...(trimmedName && trimmedName !== user.displayName ? { displayName: trimmedName } : {}),
    ...(!user.email && email.trim() ? { email: email.trim() } : {}),
  }
  const hasChanges = Object.keys(input).length > 0
  const canSubmit = hasChanges && (Boolean(user.email) || Boolean(input.email))

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate(input, {
          onSuccess: () => {
            toast.add({ type: 'success', title: 'Profile saved' })
            onDone()
          },
          onError: (error) =>
            toast.add({ type: 'error', title: 'Could not save your profile', description: errorMessage(error) }),
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>{user.email ? 'Edit profile' : 'Complete your profile'}</DialogTitle>
        <DialogDescription>
          {user.email
            ? 'Your name is shown to the cafeterias you visit and to your team.'
            : 'Organizations invite people by email. Add yours so you can join a team.'}
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="profile-email">Email</FieldLabel>
        <Input
          id="profile-email"
          type="email"
          required
          readOnly={Boolean(lockedEmail)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldDescription>
          {user.email
            ? 'Your email cannot be changed.'
            : lockedEmail
              ? 'Provided by your sign-in method.'
              : 'You can only set this once.'}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-display-name">Display name</FieldLabel>
        <Input
          id="profile-display-name"
          value={displayName}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ana Pérez"
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {user.email ? 'Cancel' : 'Not now'}
        </Button>
        <Button type="submit" disabled={update.isPending || !canSubmit}>
          {update.isPending ? <Spinner /> : null} Save
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open ? <ProfileForm user={user} onDone={() => onOpenChange(false)} /> : null}</DialogContent>
    </Dialog>
  )
}

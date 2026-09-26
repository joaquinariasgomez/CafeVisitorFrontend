'use client'

import { useState } from 'react'
import { MailWarningIcon } from 'lucide-react'

import { ProfileDialog } from '@/components/shared/profile-dialog'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useUserContext } from '@/hooks/use-user-context'

export function CompleteProfileBanner() {
  const { data: context } = useUserContext()
  const [open, setOpen] = useState(false)

  if (!context || context.user.email) return null

  return (
    <>
      <Alert className="border-brand/50 bg-accent">
        <MailWarningIcon className="text-brand" />
        <AlertTitle>Complete your profile</AlertTitle>
        <AlertDescription>Add your email so organizations can invite you. Until then you cannot join one.</AlertDescription>
        <AlertAction>
          <Button size="sm" onClick={() => setOpen(true)}>
            Complete
          </Button>
        </AlertAction>
      </Alert>
      <ProfileDialog user={context.user} open={open} onOpenChange={setOpen} />
    </>
  )
}

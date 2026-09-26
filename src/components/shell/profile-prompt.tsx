'use client'

import { useState } from 'react'

import { ProfileDialog } from '@/components/shared/profile-dialog'
import type { UserContext } from '@/lib/api/types'

const DISMISSED_KEY = 'cv.profilePromptDismissed'

function readDismissed() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISSED_KEY) === 'true'
}

/** Asks for the missing email once per browser session; afterwards the dashboard banner takes over. */
export function ProfilePrompt({ context }: { context: UserContext | undefined }) {
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!context || context.user.email) return null

  return (
    <ProfileDialog
      user={context.user}
      open={!dismissed}
      onOpenChange={(open) => {
        if (open) return
        window.sessionStorage.setItem(DISMISSED_KEY, 'true')
        setDismissed(true)
      }}
    />
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { ErrorCard } from '@/components/shared/error-card'
import { Spinner } from '@/components/ui/spinner'
import { useUserContext } from '@/hooks/use-user-context'
import { hasOrganizations } from '@/lib/roles'

export default function EntryPage() {
  const router = useRouter()
  const { data, error, isError, refetch } = useUserContext()

  useEffect(() => {
    if (data) router.replace(hasOrganizations(data) ? '/org' : '/client')
  }, [data, router])

  if (isError) {
    return (
      <div className="flex flex-col gap-4 pt-8">
        <ErrorCard error={error} title="Could not load your account" onRetry={() => refetch()} />
        <LogoutButton />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Spinner className="size-6" />
      <p className="text-sm">Loading your account…</p>
    </div>
  )
}

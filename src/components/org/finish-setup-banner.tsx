import Link from 'next/link'
import { SparklesIcon } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/lib/api/types'

export function FinishSetupBanner({ organization }: { organization: Organization }) {
  if (organization.status !== 'pending' || organization.role !== 'owner') return null
  return (
    <Alert className="border-brand/50 bg-accent">
      <SparklesIcon className="text-brand" />
      <AlertTitle>Finish setting up {organization.displayName}</AlertTitle>
      <AlertDescription>Confirm the name and add your first cafeteria to start registering orders.</AlertDescription>
      <AlertAction>
        <Button size="sm" render={<Link href={`/onboarding/${organization.id}`} />} nativeButton={false}>
          Set up
        </Button>
      </AlertAction>
    </Alert>
  )
}

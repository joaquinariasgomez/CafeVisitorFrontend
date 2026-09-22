'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { OrganizationSetupWizard } from '@/components/onboarding/organization-setup-wizard'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserContext } from '@/hooks/use-user-context'

export default function OnboardingPage({ params }: PageProps<'/onboarding/[organizationId]'>) {
  const { organizationId } = use(params)
  const router = useRouter()
  const context = useUserContext()
  const organization = context.data?.organizations.find((o) => o.id === organizationId)
  const alreadyDone = Boolean(organization && (organization.status === 'created' || organization.role !== 'owner'))

  useEffect(() => {
    if (alreadyDone) router.replace('/org')
  }, [alreadyDone, router])

  if (context.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />
  if (context.isError) return <ErrorCard error={context.error} onRetry={() => context.refetch()} />
  if (!organization) {
    return (
      <ErrorCard
        error={new Error('You do not own this organization or the invitation was not accepted.')}
        title="Organization not found"
      />
    )
  }
  if (alreadyDone) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Set up your organization" description="Two quick steps and you are ready to register orders." />
      <OrganizationSetupWizard organization={organization} />
    </div>
  )
}

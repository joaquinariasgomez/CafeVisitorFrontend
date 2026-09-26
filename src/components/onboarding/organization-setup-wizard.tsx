'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useActiveCafeteria } from '@/hooks/use-active-cafeteria'
import { useCompleteOrganizationSetup } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { Organization } from '@/lib/api/types'

export function OrganizationSetupWizard({ organization }: { organization: Organization }) {
  const router = useRouter()
  const { setActive } = useActiveCafeteria()
  const complete = useCompleteOrganizationSetup(organization.id)
  const [step, setStep] = useState<1 | 2>(1)
  const [displayName, setDisplayName] = useState(organization.displayName)
  const [cafeteriaName, setCafeteriaName] = useState('')
  const [location, setLocation] = useState('')

  const finish = () =>
    complete.mutate(
      {
        displayName: displayName.trim(),
        cafeteria: { displayName: cafeteriaName.trim(), location: location.trim() },
      },
      {
        onSuccess: (org) => {
          const first = org.cafeterias[0]
          setActive(org.id, first?.id ?? null)
          toast.add({ type: 'success', title: `${org.displayName} is ready`, description: 'You can start registering orders.' })
          router.replace('/org')
        },
        onError: (error) =>
          toast.add({ type: 'error', title: 'Could not finish setup', description: errorMessage(error) }),
      }
    )

  return (
    <div className="flex flex-col gap-6">
      <Progress value={step === 1 ? 50 : 100} aria-label={`Step ${step} of 2`}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Name your organization</CardTitle>
            <CardDescription>This is what customers and staff will see. You can keep the suggested name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
              <Input id="org-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoFocus />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => setStep(2)} disabled={!displayName.trim()}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add your first cafeteria</CardTitle>
            <CardDescription>You can add more later from Manage.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="first-cafeteria-name">Cafeteria name</FieldLabel>
              <Input
                id="first-cafeteria-name"
                value={cafeteriaName}
                onChange={(e) => setCafeteriaName(e.target.value)}
                placeholder={`${displayName} Main`}
                required
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="first-cafeteria-location">Location</FieldLabel>
              <Input
                id="first-cafeteria-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="12 Market St"
                required
              />
              <FieldDescription>Street address or a short description customers recognize.</FieldDescription>
            </Field>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={complete.isPending}>
              Back
            </Button>
            <Button onClick={finish} disabled={complete.isPending || !cafeteriaName.trim() || !location.trim()}>
              {complete.isPending ? <Spinner /> : null} Finish setup
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

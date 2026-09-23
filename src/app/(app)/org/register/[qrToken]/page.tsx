'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2Icon, ScanLineIcon } from 'lucide-react'

import { StampCard } from '@/components/client/stamp-card'
import { CustomerSummary } from '@/components/org/customer-summary'
import { OrderItemsForm } from '@/components/org/order-items-form'
import { OrgGuard } from '@/components/org/org-guard'
import { ErrorCard } from '@/components/shared/error-card'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useCustomerLookup, useRegisterOrder } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'
import type { Cafeteria, RegisterOrderResult } from '@/lib/api/types'
import { isQrToken } from '@/lib/qr'

function RegisterFlow({ qrToken, cafeteria }: { qrToken: string; cafeteria: Cafeteria }) {
  const lookup = useCustomerLookup(qrToken, cafeteria.id)
  const register = useRegisterOrder()
  const [items, setItems] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [result, setResult] = useState<RegisterOrderResult | null>(null)

  if (result) {
    return (
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <CheckCircle2Icon className="size-16 text-brand" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">Order registered</h2>
          <p className="text-sm text-muted-foreground">
            {lookup.data?.user.displayName ?? 'The customer'} now has {result.stampCard.orderCount} of{' '}
            {result.stampCard.threshold} stamps at {cafeteria.displayName}.
          </p>
        </div>
        <div className="w-full">
          <StampCard card={result.stampCard} compact />
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button size="lg" render={<Link href="/org/scan" />} nativeButton={false}>
            <ScanLineIcon /> Scan next customer
          </Button>
          <Button variant="ghost" render={<Link href="/org" />} nativeButton={false}>
            Back to home
          </Button>
        </div>
      </div>
    )
  }

  if (lookup.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (lookup.isError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorCard error={lookup.error} title="Customer not found" onRetry={() => lookup.refetch()} />
        <Button variant="outline" render={<Link href="/org/scan" />} nativeButton={false}>
          Scan again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CustomerSummary customer={lookup.data} />
      <OrderItemsForm
        items={items}
        note={note}
        onItemsChange={setItems}
        onNoteChange={setNote}
        disabled={register.isPending}
      />
      <Button
        size="lg"
        className="h-14 w-full text-base"
        disabled={register.isPending}
        onClick={() =>
          register.mutate(
            { cafeteriaId: cafeteria.id, qrToken, items, note: note.trim() || undefined },
            {
              onSuccess: setResult,
              onError: (error) =>
                toast.add({ type: 'error', title: 'Could not register the order', description: errorMessage(error) }),
            }
          )
        }
      >
        {register.isPending ? <Spinner /> : null} Confirm order
      </Button>
    </div>
  )
}

export default function RegisterOrderPage({ params }: PageProps<'/org/register/[qrToken]'>) {
  const { qrToken } = use(params)
  const token = decodeURIComponent(qrToken)
  const valid = isQrToken(token)

  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader title="Register order" description={cafeteria ? `At ${cafeteria.displayName}` : undefined} />
          {!valid ? (
            <ErrorCard error={new Error('This QR code is not a valid customer code.')} title="Invalid code" />
          ) : null}
          {valid && !cafeteria ? (
            <ErrorCard
              error={new Error('Add a cafeteria to your organization before registering orders.')}
              title="No active cafeteria"
            />
          ) : null}
          {valid && cafeteria ? <RegisterFlow qrToken={token} cafeteria={cafeteria} /> : null}
        </div>
      )}
    </OrgGuard>
  )
}

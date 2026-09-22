'use client'

import { MapPinIcon } from 'lucide-react'

import { ErrorCard } from '@/components/shared/error-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCafeterias } from '@/hooks/use-org-data'

export function CafeteriasList({ organizationId }: { organizationId: string }) {
  const cafeterias = useCafeterias(organizationId)
  if (cafeterias.isPending) return <Skeleton className="h-24 w-full rounded-xl" />
  if (cafeterias.isError) return <ErrorCard error={cafeterias.error} onRetry={() => cafeterias.refetch()} />
  if (cafeterias.data.length === 0) return <p className="text-sm text-muted-foreground">No cafeterias yet.</p>
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {cafeterias.data.map((c) => (
        <li key={c.id} className="flex flex-col gap-0.5 p-3">
          <span className="text-sm font-medium">{c.displayName}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="size-3" aria-hidden="true" /> {c.location}
          </span>
        </li>
      ))}
    </ul>
  )
}

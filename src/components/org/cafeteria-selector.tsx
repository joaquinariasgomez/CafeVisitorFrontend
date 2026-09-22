'use client'

import { useState } from 'react'
import { CheckIcon, ChevronDownIcon, MapPinIcon } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Cafeteria, Organization } from '@/lib/api/types'
import { roleLabel } from '@/lib/roles'

export function CafeteriaSelector({
  organizations,
  organization,
  cafeteria,
  onSelect,
}: {
  organizations: Organization[]
  organization: Organization
  cafeteria: Cafeteria | undefined
  onSelect: (organizationId: string, cafeteriaId: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="h-auto w-full justify-between py-2 text-left" />}>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs text-muted-foreground">{organization.displayName}</span>
          <span className="truncate font-medium">{cafeteria?.displayName ?? 'No cafeteria yet'}</span>
        </span>
        <ChevronDownIcon className="shrink-0 text-muted-foreground" />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Active cafeteria</SheetTitle>
          <SheetDescription>Orders you register and the stats you see use this cafeteria.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          {organizations.map((org) => (
            <section key={org.id} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {org.displayName} <Badge variant="secondary">{roleLabel(org.role)}</Badge>
              </h3>
              {org.cafeterias.length === 0 ? <p className="text-sm text-muted-foreground">No cafeterias yet.</p> : null}
              <ul className="flex flex-col gap-1">
                {org.cafeterias.map((c) => {
                  const selected = c.id === cafeteria?.id && org.id === organization.id
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(org.id, c.id)
                          setOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-muted',
                          selected && 'border-primary bg-accent'
                        )}
                        aria-pressed={selected}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{c.displayName}</span>
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPinIcon className="size-3" aria-hidden="true" /> {c.location}
                          </span>
                        </span>
                        {selected ? <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

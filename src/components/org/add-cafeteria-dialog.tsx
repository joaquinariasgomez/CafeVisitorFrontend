'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useCreateCafeteria } from '@/hooks/use-org-data'
import { errorMessage } from '@/lib/api/errors'

export function AddCafeteriaDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const create = useCreateCafeteria(organizationId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon /> Add cafeteria
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(
              { displayName, location },
              {
                onSuccess: (cafeteria) => {
                  toast.add({ type: 'success', title: `${cafeteria.displayName} added` })
                  setDisplayName('')
                  setLocation('')
                  setOpen(false)
                },
                onError: (error) =>
                  toast.add({ type: 'error', title: 'Could not add cafeteria', description: errorMessage(error) }),
              }
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a cafeteria</DialogTitle>
            <DialogDescription>Staff can select it as their active cafeteria right away.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="cafeteria-name">Name</FieldLabel>
            <Input
              id="cafeteria-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Northside Station"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="cafeteria-location">Location</FieldLabel>
            <Input
              id="cafeteria-location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Central Station, Hall B"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !displayName || !location}>
              {create.isPending ? <Spinner /> : null} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

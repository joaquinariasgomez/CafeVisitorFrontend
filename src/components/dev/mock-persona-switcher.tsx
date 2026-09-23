'use client'

import { useSyncExternalStore } from 'react'
import { FlaskConicalIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOCK_PERSONAS, PERSONA_LABELS, readPersona, writePersona, type MockPersona } from '@/lib/api/mock/persona'

const subscribe = () => () => {}

export function MockPersonaSwitcher() {
  // Server snapshot is null so the switcher only renders after hydration.
  const persona = useSyncExternalStore<MockPersona | null>(subscribe, readPersona, () => null)

  if (!persona) return null

  return (
    <div className="fixed top-2 right-14 z-50 sm:top-auto sm:right-auto sm:bottom-24 sm:left-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="Switch mock persona" className="shadow-md" />}
        >
          <FlaskConicalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Mock persona</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={persona}
            onValueChange={(value) => {
              writePersona(value as MockPersona)
              // Full reload on purpose: it resets the in-memory mock state for the new persona.
              window.location.assign(new URL('/', window.location.origin))
            }}
          >
            {MOCK_PERSONAS.map((p) => (
              <DropdownMenuRadioItem key={p} value={p}>
                {PERSONA_LABELS[p]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMocks } from '@/lib/config'
import { parseScannedValue } from '@/lib/qr'

/** Same value as MOCK_CUSTOMER_TOKEN in lib/api/mock/fixtures.ts; duplicated so fixtures stay out of prod bundles. */
const MOCK_HINT = '11111111-1111-4111-8111-111111111111'

export function ManualTokenForm({ onToken }: { onToken: (token: string) => void }) {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const token = parseScannedValue(value)
        if (!token) {
          setInvalid(true)
          return
        }
        onToken(token)
      }}
    >
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="manual-token">Customer code</FieldLabel>
        <Input
          id="manual-token"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setInvalid(false)
          }}
          placeholder="Paste the code or link from the customer"
          autoComplete="off"
          aria-invalid={invalid}
        />
        <FieldDescription>
          {useMocks ? `Mock mode: try ${MOCK_HINT}` : 'Ask the customer to open their QR card and read the code under it.'}
        </FieldDescription>
        {invalid ? <FieldError>That does not look like a valid customer code.</FieldError> : null}
      </Field>
      <Button type="submit" variant="secondary" disabled={!value.trim()}>
        Continue
      </Button>
    </form>
  )
}

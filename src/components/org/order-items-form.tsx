'use client'

import { cn } from 'cn'

import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ORDER_ITEM_OPTIONS } from '@/lib/config'

export function OrderItemsForm({
  items,
  note,
  onItemsChange,
  onNoteChange,
  disabled,
}: {
  items: string[]
  note: string
  onItemsChange: (items: string[]) => void
  onNoteChange: (note: string) => void
  disabled?: boolean
}) {
  const toggle = (item: string) =>
    onItemsChange(items.includes(item) ? items.filter((i) => i !== item) : [...items, item])

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="text-sm font-medium">What did they order?</legend>
        <div className="flex flex-wrap gap-2">
          {ORDER_ITEM_OPTIONS.map((item) => {
            const selected = items.includes(item)
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(item)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                )}
              >
                {item}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Optional. Tap everything that applies.</p>
      </fieldset>
      <Field>
        <FieldLabel htmlFor="order-note">Note</FieldLabel>
        <Textarea
          id="order-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="e.g. oat milk, extra hot"
          rows={2}
          maxLength={200}
          disabled={disabled}
        />
      </Field>
    </div>
  )
}

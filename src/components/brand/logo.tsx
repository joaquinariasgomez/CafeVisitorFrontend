import { CoffeeIcon } from 'lucide-react'
import { cn } from 'cn'

import { APP_NAME } from '@/lib/config'

export function Logo({ className, size = 'default' }: { className?: string; size?: 'default' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-tight',
        size === 'lg' ? 'text-2xl' : 'text-lg',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground',
          size === 'lg' ? 'size-10' : 'size-7'
        )}
      >
        <CoffeeIcon className={size === 'lg' ? 'size-6' : 'size-4'} aria-hidden="true" />
      </span>
      {APP_NAME}
    </span>
  )
}

'use client'

import { ErrorCard } from '@/components/shared/error-card'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-8">
      <ErrorCard error={error} title="Something went wrong" onRetry={reset} />
    </div>
  )
}

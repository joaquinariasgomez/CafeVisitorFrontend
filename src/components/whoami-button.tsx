'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { backendFetch } from '@/lib/backend/client'

export function WhoAmIButton() {
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleWhoAmI = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await backendFetch('/whoami')

      if (!response.ok) {
        throw new Error(`Backend request failed (${response.status})`)
      }

      setResult(await response.json())
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleWhoAmI} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Who am I?'}
      </Button>
      {error && <p className="text-sm text-destructive-500">{error}</p>}
      {result !== null && (
        <pre className="max-w-full overflow-auto rounded border p-3 text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
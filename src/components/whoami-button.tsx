'use client'

import { useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'

import { Button } from '@/components/ui/button'
import { backendFetch } from '@/lib/backend/client'

export function WhoAmIButton() {
  const [result, setResult] = useState<unknown>(null)
  const [qrCode, setQrCode] = useState<{ imageUrl: string; targetUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleWhoAmI = async () => {
    setIsLoading(true)
    setResult(null)
    setQrCode(null)
    setError(null)

    try {
      const response = await backendFetch('/whoami')

      if (!response.ok) {
        throw new Error(`Backend request failed (${response.status})`)
      }

      const body: unknown = await response.json()

      if (
        typeof body !== 'object' ||
        body === null ||
        !('qrToken' in body) ||
        typeof body.qrToken !== 'string' ||
        body.qrToken.length === 0
      ) {
        throw new Error('Backend response did not include a valid qrToken')
      }

      const targetUrl = `${window.location.origin}/protected/qr/${encodeURIComponent(body.qrToken)}`
      const imageUrl = await QRCode.toDataURL(targetUrl)

      setResult(body)
      setQrCode({ imageUrl, targetUrl })
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
      {qrCode && (
        <a href={qrCode.targetUrl} aria-label="Open QR code destination">
          <Image
            src={qrCode.imageUrl}
            alt="QR code for your protected route"
            width={256}
            height={256}
            unoptimized
          />
        </a>
      )}
    </div>
  )
}
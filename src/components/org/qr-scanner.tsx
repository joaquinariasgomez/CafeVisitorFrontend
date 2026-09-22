'use client'

import { useState } from 'react'
import { Scanner, type IScannerError } from '@yudiel/react-qr-scanner'
import { CameraOffIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { parseScannedValue } from '@/lib/qr'

const ERROR_COPY: Record<IScannerError['kind'], string> = {
  'permission-denied':
    'Camera access was denied. Allow camera access for this site in your browser settings, then reload.',
  'no-camera': 'No camera was found on this device.',
  'in-use': 'The camera is being used by another app.',
  overconstrained: 'The camera does not support the requested settings.',
  'insecure-context': 'Camera access requires HTTPS.',
  unsupported: 'This browser does not support camera scanning.',
  aborted: 'Camera start was interrupted.',
  security: 'Camera access was blocked by the browser.',
  'type-error': 'Could not start the camera.',
  unknown: 'Could not start the camera.',
}

export default function QrScanner({ onToken, paused = false }: { onToken: (token: string) => void; paused?: boolean }) {
  const [error, setError] = useState<IScannerError | null>(null)
  const [rejected, setRejected] = useState(false)

  if (error) {
    return (
      <Alert variant="destructive">
        <CameraOffIcon />
        <AlertTitle>Camera unavailable</AlertTitle>
        <AlertDescription>{ERROR_COPY[error.kind] ?? ERROR_COPY.unknown}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <Scanner
        onScan={(codes) => {
          const token = codes.map((c) => parseScannedValue(c.rawValue)).find((t): t is string => Boolean(t))
          if (token) onToken(token)
          else setRejected(true)
        }}
        onError={setError}
        formats={['qr_code']}
        paused={paused}
        constraints={{ facingMode: 'environment' }}
        components={{ finder: true, torch: true, onOff: false, zoom: false }}
        allowMultiple
        scanDelay={1500}
        sound={false}
        styles={{ container: { width: '100%', aspectRatio: '3 / 4' }, video: { objectFit: 'cover' } }}
      />
      {rejected ? (
        <p className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-center text-xs text-white">
          That code is not a CafeVisitor customer code.
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ExpandIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { User } from '@/lib/api/types'
import { buildRegisterUrl } from '@/lib/qr'
import { QrFullscreenDialog } from './qr-fullscreen-dialog'

export function useQrSvg(qrToken: string) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const url = buildRegisterUrl(window.location.origin, qrToken)
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((result) => {
      if (!cancelled) setSvg(`data:image/svg+xml;utf8,${encodeURIComponent(result)}`)
    })
    return () => {
      cancelled = true
    }
  }, [qrToken])

  return svg
}

export function QrCard({ user }: { user: User }) {
  const svg = useQrSvg(user.qrToken)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-4 px-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Show my QR code full screen"
        >
          <div className="rounded-xl bg-white p-2 shadow-sm">
            {svg ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL generated on the client
              <img src={svg} alt="Your QR code" className="size-28" />
            ) : (
              <Skeleton className="size-28" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
              <span className="truncate font-medium">{user.displayName ?? 'Your card'}</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Show this code at the counter so staff can register your order.
            </p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-foreground/90">
              <ExpandIcon className="size-3.5" aria-hidden="true" /> Tap to enlarge
            </span>
          </div>
        </button>
      </Card>
      <QrFullscreenDialog open={open} onOpenChange={setOpen} svg={svg} name={user.displayName} />
    </>
  )
}

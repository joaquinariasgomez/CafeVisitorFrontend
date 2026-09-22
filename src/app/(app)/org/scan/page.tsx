'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { KeyboardIcon } from 'lucide-react'

import { ManualTokenForm } from '@/components/org/manual-token-form'
import { OrgGuard } from '@/components/org/org-guard'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { REGISTER_PATH_PREFIX } from '@/lib/qr'

const QrScanner = dynamic(() => import('@/components/org/qr-scanner'), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[3/4] w-full rounded-2xl" />,
})

export default function ScanPage() {
  const router = useRouter()
  const [manual, setManual] = useState(false)
  const [navigating, setNavigating] = useState(false)

  const goToRegister = (token: string) => {
    if (navigating) return
    setNavigating(true)
    router.push(`${REGISTER_PATH_PREFIX}${encodeURIComponent(token)}`)
  }

  return (
    <OrgGuard>
      {({ cafeteria }) => (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Scan customer QR"
            description={cafeteria ? `Registering at ${cafeteria.displayName}` : 'Select a cafeteria first'}
          />
          {manual ? <ManualTokenForm onToken={goToRegister} /> : <QrScanner onToken={goToRegister} paused={navigating} />}
          <Button variant="ghost" onClick={() => setManual((m) => !m)}>
            <KeyboardIcon /> {manual ? 'Use the camera' : 'Enter code manually'}
          </Button>
        </div>
      )}
    </OrgGuard>
  )
}

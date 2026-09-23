import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo size="lg" />
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The link may be outdated or the QR code may be invalid.</p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false}>Go home</Button>
    </div>
  )
}

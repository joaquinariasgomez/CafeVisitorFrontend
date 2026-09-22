'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function QrFullscreenDialog({
  open,
  onOpenChange,
  svg,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  svg: string | null
  name: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-svh max-h-svh w-screen max-w-none flex-col items-center justify-center gap-6 rounded-none bg-white text-neutral-900 sm:h-auto sm:max-h-[90vh] sm:w-auto sm:max-w-md sm:rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-neutral-900">{name ?? 'Your QR code'}</DialogTitle>
          <DialogDescription className="text-neutral-600">Hold the screen steady for the cashier.</DialogDescription>
        </DialogHeader>
        {svg ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL generated on the client
          <img src={svg} alt="Your QR code, enlarged" className="w-full max-w-xs" />
        ) : (
          <Skeleton className="size-72" />
        )}
        <p className="text-xs text-neutral-500">Tap outside or press Escape to close.</p>
      </DialogContent>
    </Dialog>
  )
}

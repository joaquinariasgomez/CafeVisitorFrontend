'use client'

import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserContext } from '@/lib/api/types'
import { AvatarMenu } from './avatar-menu'
import type { AppView } from './tab-bar'

export function TopBar({ context, view }: { context: UserContext | undefined; view: AppView | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
        <Link href={view === 'org' ? '/org' : '/client'} aria-label="Home">
          <Logo />
        </Link>
        {context ? <AvatarMenu context={context} view={view} /> : <Skeleton className="size-8 rounded-full" />}
      </div>
    </header>
  )
}

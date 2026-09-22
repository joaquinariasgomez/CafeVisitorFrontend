'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3Icon, HomeIcon, ReceiptTextIcon, ScanLineIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'

export type AppView = 'client' | 'org'

const TABS: Record<AppView, Array<{ href: string; label: string; icon: LucideIcon; exact?: boolean }>> = {
  client: [
    { href: '/client', label: 'Home', icon: HomeIcon, exact: true },
    { href: '/client/orders', label: 'Orders', icon: ReceiptTextIcon },
  ],
  org: [
    { href: '/org', label: 'Home', icon: HomeIcon, exact: true },
    { href: '/org/scan', label: 'Scan', icon: ScanLineIcon },
    { href: '/org/stats', label: 'Stats', icon: BarChart3Icon },
    { href: '/org/manage', label: 'Manage', icon: UsersIcon },
  ],
}

export function TabBar({ view }: { view: AppView }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex w-full max-w-lg items-stretch">
        {TABS[view].map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="size-5" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

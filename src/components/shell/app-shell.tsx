'use client'

import { usePathname } from 'next/navigation'

import { useUserContext } from '@/hooks/use-user-context'
import { ProfilePrompt } from './profile-prompt'
import { SessionEmailProvider } from './session-email'
import { TabBar, type AppView } from './tab-bar'
import { TopBar } from './top-bar'

function viewFromPath(pathname: string): AppView | null {
  if (pathname === '/org' || pathname.startsWith('/org/')) return 'org'
  if (pathname === '/client' || pathname.startsWith('/client/')) return 'client'
  return null
}

export function AppShell({ sessionEmail, children }: { sessionEmail: string | null; children: React.ReactNode }) {
  const pathname = usePathname()
  const view = viewFromPath(pathname)
  const { data: context } = useUserContext()

  return (
    <SessionEmailProvider email={sessionEmail}>
      <div className="flex min-h-svh flex-col">
        <TopBar context={context} view={view} />
        <main
          className={
            view ? 'mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24' : 'mx-auto w-full max-w-lg flex-1 px-4 py-4'
          }
        >
          {children}
        </main>
        {view ? <TabBar view={view} /> : null}
        <ProfilePrompt context={context} />
      </div>
    </SessionEmailProvider>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { BuildingIcon, LogOutIcon, MoonIcon, SunIcon, UserIcon } from 'lucide-react'

import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserContext } from '@/lib/api/types'
import { hasOrganizations } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'
import type { AppView } from './tab-bar'

export function AvatarMenu({ context, view }: { context: UserContext; view: AppView | null }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const signOut = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />}
      >
        <UserAvatar name={context.user.displayName} avatarUrl={context.user.avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium text-foreground">{context.user.displayName ?? 'Your account'}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{context.user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {hasOrganizations(context) ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={view === 'client'} onClick={() => router.push('/client')}>
                <UserIcon /> Client view
              </DropdownMenuItem>
              <DropdownMenuItem disabled={view === 'org'} onClick={() => router.push('/org')}>
                <BuildingIcon /> Organization view
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem closeOnClick={false} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

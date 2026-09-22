'use client'

import { useState } from 'react'
import { cn } from 'cn'

import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { safeNextPath } from '@/lib/safe-next-path'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLoginWithGoogle = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const next = new URLSearchParams(window.location.search).get('next')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/oauth?next=${encodeURIComponent(safeNextPath(next, '/'))}`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Collect stamps at your favorite cafeterias. Show your QR, let staff register your order, earn rewards.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Use your Google account. Clients and cafeteria staff sign in here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginWithGoogle} className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner /> : <GoogleMark />}
              {isLoading ? 'Redirecting to Google…' : 'Continue with Google'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  )
}

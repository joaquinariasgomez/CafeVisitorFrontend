'use client'

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

import { MockPersonaSwitcher } from '@/components/dev/mock-persona-switcher'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/toast'
import { ApiProvider } from '@/lib/api'
import { useMocks } from '@/lib/config'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status
          if (status === 401 || status === 403 || status === 404) return false
          return failureCount < 2
        },
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <ApiProvider
            fallback={
              <div className="flex min-h-svh items-center justify-center">
                <Spinner className="size-6" />
              </div>
            }
          >
            {children}
            {useMocks ? <MockPersonaSwitcher /> : null}
          </ApiProvider>
        </Toaster>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

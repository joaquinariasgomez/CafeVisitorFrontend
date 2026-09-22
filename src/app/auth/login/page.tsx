import type { Metadata } from 'next'

import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-secondary/60 to-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

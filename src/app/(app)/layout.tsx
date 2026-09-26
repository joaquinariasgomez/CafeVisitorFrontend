import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/app-shell'
import { useMocks } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) redirect('/auth/login')

  // Mock users are unrelated to the real session, so mocks always use the manual-entry path.
  const sessionEmail = useMocks ? null : data.claims.email || null

  return <AppShell sessionEmail={sessionEmail}>{children}</AppShell>
}

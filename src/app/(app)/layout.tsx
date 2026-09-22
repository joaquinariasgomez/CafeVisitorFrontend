import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/app-shell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) redirect('/auth/login')

  return <AppShell>{children}</AppShell>
}

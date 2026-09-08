import { createClient } from '@/lib/supabase/client'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

export async function backendFetch(path: string, init: RequestInit = {}) {
  if (!backendUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured')
  }

  const supabase = createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!session?.access_token) throw new Error('No active session')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
  }

  return response
}
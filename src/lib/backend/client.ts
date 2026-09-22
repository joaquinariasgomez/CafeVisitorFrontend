import { ApiError } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/client'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

export async function backendFetch(path: string, init: RequestInit = {}) {
  if (!backendUrl) {
    throw new ApiError('unknown', 'NEXT_PUBLIC_BACKEND_URL is not configured')
  }

  const supabase = createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw new ApiError('unauthorized', sessionError.message, 401)
  if (!session?.access_token) throw new ApiError('unauthorized', 'No active session', 401)

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${backendUrl}${path}`, { ...init, headers })
  } catch (error) {
    throw new ApiError('network', error instanceof Error ? error.message : 'Network error')
  }

  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
    throw new ApiError('unauthorized', 'Session expired', 401)
  }

  return response
}

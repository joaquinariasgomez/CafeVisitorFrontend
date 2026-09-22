import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const { pathname, search } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    // Send unauthenticated visitors to login, remembering where they wanted to go
    // (e.g. a scanned QR deep link) so the OAuth callback can bring them back.
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/auth/login') {
    // Already signed in: skip the login screen and honour a relative `next` if present.
    const next = request.nextUrl.searchParams.get('next')
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
    const [nextPath, nextQuery] = safeNext.split('?')
    const url = request.nextUrl.clone()
    url.pathname = nextPath || '/'
    url.search = nextQuery ? `?${nextQuery}` : ''
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

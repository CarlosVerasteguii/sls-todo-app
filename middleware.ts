import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Ensure headers are forwarded so Supabase can manage auth cookies without touching request bodies
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value, ...options })
          } catch {
            // ignore set errors in middleware context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            response.cookies.set({ name, value: '', ...options, maxAge: 0 })
          } catch {
            // ignore remove errors in middleware context
          }
        },
      },
    }
  )

  // Touch the session to refresh if needed; this must not consume request bodies
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)', // exclude API routes explicitly
  ],
}


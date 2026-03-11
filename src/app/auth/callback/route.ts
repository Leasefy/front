import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnUrl = searchParams.get('returnUrl') || '/'

  if (code) {
    const cookieStore = cookies()

    // Collect cookies that need to be set on the redirect response
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options })
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Ignored when called from Server Component
              }
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const response = NextResponse.redirect(`${origin}${returnUrl}`)

      // Explicitly set cookies on the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}

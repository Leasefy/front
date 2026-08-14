import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sanitizeReturnUrl } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // No explicit returnUrl → send OAuth users to the client-side resolver, which
  // reads GET /users/me and routes by role/onboarding (this server route can't).
  // An explicit, safe returnUrl (invitations, deep-links) is still honored.
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '/auth/post-login')

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

  /*
   * Sin `?code=` esto NO es necesariamente un fallo: los enlaces de invitación
   * de Supabase vuelven por el flujo implícito, con el token en el FRAGMENTO
   * (`#access_token=…`), que el navegador nunca manda al servidor. Desde acá
   * es invisible.
   *
   * Antes se caía a `/auth?error=auth_callback_failed`: el inquilino invitado
   * hacía clic en su correo, veía un error, y como una cuenta invitada no
   * tiene contraseña no tenía ninguna otra forma de entrar.
   *
   * El fragmento sobrevive a esta redirección —el navegador lo conserva
   * cuando el destino no trae uno— así que lo resuelve `/auth/enlace`, que sí
   * corre en el navegador.
   */
  return NextResponse.redirect(
    `${origin}/auth/enlace?returnUrl=${encodeURIComponent(returnUrl)}`,
  )
}

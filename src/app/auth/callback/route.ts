import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sanitizeReturnUrl } from '@/lib/utils'
import {
  COOKIE_DE_RECUPERACION,
  DURACION_DE_LA_MARCA_S,
  esEnlaceDeRecuperacion,
} from '@/lib/auth/sesion-de-recuperacion'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // No explicit returnUrl → send OAuth users to the client-side resolver, which
  // reads GET /users/me and routes by role/onboarding (this server route can't).
  // An explicit, safe returnUrl (invitations, deep-links) is still honored.
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '/auth/post-login')

  if (code) {
    const cookieStore = await cookies()

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

      // La sesión del enlace de «¿Olvidaste tu contraseña?» sólo sirve para
      // poner la nueva: si la persona se va sin terminar, la cierra
      // `SesionDeRecuperacionGuard` (ver `lib/auth/sesion-de-recuperacion.ts`).
      if (esEnlaceDeRecuperacion(returnUrl)) {
        response.cookies.set(COOKIE_DE_RECUPERACION, '1', {
          path: '/',
          maxAge: DURACION_DE_LA_MARCA_S,
          sameSite: 'lax',
          secure: origin.startsWith('https://'),
        })
      }

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

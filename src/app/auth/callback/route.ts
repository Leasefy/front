import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  COOKIE_DE_RECUPERACION,
  DURACION_DE_LA_MARCA_S,
  esEnlaceDeRecuperacion,
} from '@/lib/auth/sesion-de-recuperacion'
import { leerRegresoDelCorreo, urlDeLaPantallaDeConfirmacion } from '@/lib/auth/regreso-del-correo'

/*
 * El regreso de los enlaces de Supabase. Tres formas, ver
 * `src/lib/auth/regreso-del-correo.ts`:
 *
 *  · `?token_hash=` (plantilla nueva de confirmar correo): NO se gasta acá.
 *    Un GET lo hacen también los escáneres de enlaces del correo, y un token
 *    gastado por el escáner le llegaba a la persona como «vencido». Se pasa a
 *    `/auth/confirmar`, que pide el clic y abre la sesión con `verifyOtp`
 *    (sirve en cualquier navegador, no sólo en el del registro).
 *  · `?code=` (PKCE: Google, y la plantilla vieja con `{{ .ConfirmationURL }}`).
 *  · nada de eso: el token o el error vienen en el FRAGMENTO, que el servidor
 *    no ve; lo resuelve `/auth/enlace` en el navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const regreso = leerRegresoDelCorreo(searchParams)

  if (regreso.accion === 'confirmar') {
    return NextResponse.redirect(`${origin}${urlDeLaPantallaDeConfirmacion(regreso)}`)
  }

  if (regreso.accion === 'canjear') {
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

    const { error } = await supabase.auth
      .exchangeCodeForSession(regreso.code)
      .catch((e: unknown) => ({ error: e }))

    if (!error) {
      const response = NextResponse.redirect(`${origin}${regreso.destino}`)

      // Explicitly set cookies on the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      // La sesión del enlace de «¿Olvidaste tu contraseña?» sólo sirve para
      // poner la nueva: si la persona se va sin terminar, la cierra
      // `SesionDeRecuperacionGuard` (ver `lib/auth/sesion-de-recuperacion.ts`).
      if (esEnlaceDeRecuperacion(regreso.destino)) {
        response.cookies.set(COOKIE_DE_RECUPERACION, '1', {
          path: '/',
          maxAge: DURACION_DE_LA_MARCA_S,
          sameSite: 'lax',
          secure: origin.startsWith('https://'),
        })
      }

      return response
    }

    /*
     * El canje falló en un enlace del REGISTRO. Lo típico: se abrió en otro
     * navegador (sin el `code_verifier` de PKCE: «PKCE code verifier not found
     * in storage»), o el código ya se había usado. Pero a este punto Supabase
     * YA confirmó la cuenta: sólo emite el `code` después de confirmar. Decir
     * «vencido» acá era falso; lo cierto es «tu correo quedó confirmado,
     * inicia sesión».
     */
    if (regreso.esRegistro) {
      return NextResponse.redirect(
        `${origin}/auth/enlace?returnUrl=${encodeURIComponent(regreso.destino)}&estado=confirmado`,
      )
    }
  }

  /*
   * Sin `?code=` esto NO es necesariamente un fallo: los enlaces de invitación
   * de Supabase vuelven por el flujo implícito, con el token en el FRAGMENTO
   * (`#access_token=…`), que el navegador nunca manda al servidor. Desde acá
   * es invisible. Lo mismo el error de un enlace ya gastado
   * (`#error_code=otp_expired`).
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
    `${origin}/auth/enlace?returnUrl=${encodeURIComponent(regreso.destino)}`,
  )
}

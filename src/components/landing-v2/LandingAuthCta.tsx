'use client'

import { useAuth } from '@/lib/auth/use-auth'
import { getRoleHomeRoute } from '@/lib/auth/role-routes'

interface LandingAuthCtaProps {
  /** Matches the two spots this CTA replaces in LandingHome.tsx markup. */
  variant?: 'header' | 'mobile'
}

const VARIANT_CLASS: Record<NonNullable<LandingAuthCtaProps['variant']>, string> = {
  header: 'btn outline sm',
  mobile: 'btn outline lg',
}

/**
 * Landing header/mobile-menu auth CTA.
 *
 * Replaces the previously hardcoded `http://localhost:3001/auth` anchor
 * (absolute URL + target="_blank", opened a new tab out of the app and
 * never reflected an existing session).
 *
 * Mientras la sesión no se sabe (`isLoading`, que es el estado inicial en el
 * servidor y en el primer render del cliente: sin desajuste de hidratación)
 * NO pinta ningún botón de sesión: deja un hueco del mismo tamaño, invisible.
 * Antes pintaba «Iniciar sesión» y, segundos después, «Ir al panel» —o al
 * revés—: QA 01-10-2026 vio los botones cambiar solos. Ver
 * `HuecoDeBotonDeSesion`.
 */
export function LandingAuthCta({ variant = 'header' }: LandingAuthCtaProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const className = VARIANT_CLASS[variant]

  if (isLoading) return <HuecoDeBotonDeSesion className={className} texto="Iniciar sesión" />

  if (!isLoading && isAuthenticated && user) {
    return (
      <a className={className} href={getRoleHomeRoute(user.role)}>
        Ir al panel
      </a>
    )
  }

  return (
    <a className={className} href="/auth">
      Iniciar sesión
    </a>
  )
}

/**
 * El lugar de un botón de sesión mientras no se sabe si hay sesión: mismo
 * tamaño (mismas clases y un texto de referencia), invisible y fuera del árbol
 * de accesibilidad, para que el encabezado no salte ni anuncie nada falso.
 */
export function HuecoDeBotonDeSesion({ className, texto }: { className: string; texto: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      data-testid="hueco-de-boton-de-sesion"
      style={{ visibility: 'hidden' }}
    >
      {texto}
    </span>
  )
}

'use client'

import Link from 'next/link'

import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { seVeElEnlace } from '@/lib/nav/se-ve-el-enlace'
import { quienLoHace, rolesDelEnlace } from '@/lib/piloto/quien-abre-el-enlace'

/**
 * PILOTO-ACTIVO (04-10-2026): el enlace de una cosa que le falta a la
 * operación, SÓLO para quien puede abrir esa pantalla. A los demás les dice
 * quién lo hace (en vivo, la asesora caía en «No tienes acceso a esto»).
 * Fuera del panel (sin permisos cargados en el contexto) se muestra como antes.
 */
export function EnlaceQueSePuedeAbrir({
  href,
  texto,
  className,
  testid,
}: {
  href: string
  texto: string
  className: string
  testid?: string
}) {
  const permisos = usePermissionsContextSafe()
  const roles = rolesDelEnlace(href)
  const seVe =
    !permisos ||
    seVeElEnlace(roles ? { roles } : {}, {
      isAdmin: permisos.isAdmin,
      agencyRole: permisos.agencyRole,
      isLoading: permisos.isLoading,
    })
  if (seVe) {
    return (
      <Link href={href} className={className} {...(testid ? { 'data-testid': testid } : {})}>
        {texto}
      </Link>
    )
  }
  return (
    <span className="text-caption text-muted-foreground" {...(testid ? { 'data-testid': `${testid}-sin-acceso` } : {})}>
      {quienLoHace(roles ?? [])}
    </span>
  )
}

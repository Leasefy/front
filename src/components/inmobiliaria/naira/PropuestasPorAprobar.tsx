'use client'

/**
 * PropuestasPorAprobar — «Tienes N propuestas de Naira por aprobar» arriba del Briefing (#35, Nico 15-10-2026: el chat ya
 * lo dice; también el correo y el panel del briefing).
 *
 * Solo para quien puede aprobar (`action-approve-internal` o `action-approve-external`: dueño y admin) y solo lo que el
 * servidor dice que ESA persona puede decidir hoy (`estado === 'pendiente'` y `puedeDecidir`). Sin propuestas, con datos
 * de ejemplo o si la lectura falla, no se pinta nada: el aviso nunca tapa el briefing.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

import { leerPropuestas } from '@/lib/api/naira/cliente'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'
import { RUTA_DE_APROBACIONES } from '@/lib/nav/rutas-de-naira'

export function PropuestasPorAprobar(): JSX.Element | null {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const agencyId = useAuth().agency?.id ?? ''
  const puedeAprobar = canAccess('naira', 'action-approve-internal') || canAccess('naira', 'action-approve-external')
  const [cuantas, setCuantas] = useState(0)

  useEffect(() => {
    if (!puedeAprobar || agencyId === '') return
    let vivo = true
    void leerPropuestas(agencyId).then((r) => {
      if (!vivo || r.kind !== 'ok' || r.origen !== 'agente') return
      setCuantas(r.data.acciones.filter((a) => a.estado === 'pendiente' && a.puedeDecidir).length)
    })
    return () => {
      vivo = false
    }
  }, [agencyId, puedeAprobar])

  if (!puedeAprobar || cuantas < 1) return null
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated p-4"
      data-testid="naira-propuestas-por-aprobar"
    >
      <p className="text-sm font-medium text-fg">
        {cuantas === 1 ? t('inmobiliaria.ai.naira.porAprobar.una') : t('inmobiliaria.ai.naira.porAprobar.varias', { n: cuantas })}
      </p>
      <Link href={RUTA_DE_APROBACIONES} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        {t('inmobiliaria.ai.naira.porAprobar.ver')}
      </Link>
    </section>
  )
}

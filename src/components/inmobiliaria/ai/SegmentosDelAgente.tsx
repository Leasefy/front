'use client'

/**
 * Las pantallas hermanas de una pestaña del agente, como `SegmentedControl`
 * (revisora r25, C2, ronda 26): Cobranza pasó de 14 pestañas del mismo peso a
 * 7, agrupadas por trabajo; dentro de «Contactos» se elige Llamadas · Cartas ·
 * Recordatorios. Cada segmento es una ruta: elegir uno navega. Los gates
 * espejan los de la barra (nadie ve un segmento que no puede abrir); con uno
 * solo no se pinta.
 */
import { usePathname, useRouter } from 'next/navigation'
import { SegmentedControl } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { findAgentWorkspace, pestanaQueContiene } from '@/lib/nav/agentWorkspaceNav'

export function SegmentosDelAgente({ className }: { className?: string }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()

  const ws = findAgentWorkspace(pathname)
  const pestana = ws?.items.find((it) => (it.segmentos?.length ?? 0) > 0 && pestanaQueContiene(it, pathname))
  if (!pestana) return null

  const segmentos = (pestana.segmentos ?? []).filter(
    (s) => !s.module || canAccess(s.module, s.action ?? 'view'),
  )
  if (segmentos.length < 2) return null

  // El segmento de la ruta: el de href más largo que la contiene (la ficha de una carta es «Cartas»).
  const actual = [...segmentos]
    .filter((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (!actual) return null

  return (
    <div className={className} data-testid="segmentos-del-agente">
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <SegmentedControl<string>
          aria-label={t(pestana.labelKey)}
          size="sm"
          value={actual.href}
          onChange={(href) => {
            if (href !== pathname) router.push(href)
          }}
          options={segmentos.map((s) => ({ value: s.href, label: t(s.labelKey) }))}
        />
      </div>
    </div>
  )
}

'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching/configuracion — postura de
 * autonomía de Matching.
 *
 * GET /ai-hub/agentes/matching/autonomia alimenta el <AutonomiaPanel>
 * transversal, y el modo se guarda de verdad (PUT …/autonomia) para
 * administradores; un no-admin lo ve como chip de lectura.
 *
 * ── Por qué se rehizo (Nico, 2026-09-08: «esta UX está horrible y la UI
 * TAMBIÉN») ────────────────────────────────────────────────────────────────
 * El grueso estaba en el panel compartido —emojis en el control, la misma cosa
 * explicada dos veces en gris chico, y «Límites del agente» con una frase
 * entera arrojada al borde derecho— y ahí se arregló, así que las seis
 * pantallas de configuración lo heredan.
 *
 * Lo que faltaba acá: la pantalla terminaba en el aire. Elegir cuánto decide
 * el agente solo tiene sentido si desde el mismo lugar se puede ir a ver lo
 * que decidió. Por eso cierra con las dos salidas reales —su cola y el
 * Piloto—, sin inventar ningún dato.
 */

import Link from 'next/link'
import { CaretRight, ClipboardText, Lightning } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AutonomiaPanel } from '@/components/inmobiliaria/ai/AutonomiaPanel'
import { SectionLabel } from '@/components/ui/section-label'
import { useAgentAutonomia } from '@/lib/hooks/ai/use-agent-autonomia'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'
const COMUN_NS = 'inmobiliaria.ai.workspace.pages.comun'

const SALIDAS: { claveLabel: string; claveDetalle: string; href: string; icon: Icon }[] = [
  {
    claveLabel: `${COMUN_NS}.configVerCola`,
    claveDetalle: `${COMUN_NS}.configVerColaDesc`,
    href: '/panel/inmobiliaria/postulaciones/matching/cola',
    icon: ClipboardText,
  },
  {
    claveLabel: `${COMUN_NS}.configVerPiloto`,
    claveDetalle: `${COMUN_NS}.configVerPilotoDesc`,
    href: '/panel/inmobiliaria/piloto',
    icon: Lightning,
  },
]

function MatchingConfiguracion() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const { data, isLoading, error, busy, setModo, refetch } = useAgentAutonomia('matching')

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="space-y-1.5">
        <SectionLabel>{t(`${PAGES_NS}.salaTitulo`)}</SectionLabel>
        <h1 className="text-h2 text-fg">{t(`${COMUN_NS}.configTitle`)}</h1>
        <p className="max-w-2xl text-sm text-fg-muted">{t(`${PAGES_NS}.salaDesc`)}</p>
      </header>

      <AutonomiaPanel
        data={data}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        onCambiarModo={setModo}
        puedeCambiar={isAdmin}
        busy={busy}
      />

      <section className="space-y-3" aria-label={t(`${COMUN_NS}.configDondeTitulo`)}>
        <h2 className="text-sm font-semibold text-fg">{t(`${COMUN_NS}.configDondeTitulo`)}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SALIDAS.map((s) => {
            const SalidaIcon = s.icon
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:bg-surface-muted/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted transition group-hover:text-fg">
                  <SalidaIcon className="h-5 w-5" weight="duotone" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{t(s.claveLabel)}</span>
                  <span className="block truncate text-xs text-fg-muted">{t(s.claveDetalle)}</span>
                </span>
                <CaretRight
                  className="h-3.5 w-3.5 shrink-0 text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function MatchingConfiguracionPage() {
  return (
    <PageGuard module="matching">
      <MatchingConfiguracion />
    </PageGuard>
  )
}

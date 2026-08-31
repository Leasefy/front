'use client'

/**
 * /panel/inmobiliaria/piloto — el Piloto automático.
 *
 * La torre de control transversal de los agentes: qué hicieron (feed), qué
 * necesitan de ti (bandeja priorizada), el briefing del Gerente y la
 * autonomía por agente. Contrato: agent-integracion/claudedocs/
 * piloto-contratos-v1.md §4–§5.
 *
 * Fail-soft POR WIDGET: cada pieza maneja su propio loading/error/vacío —
 * un endpoint caído no tumba la página.
 *
 * Layout: KPIs arriba → grid 2 columnas (Bandeja ~60% / Briefing + Autonomía)
 * → Feed abajo a lo ancho. Una columna en móvil.
 */

import { useCallback, useMemo } from 'react'

import { useI18n } from '@/lib/i18n'
import { usePilotoInbox } from '@/lib/hooks/piloto/use-piloto-inbox'
import { usePilotoActivity } from '@/lib/hooks/piloto/use-piloto-activity'
import { usePilotoBriefing } from '@/lib/hooks/piloto/use-piloto-briefing'
import { PilotoKpis } from '@/components/inmobiliaria/piloto/PilotoKpis'
import { PilotoBandeja } from '@/components/inmobiliaria/piloto/PilotoBandeja'
import { PilotoBriefing } from '@/components/inmobiliaria/piloto/PilotoBriefing'
import { PilotoAutonomia } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { PilotoFeed } from '@/components/inmobiliaria/piloto/PilotoFeed'

export default function PilotoPage() {
  const { t } = useI18n()
  const inbox = usePilotoInbox()
  const actividad = usePilotoActivity(50)
  const briefing = usePilotoBriefing()

  // KPI «Actividad de hoy»: count del feed con `at` de hoy (hora local).
  // `undefined` cuando la fuente no contestó — un «—» honesto, nunca un 0.
  const actividadHoy = useMemo(() => {
    if (actividad.error || actividad.notAvailable) return undefined
    if (actividad.isLoading && actividad.items.length === 0) return undefined
    const inicioDeHoy = new Date()
    inicioDeHoy.setHours(0, 0, 0, 0)
    return actividad.items.filter((item) => {
      const at = new Date(item.at).getTime()
      return !Number.isNaN(at) && at >= inicioDeHoy.getTime()
    }).length
  }, [actividad.error, actividad.notAvailable, actividad.isLoading, actividad.items])

  const inboxSinDato = Boolean(inbox.error) || inbox.notAvailable

  // Tras una acción de la bandeja se refresca TAMBIÉN el feed: la acción
  // ejecutada es, precisamente, actividad nueva.
  const refetchTrasAccion = useCallback(async () => {
    await Promise.allSettled([inbox.refetch(), actividad.refetch()])
  }, [inbox.refetch, actividad.refetch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="piloto-page">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('inmobiliaria.piloto.titulo')}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.piloto.descripcion')}
        </p>
      </header>

      {/* KPIs — solo números que TENEMOS de los hooks */}
      <PilotoKpis
        pendientes={inboxSinDato ? undefined : inbox.total}
        alta={inboxSinDato ? undefined : inbox.porPrioridad.alta}
        media={inboxSinDato ? undefined : inbox.porPrioridad.media}
        actividadHoy={actividadHoy}
        // Del briefing y solo si viene con la forma esperada — sin dato el
        // tile de plata no se pinta.
        recuperadoMesCop={
          typeof briefing.data?.numeros?.recuperadoMesCop === 'number'
            ? briefing.data.numeros.recuperadoMesCop
            : undefined
        }
        isLoading={inbox.isLoading && actividad.isLoading}
      />

      {/* Bandeja (60%) + columna derecha (Briefing + Autonomía) */}
      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <div className="lg:col-span-3">
          <PilotoBandeja
            items={inbox.items}
            isLoading={inbox.isLoading}
            error={inbox.error}
            onRefetch={refetchTrasAccion}
          />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <PilotoBriefing
            data={briefing.data}
            isLoading={briefing.isLoading}
            error={briefing.error}
          />
          <PilotoAutonomia />
        </div>
      </div>

      {/* Feed a lo ancho */}
      <PilotoFeed
        items={actividad.items}
        isLoading={actividad.isLoading}
        error={actividad.error}
      />
    </div>
  )
}

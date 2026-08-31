'use client'

/**
 * /panel/inmobiliaria/piloto — la torre de control de los agentes.
 *
 * ── El rediseño del 2026-08-30 ─────────────────────────────────────────────
 * La primera versión medía 8.079 px: diez pantallas de scroll para veinte
 * decisiones. El feed pesaba más que la bandeja, veintiún chips rojos
 * decían «ALTA» y los KPIs, el briefing y la bandeja repetían el mismo
 * número tres veces. Lo que se rediseñó, y por qué, está documentado arriba
 * de cada componente.
 *
 * La página responde tres preguntas, en este orden:
 *
 *   1. ¿Qué necesita de mí?   → la bandeja, a la izquierda y ancha.
 *   2. ¿Cómo viene el día?    → la banda del briefing + los cuatro números.
 *   3. ¿Qué hicieron sin mí?  → el feed, a la derecha y acotado.
 *
 * La autonomía —configuración, no operación— se fue a un panel lateral que
 * se abre desde el encabezado.
 *
 * Fail-soft POR WIDGET: cada pieza maneja su propio cargando/error/vacío;
 * un endpoint caído no tumba la pantalla.
 */

import { useCallback, useMemo } from 'react'

import { useI18n } from '@/lib/i18n'
import { usePilotoInbox } from '@/lib/hooks/piloto/use-piloto-inbox'
import { usePilotoActivity } from '@/lib/hooks/piloto/use-piloto-activity'
import { usePilotoBriefing } from '@/lib/hooks/piloto/use-piloto-briefing'
import { usePilotoAutonomia } from '@/lib/hooks/piloto/use-piloto-autonomia'
import { usePilotoPulso } from '@/lib/hooks/piloto/use-piloto-pulso'
import { PilotoPulso } from '@/components/inmobiliaria/piloto/PilotoPulso'
import { PilotoKpis } from '@/components/inmobiliaria/piloto/PilotoKpis'
import { PilotoBandeja } from '@/components/inmobiliaria/piloto/PilotoBandeja'
import { PilotoAutonomia } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { PilotoFeed } from '@/components/inmobiliaria/piloto/PilotoFeed'

/** Una decisión «atrasada» lleva más de una semana esperando. */
const SEMANA_MS = 7 * 86_400_000

export default function PilotoPage() {
  const { t } = useI18n()
  const inbox = usePilotoInbox()
  const actividad = usePilotoActivity(50)
  const briefing = usePilotoBriefing()
  const autonomia = usePilotoAutonomia()
  const pulso = usePilotoPulso()

  const inboxSinDato = Boolean(inbox.error) || inbox.notAvailable

  /**
   * La lectura del Gerente que va DENTRO del pulso. El briefing dejó de ser
   * una banda propia: dos resúmenes del mismo momento, uno encima del otro,
   * se leen como repetición.
   */
  const lecturaDelGerente = useMemo(() => {
    const b = briefing.data
    if (!b || briefing.error) return undefined
    const frases = [
      ...(Array.isArray(b.resumen) ? b.resumen : []),
      ...(Array.isArray(b.narrativa) ? b.narrativa : []),
    ].filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    return frases.length > 0 ? frases : undefined
  }, [briefing.data, briefing.error])

  /** Cuántas decisiones llevan más de una semana paradas — la urgencia real. */
  const atrasadas = useMemo(() => {
    if (inboxSinDato) return undefined
    const corte = Date.now() - SEMANA_MS
    return inbox.items.filter((i) => new Date(i.desde).getTime() < corte).length
  }, [inbox.items, inboxSinDato])

  // KPI «Actividad de hoy»: eventos del feed con `at` de hoy (hora local).
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

  // Tras una acción de la bandeja se refresca TAMBIÉN el feed: la acción
  // ejecutada es, precisamente, actividad nueva.
  const refetchTrasAccion = useCallback(async () => {
    await Promise.allSettled([inbox.refetch(), actividad.refetch()])
  }, [inbox.refetch, actividad.refetch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-8" data-testid="piloto-page">
      {/* Encabezado — el único lugar con acciones de pantalla */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.piloto.titulo')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.piloto.descripcion')}
          </p>
        </div>
        <PilotoAutonomia />
      </header>

      {/* El tablero vivo: qué pasa ahora y qué puede explotar */}
      <PilotoPulso
        data={pulso.data}
        isLoading={pulso.isLoading}
        error={pulso.error}
        notAvailable={pulso.notAvailable}
        lectura={lecturaDelGerente}
      />

      <PilotoKpis
        pendientes={inboxSinDato ? undefined : inbox.total}
        atrasadas={atrasadas}
        actividadHoy={actividadHoy}
        recuperadoMesCop={
          typeof briefing.data?.numeros?.recuperadoMesCop === 'number'
            ? briefing.data.numeros.recuperadoMesCop
            : undefined
        }
        autonomos={
          autonomia.isLoading || autonomia.rows.length === 0
            ? undefined
            : autonomia.rows.filter((r) => r.modo === 'autonomo').length
        }
        totalAgentes={autonomia.rows.length || undefined}
        isLoading={inbox.isLoading && actividad.isLoading}
      />

      {/* Decidir (ancho) · lo que pasó (angosto) */}
      <div className="grid items-start gap-5 lg:grid-cols-5">
        {/* `min-w-0`: sin esto el contenido largo empuja el track del grid
            y la página scrollea de lado en móvil (medido: 517 > 500 px). */}
        <div className="min-w-0 lg:col-span-3">
          <PilotoBandeja
            items={inbox.items}
            isLoading={inbox.isLoading}
            error={inbox.error}
            onRefetch={refetchTrasAccion}
          />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <PilotoFeed
            items={actividad.items}
            isLoading={actividad.isLoading}
            error={actividad.error}
            onRefetch={actividad.refetch}
          />
        </div>
      </div>
    </div>
  )
}

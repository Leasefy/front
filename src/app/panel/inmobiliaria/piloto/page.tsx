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
 *   1. ¿Qué pasa ahora?       → el pulso, arriba y con el titular en grande.
 *   2. ¿Qué necesita de mí?   → la bandeja, a la izquierda y ancha.
 *   3. ¿Qué hicieron sin mí?  → el feed, a la derecha y acotado.
 *
 * La autonomía —configuración, no operación— se fue a un panel lateral que
 * se abre desde el encabezado.
 *
 * ── La segunda pasada (2026-08-31): se fue la banda de KPIs ───────────────
 * Los tres tiles de abajo del pulso repetían lo que ya estaba a la vista:
 *   · «Agentes autónomos 12/12» ≡ la píldora «Autonomía 12/12» del
 *     encabezado, a 200 px de distancia.
 *   · «Esperan tu decisión 21» ≡ el badge del sidebar ≡ «21 en total» de la
 *     bandeja. El mismo número TRES veces en una pantalla.
 *   · «Actividad de hoy 12» era una versión más vaga de los cuatro números
 *     del día que el pulso ya trae medidos (llamadas/chats/resueltas).
 * Lo único que aportaba y no estaba en ningún otro lado —cuántas decisiones
 * llevan más de una semana— se mudó al encabezado de la bandeja, que es
 * donde se actúa sobre ellas. La plata recuperada del mes subió al pulso,
 * que es la banda de números de la pantalla.
 *
 * ── Que no parezca «otra sección» (pedido de Nico, 2026-08-31) ────────────
 * Esta página se había desviado del resto del panel en tres cosas que juntas
 * hacían sentir que uno entraba a otro producto. Medido sobre las 15 páginas
 * hermanas de `/panel/inmobiliaria`:
 *   · contenedor: 12 de 15 usan `p-6 lg:p-8 space-y-6`; el Piloto era la
 *     ÚNICA con `mx-auto max-w-7xl` + `p-4 lg:p-10` — otro ancho de contenido
 *     y otros márgenes, que es lo primero que se nota al cambiar de sección.
 *   · encabezado: el patrón hermano es `<header>` con `space-y-1`, `h1
 *     text-2xl font-semibold tracking-tight` y bajada `text-sm`.
 * Ahora sigue ese patrón. El carácter propio del Piloto vive DENTRO de la
 * torre (el titular grande, la banda de números), no en el marco.
 *
 * Fail-soft POR WIDGET: cada pieza maneja su propio cargando/error/vacío;
 * un endpoint caído no tumba la pantalla.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { ListChecks } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'

import { useI18n } from '@/lib/i18n'
import { usePilotoInbox } from '@/lib/hooks/piloto/use-piloto-inbox'
import { usePilotoActivity } from '@/lib/hooks/piloto/use-piloto-activity'
import { usePilotoBriefing } from '@/lib/hooks/piloto/use-piloto-briefing'
import { usePilotoAutonomia } from '@/lib/hooks/piloto/use-piloto-autonomia'
import { usePilotoPulso } from '@/lib/hooks/piloto/use-piloto-pulso'
import { PilotoPulso } from '@/components/inmobiliaria/piloto/PilotoPulso'
import { PilotoBandeja } from '@/components/inmobiliaria/piloto/PilotoBandeja'
import { PilotoAutonomia } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { PilotoPreparacion } from '@/components/inmobiliaria/piloto/PilotoPreparacion'
import { PilotoFeed } from '@/components/inmobiliaria/piloto/PilotoFeed'
import {
  PilotoCajon,
  type PilotoApertura,
} from '@/components/inmobiliaria/piloto/PilotoCajon'
import type { PulsoAlerta } from '@/lib/api/piloto'

/** Una decisión «atrasada» lleva más de una semana esperando. */
const SEMANA_MS = 7 * 86_400_000

export default function PilotoPage() {
  const { t } = useI18n()
  const inbox = usePilotoInbox()
  const actividad = usePilotoActivity(50)
  const briefing = usePilotoBriefing()
  const autonomia = usePilotoAutonomia()
  const pulso = usePilotoPulso()

  /**
   * El cajón: una sola pieza para las tres listas. Vive acá arriba —y no
   * dentro de cada lista— porque un ítem de una alerta del tablero abre el
   * detalle de un caso de la bandeja: tres cajones separados no podrían
   * pasarse la posta.
   */
  /**
   * El cajón guarda una PILA, no una sola apertura. Antes, abrir un caso desde
   * una alerta reemplazaba la vista y no había forma de volver: quedabas en el
   * detalle sin saber de dónde veniste (Nico, 2026-08-31). Con la pila, cada
   * salto recuerda su origen y el cajón puede ofrecer «volver».
   */
  const [pila, setPila] = useState<PilotoApertura[]>([])
  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null
  const abrirItem = useCallback(
    (id: string) => setPila((p) => [...p, { tipo: 'item', id }]),
    [],
  )
  /**
   * Una alerta con UN SOLO caso abre ese caso directo.
   *
   * La vista intermedia mostraba el titular, la explicación y una lista de un
   * elemento — todo lo cual el usuario acababa de leer en la fila del pulso —
   * y dejaba media pantalla en blanco. Un clic y una pantalla de por medio
   * para llegar a la información de verdad (Nico, 2026-08-31). Con varios
   * casos la lista sí sirve: hay que elegir cuál.
   */
  const abrirAlerta = useCallback((alerta: PulsoAlerta) => {
    const unico = alerta.items?.length === 1 ? alerta.items[0] : undefined
    setPila((p) => [...p, unico ? { tipo: 'item', id: unico.id } : { tipo: 'alerta', alerta }])
  }, [])
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrarCajon = useCallback(() => setPila([]), [])

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

  // Tras una acción de la bandeja se refresca TAMBIÉN el feed: la acción
  // ejecutada es, precisamente, actividad nueva.
  const refetchTrasAccion = useCallback(async () => {
    // El pulso también: una acción resuelta puede apagar una alerta.
    await Promise.allSettled([inbox.refetch(), actividad.refetch(), pulso.refetch()])
  }, [inbox.refetch, actividad.refetch, pulso.refetch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="piloto-page">
      {/* Encabezado — mismo patrón que el resto del panel (ver cabecera) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.piloto.titulo')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            {t('inmobiliaria.piloto.descripcion')}
          </p>
        </div>
        {/* Configuración, no operación: las dos viven en el encabezado.
            «Procesos» es la ventana por la que se ve trabajar al Piloto
            (process view, 2026-09-02): también va acá, no en el flujo diario. */}
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/piloto/procesos" data-testid="piloto-ver-procesos">
              <ListChecks weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('inmobiliaria.piloto.procesos.titulo')}
            </Link>
          </Button>
          <PilotoPreparacion />
          <PilotoAutonomia autonomia={autonomia} />
        </div>
      </header>

      {/* El tablero vivo: qué pasa ahora y qué puede explotar */}
      <PilotoPulso
        data={pulso.data}
        isLoading={pulso.isLoading}
        error={pulso.error}
        notAvailable={pulso.notAvailable}
        lectura={lecturaDelGerente}
        {...(typeof briefing.data?.numeros?.recuperadoMesCop === 'number'
          ? { recuperadoMesCop: briefing.data.numeros.recuperadoMesCop }
          : {})}
        onAbrirItem={abrirItem}
        onAbrirAlerta={abrirAlerta}
      />

      {/* Decidir (ancho) · lo que pasó (angosto) */}
      <div className="grid items-start gap-5 lg:grid-cols-5">
        {/* `min-w-0`: sin esto el contenido largo empuja el track del grid
            y la página scrollea de lado en móvil (medido: 517 > 500 px). */}
        <div className="min-w-0 lg:col-span-3">
          <PilotoBandeja
            items={inbox.items}
            {...(typeof atrasadas === 'number' ? { atrasadas } : {})}
            isLoading={inbox.isLoading}
            error={inbox.error}
            notAvailable={inbox.notAvailable}
            onRefetch={refetchTrasAccion}
            onAbrir={abrirItem}
          />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <PilotoFeed
            items={actividad.items}
            isLoading={actividad.isLoading}
            error={actividad.error}
            notAvailable={actividad.notAvailable}
            onRefetch={actividad.refetch}
            onAbrir={abrirItem}
          />
        </div>
      </div>

      {/* El cajón: todo el detalle sin salir de la sección */}
      <PilotoCajon
        apertura={apertura}
        onClose={cerrarCajon}
        {...(pila.length > 1 ? { onVolver: volver } : {})}
        onAbrirItem={abrirItem}
        onAccionEjecutada={refetchTrasAccion}
      />
    </div>
  )
}

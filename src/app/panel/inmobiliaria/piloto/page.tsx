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
 * ── Que se entienda qué es (pedido de Nico, 2026-09-30) ──────────────────
 * «Si un usuario llega acá no entiende pero nada de lo que hace esa
 * pantalla». Tres capas, de lo corto a lo completo:
 *   · en el encabezado: qué es el Piloto y qué ves aquí (la bajada), y en qué
 *     modo está y qué significa (`PilotoQueEs`);
 *   · «¿Cómo funciona?» (`ParaEntenderMas`, el patrón del panel): agentes,
 *     modos, bandeja y botones (`PilotoComoFunciona`);
 *   · la primera vez, una presentación de tres pasos (`PilotoNovedad`).
 *
 * Fail-soft POR WIDGET: cada pieza maneja su propio cargando/error/vacío;
 * un endpoint caído no tumba la pantalla.
 *
 * ── El director (fase 1, 28-09-2026) ───────────────────────────────────────
 * Arriba de todo, antes del pulso, la tarjeta del director: el plan del día y
 * sus metas. Es la respuesta a una pregunta anterior a las tres de arriba:
 * «¿qué hay que hacer hoy, y por qué?». Sus órdenes abren el MISMO cajón de
 * la Bandeja (`acc:<accionId>`), con el por qué de la orden como respaldo.
 * Apagado para la inmobiliaria, es una sola línea.
 *
 * ── El centro de mando (Nico, 05-10-2026) ───────────────────────────────────
 * «Hoy la UX del piloto automático no se siente como un verdadero panel de
 * control, sin KPIs, sin información relevante, todo como tirado; quiero que
 * se sienta como Jarvis». Se armaron tres direcciones (`/piloto/propuestas`) y
 * Nico eligió (17:05) la Cabina con el núcleo de la A arriba y la línea del día
 * de la C debajo: `mando/DireccionElegida.tsx`, TAL CUAL.
 *   · Las lecciones de arriba siguen: mismo contenedor y encabezado que las
 *     hermanas (el carácter vive DENTRO, en el núcleo); cada número UNA vez
 *     (el núcleo no repite las severidades ni el avance del plan); el director
 *     sigue hablando primero (su frase es la voz del núcleo, y su lectura
 *     reemplaza la del Gerente: `vozDelDia`).
 *   · Lo que la torre tenía y la Cabina sólo resume no se perdió: la Bandeja
 *     entera, la actividad por día y la tarjeta del director (replanear,
 *     metas, semana) se abren en un cajón desde su tarjeta.
 *   · El MISMO cajón de casos (`PilotoCajon`), con su pila.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { ListChecks } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'

import { useI18n } from '@/lib/i18n'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { usePilotoAutonomia } from '@/lib/hooks/piloto/use-piloto-autonomia'
import { useDirectorHoy, useDirectorMetas } from '@/lib/hooks/piloto/use-piloto-director'
import { PilotoBandeja } from '@/components/inmobiliaria/piloto/PilotoBandeja'
import { PilotoAutonomia } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { PilotoOperaSola } from '@/components/inmobiliaria/piloto/PilotoOperaSola'
import { PilotoFeed } from '@/components/inmobiliaria/piloto/PilotoFeed'
import { PilotoDirectorVista } from '@/components/inmobiliaria/piloto/PilotoDirector'
import type { PorQueDeRespaldo } from '@/components/inmobiliaria/piloto/PilotoDirectorHoy'
import {
  PilotoCajon,
  type PilotoApertura,
} from '@/components/inmobiliaria/piloto/PilotoCajon'
import { PilotoQueEs } from '@/components/inmobiliaria/piloto/PilotoQueEs'
import { PilotoNovedad } from '@/components/inmobiliaria/piloto/PilotoNovedad'
import { PilotoActivacion } from '@/components/inmobiliaria/piloto/PilotoActivacion'
import { DireccionElegida } from '@/components/inmobiliaria/piloto/mando/DireccionElegida'
import { atrasadas as contarAtrasadas } from '@/components/inmobiliaria/piloto/mando/calculos'
import { TEXTOS } from '@/components/inmobiliaria/piloto/mando/textos'
import type { AccionesDelMando } from '@/components/inmobiliaria/piloto/mando/tipos'
import { useDatosReales } from '@/components/inmobiliaria/piloto/mando/use-datos-del-mando'
import { useControlDeAgentes } from '@/components/inmobiliaria/piloto/mando/control-de-agentes'
import type { PulsoAlerta } from '@/lib/api/piloto'

/** Qué cajón de resumen está abierto (la Bandeja, la actividad o el director). */
type Resumen = 'bandeja' | 'actividad' | 'director' | null

function PilotoContent() {
  const { t } = useI18n()
  // Lo mismo que lee la tarjeta del director (`PilotoDirector`): un admin ve sus acciones.
  const isAdmin = usePermissionsContextSafe()?.isAdmin === true
  const autonomia = usePilotoAutonomia()
  // Las lecturas del director se comparten con su tarjeta (en el cajón): un
  // «Volver a planear» o una meta aceptada se ven en el núcleo sin pedir dos veces.
  const directorHoy = useDirectorHoy()
  const directorMetas = useDirectorMetas()
  const datos = useDatosReales({ hoy: directorHoy, metas: directorMetas })

  /**
   * El cajón guarda una PILA, no una sola apertura (Nico, 2026-08-31): cada
   * salto recuerda su origen y el cajón puede ofrecer «volver».
   */
  const [pila, setPila] = useState<PilotoApertura[]>([])
  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null
  const abrirItem = useCallback(
    (id: string, accion?: string) =>
      setPila((p) => [...p, accion ? { tipo: 'item', id, accion } : { tipo: 'item', id }]),
    [],
  )
  /**
   * Una alerta con UN SOLO caso abre ese caso directo (Nico, 2026-08-31): la
   * vista intermedia repetía lo que se acababa de leer. Con varios, la lista.
   */
  const abrirAlerta = useCallback((alerta: PulsoAlerta) => {
    const unico = alerta.items?.length === 1 ? alerta.items[0] : undefined
    setPila((p) => [...p, unico ? { tipo: 'item', id: unico.id } : { tipo: 'alerta', alerta }])
  }, [])
  /** Una orden del director abre la fila de la Bandeja que la espera, con su por qué. */
  const abrirDesdeElDirector = useCallback(
    (accionId: string, porQue: PorQueDeRespaldo) =>
      setPila((p) => [...p, { tipo: 'item', id: `acc:${accionId}`, porQue }]),
    [],
  )
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrarCajon = useCallback(() => setPila([]), [])

  /**
   * Activar, apagar o cambiar el modo de un agente desde su tarjeta (Nico,
   * 05-10 19:30): la MISMA lectura de autonomía y las MISMAS llamadas que la
   * hoja de «Autonomía» del encabezado, con su confirmación de Automático.
   */
  const { control: agentes, dialogo: confirmarAutomatico } = useControlDeAgentes({
    autonomia,
    refrescarFlota: async () => {
      await datos.flota.reintentar?.()
    },
    pilotoActivo: datos.flota.data?.activo !== false,
    isAdmin,
  })

  /** Los cajones de lo que la pantalla resume: la Bandeja, la actividad, el director. */
  const [resumen, setResumen] = useState<Resumen>(null)
  const acciones = useMemo<AccionesDelMando>(
    () => ({
      abrirItem,
      abrirAlerta,
      abrirBandeja: () => setResumen('bandeja'),
      abrirActividad: () => setResumen('actividad'),
      abrirDirector: () => setResumen('director'),
      // La hoja de «Autonomía» es la del encabezado (`PilotoAutonomia`, sin tocarla): se abre su botón.
      abrirAutonomia: () => {
        document.querySelector<HTMLButtonElement>('#piloto-autonomia button')?.click()
      },
      agentes,
    }),
    [abrirItem, abrirAlerta, agentes],
  )

  /**
   * La presentación, vuelta a abrir a mano desde «¿Cómo funciona?» (Nico,
   * 30-09: quien llega no entiende qué es esta pantalla).
   */
  const [novedadForzada, setNovedadForzada] = useState(false)
  const verPresentacion = useCallback(() => setNovedadForzada(true), [])

  const bandeja = datos.bandeja.data
  /**
   * El por qué del caso abierto, por si el detalle del micro no lo trae: el
   * de la orden del director con que se abrió, o el de su fila en la Bandeja.
   */
  const porQueDeRespaldo = useMemo(() => {
    if (apertura?.tipo !== 'item') return null
    if (apertura.porQue) return apertura.porQue
    const fila = bandeja?.items.find((i) => i.id === apertura.id)
    return fila ? { director: fila.director ?? null, motivo: fila.motivo ?? null } : null
  }, [apertura, bandeja])

  /** Cuántas decisiones llevan más de una semana paradas — la urgencia real. */
  const atrasadas = useMemo(() => (bandeja ? contarAtrasadas(bandeja.items, Date.now()) : undefined), [bandeja])

  // Tras una acción se refresca TAMBIÉN la actividad y el pulso: la acción
  // ejecutada es actividad nueva y puede apagar una alerta.
  const refetchTrasAccion = useCallback(async () => {
    await Promise.allSettled([datos.bandeja.reintentar?.(), datos.actividad.reintentar?.(), datos.pulso.reintentar?.()])
  }, [datos.bandeja, datos.actividad, datos.pulso])

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="piloto-page">
      {/* Encabezado — mismo patrón que el resto del panel (ver cabecera) */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.piloto.titulo')}
          </h1>
          {/* Qué es y qué ves aquí, dicho de una vez. Sin `line-clamp`: cortar
              la única explicación de la pantalla es volver a no explicarla. */}
          <p className="max-w-2xl text-sm text-fg-muted">
            {t('inmobiliaria.piloto.descripcion')}
          </p>
          <div className="pt-1">
            <PilotoQueEs onVerPresentacion={verPresentacion} />
          </div>
        </div>
        {/* Configuración, no operación: las dos viven en el encabezado.
            «Procesos» es la ventana por la que se ve trabajar al Piloto
            (process view, 2026-09-02): también va acá, no en el flujo diario.
            «Preparación» (T-0051) se sacó del render — hidden temporarily
            as a product decision, not deleted; ver PilotoPreparacion.tsx.
            «¿Opera sola?» (24-09-2026) mide TODA la inmobiliaria (no sólo a
            Laura) y trae los topes y la gracia: va primero porque es la
            pregunta que Nico le hace al Piloto. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PilotoOperaSola />
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/piloto/procesos" data-testid="piloto-ver-procesos">
              <ListChecks weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('inmobiliaria.piloto.procesos.titulo')}
            </Link>
          </Button>
          {/* `#piloto-autonomia`: el orbe del núcleo abre esta misma hoja con su botón «Autonomía». */}
          <div id="piloto-autonomia" className="contents">
            <PilotoAutonomia autonomia={autonomia} />
          </div>
        </div>
      </header>

      {/* El centro de mando (Nico, 05-10): el núcleo, la línea del día y la
          Cabina. PI-01 (04-10-2026): la activación del Piloto de ESTA
          inmobiliaria (la prueba de 30 días, prenderlo y lo que le falta a la
          operación) va al final; el núcleo apagado la invita con un enlace. */}
      <DireccionElegida datos={datos} acciones={acciones} activacion={<PilotoActivacion />} />

      {/* La Bandeja entera: filtros, paginación y acciones, la de siempre. */}
      <Cajon abierto={resumen === 'bandeja'} onOpenChange={(o) => !o && setResumen(null)} tamano="lg" data-testid="piloto-cajon-bandeja">
        <CajonCabecera titulo={TEXTOS.cajones.bandeja.titulo} descripcion={TEXTOS.cajones.bandeja.bajada} />
        <CajonCuerpo>
          <PilotoBandeja
            items={bandeja?.items ?? []}
            total={bandeja?.total ?? 0}
            {...(typeof atrasadas === 'number' ? { atrasadas } : {})}
            isLoading={datos.bandeja.isLoading}
            error={datos.bandeja.error}
            notAvailable={datos.bandeja.notAvailable}
            onRefetch={refetchTrasAccion}
            onAbrir={abrirItem}
          />
        </CajonCuerpo>
      </Cajon>

      {/* La actividad completa, por día. */}
      <Cajon abierto={resumen === 'actividad'} onOpenChange={(o) => !o && setResumen(null)} tamano="md" data-testid="piloto-cajon-actividad">
        <CajonCabecera titulo={TEXTOS.cajones.actividad.titulo} descripcion={TEXTOS.cajones.actividad.bajada} />
        <CajonCuerpo>
          <PilotoFeed
            items={datos.actividad.data ?? []}
            isLoading={datos.actividad.isLoading}
            error={datos.actividad.error}
            notAvailable={datos.actividad.notAvailable}
            {...(datos.actividad.reintentar ? { onRefetch: async () => { await datos.actividad.reintentar?.() } } : {})}
            onAbrir={abrirItem}
          />
        </CajonCuerpo>
      </Cajon>

      {/* La tarjeta del director de siempre: el plan, las metas y la semana, con sus acciones. */}
      <Cajon abierto={resumen === 'director'} onOpenChange={(o) => !o && setResumen(null)} tamano="lg" data-testid="piloto-cajon-director">
        <CajonCabecera titulo={TEXTOS.cajones.director.titulo} descripcion={TEXTOS.cajones.director.bajada} />
        <CajonCuerpo>
          <PilotoDirectorVista hoy={directorHoy} metas={directorMetas} isAdmin={isAdmin} onAbrirAccion={abrirDesdeElDirector} />
        </CajonCuerpo>
      </Cajon>

      {/* El cajón: todo el detalle sin salir de la sección */}
      <PilotoCajon
        apertura={apertura}
        onClose={cerrarCajon}
        {...(pila.length > 1 ? { onVolver: volver } : {})}
        onAbrirItem={abrirItem}
        onAccionEjecutada={refetchTrasAccion}
        porQueDeRespaldo={porQueDeRespaldo}
      />

      {/* La presentación: sola la primera vez; a mano desde el cajón */}
      <PilotoNovedad forzada={novedadForzada} onCerrarForzada={() => setNovedadForzada(false)} />

      {/* Pasar un agente a Automático desde su tarjeta: la misma confirmación que en Autonomía. */}
      {confirmarAutomatico}
    </div>
  )
}

/*
 * P1 — `PageGuard` SIN módulo, a propósito. La fila del menú declara
 * `module: null` (layout.tsx: el Piloto es el inicio de TODO miembro y cada
 * widget se defiende solo) y `arquitectura-del-panel.ts` no le asigna módulo.
 * Lo que sí hace el guard: el contenido —y sus consultas— no se monta hasta
 * que los permisos resuelven, igual que en el resto de las páginas del panel,
 * y sin señal no expulsa a nadie.
 */
export default function PilotoPage() {
  return (
    <PageGuard>
      <PilotoContent />
    </PageGuard>
  )
}

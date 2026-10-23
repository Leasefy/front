'use client'

import { useFilasMarcadas } from '@/lib/hooks/use-filas-marcadas'
import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla'
import { PostulacionesMarcadas } from '@/components/inmobiliaria/PostulacionesMarcadas'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ClipboardText,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { StatusBadge, type SemanticTone } from '@leasefy/cadence'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { PageGuard } from '@/components/auth/PageGuard'
// La de `ui` es la que pinta la ilustración 3D (`ilustracion`); la de data-display la ignoraba.
import { EmptyState } from '@/components/ui/empty-state'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { useIsMobile } from '@/hooks/use-mobile'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Table, TableBodyAnimado, TableCell, TableHead, TableHeader, TableRow, TableRowAnimada } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import {
  Avatar,
  CrossFade,
  IconButton,
  Presence,
} from '@leasefy/cadence'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { RecorridoMapa } from '@/components/inmobiliaria/recorrido/RecorridoMapa'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { CandidateDrawer } from '@/components/inmobiliaria/CandidateDrawer'
// MANOS-2 (04-10-2026): la lista corta que armó matching en el Piloto.
import { listasCortasApi, puestosPorPostulacion, type PuestoEnLaListaCorta } from '@/lib/api/listas-cortas.service'
import { MarcaDeListaCorta } from '@/components/inmobiliaria/MarcaDeListaCorta'
import {
  AccionDePostulacion,
  type ActionType,
} from '@/components/inmobiliaria/AccionDePostulacion'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import type { AllCandidatesItem, LandlordApplicationStatus } from '@/lib/api/applications.types'
import { ChipDeLaMarcaDelEstudio } from '@/components/inmobiliaria/MarcaDelEstudio'
import { avisoAlAprobar } from '@/lib/postulaciones/marca-del-estudio'
import { useLocaleDeFechas, useTr } from '@/lib/i18n/use-tr'

// ─── Status display (mirrors propiedades/candidatos pages) ────────────────────

// Revisora r24 (Postulaciones #2): el estado con `StatusBadge` en TINTA —el azul es la acción— y sólo
// con color lo que cambia el trabajo (aprobado, rechazado, pide información).
const STATUS_CONFIG: Record<
  LandlordApplicationStatus,
  { label: string; tone: SemanticTone }
> = {
  DRAFT:           { label: 'Borrador',          tone: 'neutral' },
  SUBMITTED:       { label: 'Postulado',         tone: 'neutral' },
  UNDER_REVIEW:    { label: 'En revisión',       tone: 'neutral' },
  APPROVED:        { label: 'Aprobado',          tone: 'success' },
  REJECTED:        { label: 'Rechazado',         tone: 'critical' },
  // Revisora r22 (VOZ): sin abreviar.
  NEEDS_INFO:      { label: 'Pide información',  tone: 'warning' },
  WITHDRAWN:       { label: 'Retirado',          tone: 'neutral' },
  CONTRACT_FAILED: { label: 'Contrato fallido',  tone: 'critical' },
  // Aprobar a una persona desplaza a las demás del mismo inmueble a
  // NO_ADJUDICADO (landlord.service.ts). Sin esta fila salían «Desconocido».
  NO_ADJUDICADO:   { label: 'No adjudicado',     tone: 'neutral' },
  PREAPPROVED:     { label: 'Preaprobado',       tone: 'neutral' },
};

const FALLBACK_STATUS: { label: string; tone: SemanticTone } = { label: 'Desconocido', tone: 'neutral' };

const SCORE_COLORS: Record<string, string> = {
  A: 'text-success bg-success-soft',
  B: 'text-fg bg-surface-muted',
  C: 'text-warning bg-warning-soft',
  D: 'text-danger bg-danger-soft',
};

// ─── Los estados por los que se filtra (las pestañas de la tabla) ─────────────

type FilterKey = 'ALL' | 'IN_REVIEW' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'NOT_AWARDED'

/**
 * Nico (22-10-2026, decisión 22): las seis cifras grandes pasan a PESTAÑAS con su conteo, como Propietarios e
 * Inquilinos. Primero lo que espera tu decisión; «Todas» al final y siempre a la vista; una pestaña en 0 no sale.
 */
const FILTERS: {
  key: FilterKey;
  label: string;
  /** El punto ámbar: lo que espera tu decisión. */
  tono?: 'aviso';
  statuses: LandlordApplicationStatus[] | null;
}[] = [
  { key: 'IN_REVIEW',   label: 'En revisión',    tono: 'aviso', statuses: ['SUBMITTED', 'UNDER_REVIEW', 'PREAPPROVED'] },
  { key: 'NEEDS_INFO',  label: 'Pide información', statuses: ['NEEDS_INFO'] },
  { key: 'APPROVED',    label: 'Aprobadas',      statuses: ['APPROVED'] },
  // QA-IA-A (04-10-2026): el no adjudicado NO es un rechazo —el inmueble quedó
  // para otro— y es a quien hay que ofrecerle otras opciones (F-06). Contarlo
  // entre las rechazadas lo escondía; el back ya lo devuelve en la lista.
  { key: 'NOT_AWARDED', label: 'No adjudicadas', statuses: ['NO_ADJUDICADO'] },
  { key: 'REJECTED',    label: 'Rechazadas',     statuses: ['REJECTED', 'WITHDRAWN', 'CONTRACT_FAILED'] },
  { key: 'ALL',         label: 'Todas',          statuses: null },
];



// ─── Page ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string, fechas: 'es-CO' | 'en-US' = 'es-CO'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  // Revisora r22 (#7): la fecha corta, como Contratos: «18 oct 2026».
  return d
    .toLocaleDateString(fechas, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ')
}

function PostulacionesContenido() {
  const tr = useTr();
  const fechas = useLocaleDeFechas();
  const [items, setItems] = useState<AllCandidatesItem[]>([])
  /** La pestaña que la persona eligió; mientras no elija, abre en «En revisión» si hay alguna (Nico, decisión 22). */
  const [filtroElegido, setFilter] = useState<FilterKey | null>(null)
  const [search, setSearch] = useState('')
  // Revisora r22 (Postulaciones #6): la decisión es por inmueble; se puede mirar uno solo.
  const [inmueble, setInmueble] = useState<string>('TODOS')
  /** La persona cuyo cajón está abierto. El detalle vive en esta misma pantalla. */
  const [candidatoAbierto, setCandidatoAbierto] = useState<AllCandidatesItem | null>(null)
  const [accion, setAccion] = useState<{ type: ActionType; candidate: AllCandidatesItem } | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  // El error ENTERO, no su mensaje: el status distingue «no existe» de
  // «no pudimos cargar», y sólo uno de los dos se puede reintentar.
  const [error, setError] = useState<unknown>(null)
  /**
   * ¿Ya se vio la lista alguna vez? Es el `conservarContenido` de
   * `EstadoDeDatos`: la lista se relee sola cada 30 s (`useAutoRefresh`) y una
   * corrida fallida reemplazaba la tabla entera por el cartel de error. Lo que
   * la persona estaba leyendo no dejó de ser cierto porque un refresco tropezó.
   */
  const [cargoAlgunaVez, setCargoAlgunaVez] = useState(false)

  /*
   * Aprobar, rechazar y pedir información escriben sobre la postulación. Un
   * CONTADOR o un VIEWER no tienen `portafolio:edit` (role-defaults.ts), así que
   * no se les dibujan los botones. Mientras los permisos cargan, `canAccess`
   * devuelve false: los botones aparecen cuando se sabe, nunca antes.
   */
  const { canAccess } = usePermissions()
  const puedeDecidir = canAccess('portafolio', 'edit')
  // Acciones masivas (Nico, 10-10-2026).
  const { marcadas, marcar, quitar: quitarLaSeleccion } = useFilasMarcadas()

  /** MANOS-2 (04-10-2026): la lista corta que armó matching, por postulación. */
  const [listaCorta, setListaCorta] = useState<Map<string, PuestoEnLaListaCorta>>(() => new Map())

  const load = useCallback(async () => {
    setError(null)
    // La lista corta es un dato de más: si no responde, la tabla sale igual.
    void listasCortasApi
      .deLaInmobiliaria()
      .then((l) => setListaCorta(puestosPorPostulacion(l)))
      .catch(() => undefined)
    try {
      const res = await landlordApplicationsApi.getAllCandidates()
      setItems(res.candidates)
      setCargoAlgunaVez(true)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useAutoRefresh(load)

  const countFor = useCallback(
    (statuses: LandlordApplicationStatus[] | null) =>
      statuses === null ? items.length : items.filter((c) => statuses.includes(c.status)).length,
    [items],
  )
  const enRevision = countFor(FILTERS[0].statuses)
  const filter: FilterKey = filtroElegido ?? (enRevision > 0 ? 'IN_REVIEW' : 'ALL')

  /**
   * Abre el detalle ACÁ, sin sacar a nadie de la lista.
   *
   * Antes esto empujaba a `/inmuebles/<id>/candidatos?candidato=<id>`: el clic
   * en una postulación cambiaba de sección —el sidebar saltaba a «Inmuebles ·
   * portafolio»—, cargaba la lista de candidatos de esa propiedad y encima de
   * todo eso abría el cajón. Tres pantallas para ver una persona, y volver
   * atrás ya no te devolvía a Postulaciones.
   *
   * El cajón es el mismo componente; lo único que necesitaba era montarse acá.
   */
  const abrirCandidato = useCallback((c: AllCandidatesItem) => {
    setCandidatoAbierto(c)
  }, [])

  /** Ejecuta la acción confirmada y vuelve a leer la lista. */
  const confirmarAccion = useCallback(
    async (texto: string) => {
      if (!accion) return
      const id = accion.candidate.id
      switch (accion.type) {
        case 'approve':
          await landlordApplicationsApi.approve(id, texto ? { message: texto } : {})
          break
        case 'reject':
          await landlordApplicationsApi.reject(id, texto)
          break
        case 'request-info':
          await landlordApplicationsApi.requestInfo(id, texto)
          break
      }
      await load()
    },
    [accion, load],
  )

  const visibleItems = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter)
    let result = activeFilter?.statuses
      ? items.filter((c) => activeFilter.statuses!.includes(c.status))
      : items
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.tenantName.toLowerCase().includes(q) ||
          c.tenantEmail.toLowerCase().includes(q) ||
          c.propertyTitle.toLowerCase().includes(q),
      )
    }
    if (inmueble !== 'TODOS') result = result.filter((c) => c.propertyId === inmueble)
    // Revisora r22 (#6): las de un mismo inmueble, juntas y en el orden de su lista corta (orden estable).
    const puesto = (c: AllCandidatesItem) => listaCorta.get(c.id)?.puesto ?? Number.POSITIVE_INFINITY
    return [...result].sort(
      (a, b) =>
        (a.propertyTitle < b.propertyTitle ? -1 : a.propertyTitle > b.propertyTitle ? 1 : 0) ||
        (a.propertyId < b.propertyId ? -1 : a.propertyId > b.propertyId ? 1 : 0) ||
        puesto(a) - puesto(b),
    )
  }, [items, filter, search, inmueble, listaCorta])

  /** Los inmuebles con postulaciones, con cuántas tiene cada uno (para el filtro). */
  const inmueblesConPostulaciones = useMemo(() => {
    const m = new Map<string, { titulo: string; n: number }>()
    for (const c of items) m.set(c.propertyId, { titulo: c.propertyTitle, n: (m.get(c.propertyId)?.n ?? 0) + 1 })
    return Array.from(m, ([id, v]) => ({ id, ...v })).sort((a, b) => a.titulo.localeCompare(b.titulo))
  }, [items])

  /**
   * Paginado de presentación: `getAllCandidates()` trae todas las postulaciones
   * de la inmobiliaria. `resetKey` con los filtros — sin eso, filtrar estando en
   * la página 3 deja la tabla vacía y se lee como «no hay nada».
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(visibleItems, { resetKey: `${filter}|${search.trim()}|${inmueble}` })

  /**
   * Revisora r24 (Postulaciones #1): en una pestaña que ya filtra por estado, el estado de cada fila repite
   * la pestaña y le quita el lugar a lo que sí distingue a cada uno (la lista corta). Sale en «Todas» y
   * cuando la página mezcla estados (en «En revisión» caen Postulado, En revisión y Preaprobado).
   */
  const mostrarEstado = filter === 'ALL' || new Set(pageItems.map((c) => c.status)).size > 1

  /*
   * El puntaje NO está prendido (Nico, 04-10-2026: «aún ese no lo vamos a
   * prender»). Una columna «Puntaje» llena de rayas promete algo que no
   * existe: sólo sale si alguna postulación de la lista trae puntaje, y la que
   * no lo trae dice «Sin puntaje».
   */
  const hayPuntaje = items.some((c) => Boolean(c.riskScore))
  // Revisora r22 (#7): el estudio es opcional; si NADIE lo tiene, la columna diría «Sin estudio» en todas las
  // filas y se leería como algo que falta. Sale cuando alguna postulación lo trae (o trae otra marca).
  const hayEstudio = items.some((c) => c.marcaDelEstudio !== undefined && c.marcaDelEstudio?.codigo !== 'SIN_ESTUDIO')
  const esCelular = useIsMobile()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Ronda 22: el encabezado de todas las pantallas. */}
      <EncabezadoDePantalla
        seccion={tr('Captación y arriendo')}
        titulo={tr("Postulaciones")}
        descripcion={tr("Revisa a quienes se postularon y decide a quién le arriendas.")}
        // Revisora r23 (Postulaciones #2): el recorrido completo, en la ayuda del encabezado (antes al pie, tras una raya).
        ayuda={
          <ParaEntenderMas
            etiqueta={tr("Cómo funciona el recorrido")}
            titulo={tr("El recorrido completo de una postulación")}
            descripcion={tr("Los primeros seis pasos los hace el inquilino; del séptimo en adelante, tú.")}
            ancho="ancho"
          >
            <RecorridoMapa />
          </ParaEntenderMas>
        }
      />

      {/* El refresco de fondo falló con la lista ya en pantalla: se conserva y se
          dice, en vez de borrarla o de dejarla envejecer en silencio. */}
      <Presence
        show={Boolean(error && cargoAlgunaVez)}
        role="status"
        data-testid="refresco-fallido"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-fg"
      >
          <span>{tr("No pudimos actualizar la lista. Lo que ves es de la última vez que cargó.")}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="font-medium text-primary hover:underline"
          >
            {tr("Reintentar")}
          </button>
      </Presence>

      {/* Esqueleto → fallo → vacío → lista: lo nuevo entra con un fundido. */}
      <CrossFade
        swapKey={isLoading ? 'cargando' : error && !cargoAlgunaVez ? 'fallo' : items.length === 0 ? 'vacio' : 'lista'}
        className="space-y-6"
      >
      {isLoading ? (
        /* Esqueleto con las 5 columnas reales de la tabla, no un spinner: la
           forma de lo que viene ya se conoce, así que la pantalla no tiene que
           saltar cuando lleguen los datos. */
        <EsqueletoTabla columnas={5} filas={6} />
      ) : error && !cargoAlgunaVez ? (
        <FalloDeCarga
          error={error}
          queEs="las postulaciones"
          onReintentar={load}
        />
      ) : items.length === 0 ? (
        /* Sin nada que atender, lo útil no son seis tiles en cero ni una tabla
           vacía con filtros: es explicar qué va a llegar aquí y de dónde viene.
           El mapa vivía en una pantalla aparte llamada «Recorrido» y ese era el
           error — el recorrido no es un destino, es el contexto de ESTA lista.

           Va DENTRO de la misma tarjeta que hospeda la tabla: el contenedor de
           la lista es el que dice que la lista está vacía. Suelto sobre la
           página el mensaje flota y el mapa parece otra sección. */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Sin envoltorio con padding: `EmptyState` ya trae el suyo (py-16) y
              sumarle otro abría un hueco de media pantalla antes del mapa. */}
          <EmptyState
            icon={ClipboardText}
            ilustracion="buzon"
            title={tr("Todavía no te ha llegado ninguna postulación")}
            description={tr("Cuando alguien se postule a uno de tus inmuebles, aparece aquí con su estado y si tiene estudio de arrendamiento.")}
          />
          {/* 🔴 21-09: acá estaba el mapa de ONCE tarjetas, desplegado, ocupando
              la pantalla entera de una lista vacía. Nico: «eso ahí expuesto…
              debería estar en un botón de quiero entender más, y que al clic se
              abra un modal». El vacío dice lo suyo en dos frases; quien quiera
              el recorrido completo lo pide. */}
          <div className="flex justify-center border-t border-border px-6 py-4">
            <ParaEntenderMas
              etiqueta={tr("Cómo funciona una postulación")}
              titulo={tr("El recorrido completo de una postulación")}
              descripcion={tr("Los primeros seis pasos los hace el inquilino; del séptimo en adelante, tú.")}
              ancho="ancho"
            >
              <RecorridoMapa />
            </ParaEntenderMas>
          </div>
        </div>
      ) : (
        <>
          {/* La tabla con sus filtros ADENTRO (Cadence 2): arriba, las pestañas por estado con su conteo
              (Nico, decisión 22); debajo, la búsqueda y el inmueble. */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 empty:hidden">
              <PestanasDeEstado<FilterKey>
                etiqueta={tr('Filtrar por estado')}
                data-testid="estados-de-las-postulaciones"
                valor={filter}
                onCambio={setFilter}
                pestanas={FILTERS.map((f) => {
                  const cuantas = countFor(f.statuses)
                  return {
                    valor: f.key,
                    etiqueta: tr(f.label),
                    cuantos: cuantas,
                    fija: f.key === 'ALL',
                    tono: cuantas > 0 ? f.tono : undefined,
                    testid: `pestana-${f.key.toLowerCase()}`,
                  }
                })}
              />
            </div>
            <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted z-10 pointer-events-none" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr("Interesado, correo o inmueble")}
                  className="pl-9 pr-9"
                />
                {search && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch('')}
                    aria-label={tr("Limpiar búsqueda")}
                    icon={<X className="w-3.5 h-3.5" />}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                  />
                )}
              </div>
              {inmueblesConPostulaciones.length > 1 ? (
                <Select value={inmueble} onValueChange={setInmueble}>
                  <SelectTrigger className="w-full sm:w-72" aria-label={tr('Inmueble')} data-testid="filtro-inmueble">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">{tr('Todos los inmuebles')}</SelectItem>
                    {inmueblesConPostulaciones.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.titulo} · {i.n === 1 ? tr('1 postulación') : tr('{n} postulaciones', { n: i.n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            {visibleItems.length === 0 ? (
              <EmptyState
                icon={ClipboardText}
                title={tr("Sin postulaciones")}
                description={
                  search || filter !== 'ALL' || inmueble !== 'TODOS'
                    ? 'Ninguna postulación coincide con los filtros'
                    : 'Cuando un inquilino se postule a uno de tus inmuebles, aparecerá aquí.'
                }
              />
            ) : esCelular ? (
              /* Ronda 22 (390): una tarjeta por postulación —quién, a qué inmueble y en qué va—; la tabla se
                 corría de lado. La tarjeta abre el mismo cajón que la fila. */
              <ul className="divide-y divide-border" data-testid="postulaciones-en-tarjetas">
                {pageItems.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status] ?? FALLBACK_STATUS
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => abrirCandidato(c)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted/60"
                      >
                        <Avatar name={c.tenantName} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">{c.tenantName}</span>
                          <span className="block truncate text-body-sm text-fg-muted">{c.propertyTitle}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-2">
                            {mostrarEstado ? <StatusBadge tone={statusCfg.tone}>{tr(statusCfg.label)}</StatusBadge> : null}
                            {/* Revisora r23 (Postulaciones #1 y #3): el puesto en la lista corta también a 390; la marca del
                                estudio, con la misma condición que la columna de 1440. */}
                            <MarcaDeListaCorta puesto={listaCorta.get(c.id)} />
                            {hayEstudio ? <ChipDeLaMarcaDelEstudio marca={c.marcaDelEstudio} conEstudio /> : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {puedeDecidir && (
                      <TableHead className="w-10 pl-4 pr-0">
                        <CasillaDeLaPagina ids={pageItems.map((p) => p.id)} marcadas={marcadas} onMarcar={marcar} queSon="postulaciones" />
                      </TableHead>
                    )}
                    <TableHead>{tr("Interesado")}</TableHead>
                    <TableHead>{tr("Inmueble")}</TableHead>
                    {mostrarEstado && <TableHead>{tr("Estado")}</TableHead>}
                    {/* 🔴 El estudio es opcional (Nico, 04-10-2026): quien se
                        postuló sin él (o con el canon por encima de su
                        respaldo) se ve marcado aquí. */}
                    {hayEstudio && <TableHead>{tr("Estudio")}</TableHead>}
                    {hayPuntaje && <TableHead>{tr("Puntaje")}</TableHead>}
                    <TableHead>{tr("Fecha")}</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Filtrar, buscar, paginar o decidir: las filas entran
                    escalonadas y las que sobran salen. */}
                <TableBodyAnimado>
                  {pageItems.map((c) => {
                    const statusCfg = STATUS_CONFIG[c.status] ?? FALLBACK_STATUS
                    return (
                      <TableRowAnimada
                        key={c.id}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        // `?candidato=` abre el cajón de ESA persona al llegar.
                        // Sin el parámetro caías en la lista de la propiedad y
                        // tenías que volver a buscarla: el encabezado promete
                        // "haz clic en una para revisarla" y el clic no revisaba.
                        onClick={() => abrirCandidato(c)}
                        // La fila era un `tr` con onClick: no se podía alcanzar
                        // con teclado ni se anunciaba como accionable.
                        role="button"
                        tabIndex={0}
                        aria-label={`Revisar la postulación de ${c.tenantName}`}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          e.preventDefault()
                          abrirCandidato(c)
                        }}
                      >
                        {puedeDecidir && (
                          <TableCell className="w-10 pl-4 pr-0" onKeyDown={(e) => e.stopPropagation()}>
                            <CasillaDeLaFila id={c.id} nombre={`la postulación de ${c.tenantName}`} marcadas={marcadas} onMarcar={marcar} />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={c.tenantName} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-fg truncate">{c.tenantName}</p>
                              <p className="text-caption text-fg-muted truncate">{c.tenantEmail}</p>
                              <MarcaDeListaCorta puesto={listaCorta.get(c.id)} className="mt-0.5" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-fg">{c.propertyTitle}</TableCell>
                        {mostrarEstado && (
                          <TableCell>
                            <StatusBadge tone={statusCfg.tone}>{tr(statusCfg.label)}</StatusBadge>
                          </TableCell>
                        )}
                        {hayEstudio && (
                          <TableCell>
                            <ChipDeLaMarcaDelEstudio marca={c.marcaDelEstudio} conEstudio />
                          </TableCell>
                        )}
                        {hayPuntaje && (
                          <TableCell>
                            {c.riskScore ? (
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-caption tabular-nums',
                                  SCORE_COLORS[c.riskScore.level] ?? 'text-fg-muted bg-surface-muted',
                                )}
                              >
                                {c.riskScore.totalScore} · {c.riskScore.level}
                              </span>
                            ) : (
                              <span className="text-fg-muted">{tr("Sin puntaje")}</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-fg-muted">{formatDate(c.submittedAt, fechas)}</TableCell>
                      </TableRowAnimada>
                    )
                  })}
                </TableBodyAnimado>
              </Table>
              {puedeDecidir && (
                <PostulacionesMarcadas
                  marcadas={items.filter((p) => marcadas.has(p.id))}
                  onQuitar={quitarLaSeleccion}
                  onCambiaron={() => void load()}
                />
              )}
              </>
            )}

            {/* Pie: sólo si hay más de una página. */}
            {shouldPaginate && (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>

        </>
      )}
      </CrossFade>

      {/* El detalle, en esta misma pantalla. */}
      <CandidateDrawer
        candidate={candidatoAbierto}
        onClose={() => setCandidatoAbierto(null)}
        onAction={(type, candidate) => {
          setCandidatoAbierto(null)
          setAccion({ type, candidate: candidate as AllCandidatesItem })
        }}
        onReevaluated={() => void load()}
        puedeDecidir={puedeDecidir}
      />

      {accion && (
        <AccionDePostulacion
          type={accion.type}
          candidateName={accion.candidate.tenantName || 'Sin nombre registrado'}
          onConfirm={confirmarAccion}
          onClose={() => setAccion(null)}
          aviso={avisoAlAprobar(accion.candidate.marcaDelEstudio)}
        />
      )}
    </div>
  )
}

/**
 * Postulaciones vive dentro de «Comercial», al lado de Inmuebles, y lee los
 * candidatos de los inmuebles de la agencia: el mismo módulo (`portafolio`) que
 * ya guarda la lista de candidatos de un inmueble (`inmuebles/[id]/candidatos`).
 * Antes no tenía guarda: un CONTADOR entraba por la URL y veía Aprobar/Rechazar.
 */
export default function PostulacionesPage() {
  return (
    <PageGuard module="portafolio">
      <PostulacionesContenido />
    </PageGuard>
  )
}

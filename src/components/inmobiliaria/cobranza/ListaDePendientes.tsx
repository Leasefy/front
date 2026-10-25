'use client'

/**
 * ListaDePendientes — lo que espera una decisión, en lista: pestañas por grupo
 * con su conteo, buscador por nombre o motivo y paginación.
 *
 * Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»): era la pantalla
 * `/pagos/cobranza/pendientes`, que repetía el «Te toca a ti» del Resumen con
 * otra forma. Lo que tenía de PROPIO —buscar, filtrar por grupo y paginar— vive
 * ahora dentro del tablero de «Te toca a ti», plegado; la ruta vieja redirige al
 * Resumen (`#te-toca-a-ti`). La cifra con la barra por prioridad NO vino: el
 * tablero ya cuenta por urgencia y el mismo número no se dice dos veces.
 *
 * Recibe `items` y `counts` del MISMO `usePendientes` del tablero: una fuente,
 * una cifra (ver la nota de los siniestros en `CobranzaTeTocaATi`).
 * Mismos data-testid de la pantalla vieja (`pendiente-item-*`,
 * `pendiente-accion-*`, `pendientes-chip-*`, `pendientes-buscar`).
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, MagnifyingGlass } from '@phosphor-icons/react'
import { Stagger, StaggerItem } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { useTr } from '@/lib/i18n/use-tr'
import { formatRelativeTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/data-display/EmptyState'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import type {
  PendienteGrupo,
  PendienteItem,
  PendientePrioridad,
} from '@/lib/hooks/cobranza/use-pendientes'

const NS = 'inmobiliaria.ai.cobranza.pendientes'
const ESTADOS_NS = 'inmobiliaria.ai.cobranza.estados'

const PRIORIDAD_KEY: Record<PendientePrioridad, string> = {
  alta: `${NS}.prioridadAlta`,
  media: `${NS}.prioridadMedia`,
  baja: `${NS}.prioridadBaja`,
}

const GRUPOS: PendienteGrupo[] = [
  'escalaciones',
  'conversaciones',
  'cartas',
  'siniestros',
  'planes',
  'promesas',
]

const GRUPO_KEY: Record<PendienteGrupo, string> = {
  escalaciones: `${NS}.grupoEscalaciones`,
  cartas: `${NS}.grupoCartas`,
  siniestros: `${NS}.grupoSiniestros`,
  planes: `${NS}.grupoPlanes`,
  promesas: `${NS}.grupoPromesas`,
  conversaciones: `${NS}.grupoConversaciones`,
}

/**
 * El botón dice el verbo y el objeto (revisora r25, Pendientes #3), con el
 * nombre de quien se trata cuando lo hay; las escalaciones traen un id
 * enmascarado, no un nombre, y no se lo pegan.
 */
const ACCION_DEL_GRUPO: Record<PendienteGrupo, { conNombre: string; sinNombre: string }> = {
  escalaciones: { conNombre: 'Resolver el caso', sinNombre: 'Resolver el caso' },
  cartas: { conNombre: 'Aprobar la carta de {n}', sinNombre: 'Aprobar la carta' },
  siniestros: { conNombre: 'Aprobar el siniestro de {n}', sinNombre: 'Aprobar el siniestro' },
  planes: { conNombre: 'Revisar el acuerdo de {n}', sinNombre: 'Revisar el acuerdo' },
  promesas: { conNombre: 'Seguir la promesa de {n}', sinNombre: 'Seguir la promesa' },
  conversaciones: { conNombre: 'Responder a {n}', sinNombre: 'Responder la conversación' },
}

const VARIANTE_DE_LA_PRIORIDAD: Record<PendientePrioridad, 'destructive' | 'warning' | 'outline'> = {
  alta: 'destructive',
  media: 'warning',
  baja: 'outline',
}

const KIND_LABELS: Record<string, { es: string; en: string }> = {
  pre_judicial_letter: { es: 'Carta prejurídica', en: 'Pre-judicial letter' },
  pre_bureau_notification: { es: 'Aviso antes del reporte a centrales', en: 'Notice before the credit bureau report' },
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

/** Parse seguro de fechas DATE (YYYY-MM-DD) sin corrimiento de zona horaria. */
function parseLocalDate(dateStr: string): Date {
  return dateStr.length === 10 ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr)
}

function FilaDePendiente({ item }: { item: PendienteItem }) {
  const { t, locale, formatCurrency, formatDate } = useI18n()
  const tr = useTr()
  const isEs = locale.startsWith('es')

  const titulo =
    item.titulo ||
    (item.kind ? (KIND_LABELS[item.kind]?.[isEs ? 'es' : 'en'] ?? item.kind) : '—')

  const motivo = useMemo(() => {
    if (item.reason) return truncate(item.reason, 120)
    switch (item.grupo) {
      case 'cartas':
        return t(`${ESTADOS_NS}.prejuridicoSugerido`)
      case 'siniestros':
        return t(`${NS}.grupoSiniestros`)
      case 'planes':
        return item.montoCop != null
          ? `${t(`${ESTADOS_NS}.pagoEnVerificacion`)} · ${formatCurrency(item.montoCop)}`
          : t(`${ESTADOS_NS}.pagoEnVerificacion`)
      case 'promesas': {
        const parts = [t(`${ESTADOS_NS}.promesaActiva`)]
        if (item.montoCop != null) parts.push(formatCurrency(item.montoCop))
        if (item.dueDate)
          parts.push(formatDate(parseLocalDate(item.dueDate), { day: 'numeric', month: 'short' }))
        return parts.join(' · ')
      }
      default:
        return ''
    }
  }, [item, t, formatCurrency, formatDate])

  const nombre = item.grupo !== 'escalaciones' && item.titulo ? item.titulo : null
  const accion = nombre
    ? tr(ACCION_DEL_GRUPO[item.grupo].conNombre, { n: nombre })
    : tr(ACCION_DEL_GRUPO[item.grupo].sinNombre)

  return (
    <StaggerItem
      as="li"
      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      data-testid={`pendiente-item-${item.key}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={VARIANTE_DE_LA_PRIORIDAD[item.prioridad]}>{t(PRIORIDAD_KEY[item.prioridad])}</Badge>
          <span className="text-caption text-fg-muted">{t(GRUPO_KEY[item.grupo])}</span>
          <span className="inline-flex items-center gap-1 text-caption text-fg-subtle">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatRelativeTime(item.fecha, isEs ? 'es' : 'en')}
          </span>
        </div>
        <p className="text-body-sm font-medium text-fg">{titulo}</p>
        {motivo ? <p className="text-caption leading-relaxed text-fg-muted">{motivo}</p> : null}
      </div>
      {/* En una lista de muchas, cada acción va en secundaria: un solo azul por pantalla. */}
      <Button asChild variant="outline" size="sm" hideArrow className="shrink-0 max-sm:w-full">
        <Link href={item.href} data-testid={`pendiente-accion-${item.key}`}>{accion}</Link>
      </Button>
    </StaggerItem>
  )
}

export interface ListaDePendientesProps {
  items: PendienteItem[]
  counts: Record<PendienteGrupo, number>
}

export function ListaDePendientes({ items, counts }: ListaDePendientesProps) {
  const { t } = useI18n()
  const tr = useTr()
  const [grupoFilter, setGrupoFilter] = useState<PendienteGrupo | null>(null)
  // Si el grupo activo se queda sin ítems tras un refresco, cae a «Todo».
  const effectiveFilter = grupoFilter && counts[grupoFilter] > 0 ? grupoFilter : null

  const [busqueda, setBusqueda] = useState('')
  const visibleItems = useMemo(() => {
    const delGrupo = effectiveFilter ? items.filter((i) => i.grupo === effectiveFilter) : items
    const q = busqueda.trim().toLocaleLowerCase('es')
    if (!q) return delGrupo
    return delGrupo.filter((i) =>
      [i.titulo, i.reason].some((v) => (v ?? '').toLocaleLowerCase('es').includes(q)),
    )
  }, [items, effectiveFilter, busqueda])

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibleItems, { resetKey: `${effectiveFilter ?? 'todos'}|${busqueda}` })

  return (
    <div className="space-y-3" data-testid="pendientes-lista">
      <PestanasDeEstado<string>
        pestanas={[
          { valor: 'todos', etiqueta: tr('Todo'), cuantos: items.length, fija: true },
          ...GRUPOS.map((grupo) => ({
            valor: grupo,
            etiqueta: t(GRUPO_KEY[grupo]),
            cuantos: counts[grupo],
            testid: `pendientes-chip-${grupo}`,
          })),
        ]}
        valor={effectiveFilter ?? 'todos'}
        onCambio={(v) => setGrupoFilter(v === 'todos' ? null : (v as PendienteGrupo))}
        etiqueta={t(`${NS}.pageTitle`)}
      />

      <div className="relative w-full sm:w-72">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={tr('Buscar nombre o motivo')}
          aria-label={tr('Buscar en lo pendiente por nombre o motivo')}
          className="pl-9"
          data-testid="pendientes-buscar"
        />
      </div>

      {visibleItems.length === 0 && busqueda.trim() ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={tr('Nada pendiente coincide con la búsqueda')}
          description={tr('Revisa el nombre o el motivo, o borra la búsqueda.')}
          primaryCta={{ label: tr('Borrar la búsqueda'), onClick: () => setBusqueda('') }}
        />
      ) : (
        <Stagger as="ul" className="divide-y divide-border border-t border-border" aria-label={t(`${NS}.pageTitle`)}>
          {pageItems.map((item) => (
            <FilaDePendiente key={item.key} item={item} />
          ))}
        </Stagger>
      )}

      {shouldPaginate && (
        <div className="border-t border-border pt-3">
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
  )
}

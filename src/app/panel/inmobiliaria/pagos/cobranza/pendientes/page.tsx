'use client'

/**
 * /ai/cobranza/pendientes — "Qué necesita tu atención" (visión #5).
 *
 * UNA lista priorizada (no kanban) que compone 5 fuentes existentes vía
 * usePendientes: escalaciones, cartas prejurídicas, siniestros, acuerdos de
 * pago con pago en verificación y promesas de pago de hoy.
 *
 * Orden: Alta → Media → Baja; dentro de cada prioridad, fecha DESC.
 * Chips de conteo por grupo arriba (click = filtro). Empty state celebratorio.
 *
 * Estilo: brand-pass — MigaDePan + cards rounded-lg border-border bg-card,
 * pills de prioridad con los tokens semánticos de COLOR_SYSTEM.md
 * (rose=alta, amber=media, emerald=baja — mismos de EscalationCard).
 */

import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { formatRelativeTime } from '@/lib/format'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  MagnifyingGlass,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Badge, Button } from '@/components/ui'
import { useTr } from '@/lib/i18n/use-tr'
import { Card, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { Input } from '@/components/ui/input'
import {
  usePendientes,
  type PendienteCta,
  type PendienteGrupo,
  type PendienteItem,
  type PendientePrioridad,
} from '@/lib/hooks/cobranza/use-pendientes'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'

const BASE = '/panel/inmobiliaria/pagos/cobranza'
const NS = 'inmobiliaria.ai.cobranza.pendientes'
const ESTADOS_NS = 'inmobiliaria.ai.cobranza.estados'

// ── Nombre de cada prioridad ─────────────────────────────────────────────────

const PRIORIDAD_TOKEN: Record<PendientePrioridad, { labelKey: string }> = {
  alta: { labelKey: `${NS}.prioridadAlta` },
  media: { labelKey: `${NS}.prioridadMedia` },
  baja: { labelKey: `${NS}.prioridadBaja` },
}

// ── Labels por grupo / CTA (keys del contrato) ───────────────────────────────

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

const CTA_KEY: Record<PendienteCta, string> = {
  resolver: `${NS}.resolver`,
  aprobar: `${NS}.aprobar`,
  revisar: `${NS}.revisar`,
  seguimiento: `${NS}.seguimiento`,
  responder: `${NS}.responder`,
}

/**
 * El botón dice el verbo y el objeto (revisora r25, Pendientes #3): antes cada
 * tarjeta decía «Acción sugerida» y un botón «Aprobar» suelto. Con el nombre de
 * quien se trata cuando lo hay; las escalaciones traen un id enmascarado, no un
 * nombre, y no se lo pegan.
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

// Cartas: label por kind — patrón inline es/en de cartas/page.tsx (KIND_LABELS).
const KIND_LABELS: Record<string, { es: string; en: string }> = {
  pre_judicial_letter: { es: 'Carta prejurídica', en: 'Pre-judicial letter' },
  pre_bureau_notification: { es: 'Aviso antes del reporte a centrales', en: 'Notice before the credit bureau report' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

// C7 (r25): «hace 3 horas», no «hace 3h» (VOZ §4).
function relative(iso: string, locale: string): string {
  return formatRelativeTime(iso, locale.startsWith('en') ? 'en' : 'es')
}

/** Parse seguro de fechas DATE (YYYY-MM-DD) sin corrimiento de zona horaria. */
function parseLocalDate(dateStr: string): Date {
  return dateStr.length === 10 ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr)
}

// ── Card ─────────────────────────────────────────────────────────────────────

function PendienteCard({ item }: { item: PendienteItem }) {
  const { t, locale, formatCurrency, formatDate } = useI18n()
  const isEs = locale.startsWith('es')
  const token = PRIORIDAD_TOKEN[item.prioridad]

  // Título: quién/qué. Cartas no traen deudor en el summary → label del kind.
  const titulo =
    item.titulo ||
    (item.kind ? (KIND_LABELS[item.kind]?.[isEs ? 'es' : 'en'] ?? item.kind) : '—')

  // Motivo: dinámico (escalaciones) o compuesto desde keys existentes + datos reales.
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
          parts.push(
            formatDate(parseLocalDate(item.dueDate), { day: 'numeric', month: 'short' }),
          )
        return parts.join(' · ')
      }
      default:
        return ''
    }
  }, [item, t, formatCurrency, formatDate])

  const tr = useTr()
  const nombre = item.grupo !== 'escalaciones' && item.titulo ? item.titulo : null
  const accion = nombre
    ? tr(ACCION_DEL_GRUPO[item.grupo].conNombre, { n: nombre })
    : tr(ACCION_DEL_GRUPO[item.grupo].sinNombre)

  // Un `StaggerItem`: filtrar por grupo, paginar o resolver un pendiente hace
  // entrar los que llegan (escalonados, techo 320 ms) y salir los que sobran.
  // UI (revisora r25): una fila de la lista DENTRO de la tarjeta (antes tarjetas
  // sueltas en `max-w-3xl`), la prioridad con su insignia y el grupo sin MAYÚSCULAS.
  return (
    <StaggerItem
      as="li"
      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
      data-testid={`pendiente-item-${item.key}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={VARIANTE_DE_LA_PRIORIDAD[item.prioridad]}>{t(token.labelKey)}</Badge>
          <span className="text-caption text-fg-muted">{t(GRUPO_KEY[item.grupo])}</span>
          <span className="inline-flex items-center gap-1 text-caption text-fg-subtle">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {relative(item.fecha, locale)}
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

// ── Página ───────────────────────────────────────────────────────────────────

function PendientesContent() {
  const { t } = useI18n()
  const { items, counts, isLoading, error, refetch } = usePendientes()

  useAutoRefresh(refetch)

  const [grupoFilter, setGrupoFilter] = useState<PendienteGrupo | null>(null)

  // Si el grupo activo se queda sin ítems tras un refetch, cae a "todos".
  const effectiveFilter =
    grupoFilter && counts[grupoFilter] > 0 ? grupoFilter : null

  // Revisora r27 (K3): buscador por nombre o motivo, como las demás tablas.
  const [busqueda, setBusqueda] = useState('')
  const visibleItems = useMemo(() => {
    const delGrupo = effectiveFilter ? items.filter((i) => i.grupo === effectiveFilter) : items
    const q = busqueda.trim().toLocaleLowerCase('es')
    if (!q) return delGrupo
    return delGrupo.filter((i) =>
      [i.titulo, i.reason].some((v) => (v ?? '').toLocaleLowerCase('es').includes(q)),
    )
  }, [items, effectiveFilter, busqueda])

  // La lista compone CINCO fuentes (escalaciones, cartas, siniestros, planes y
  // promesas) sin tope: se pintaba entera. El pie es el mismo de las tablas del
  // panel; el chip de grupo manda a la página 1.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibleItems, { resetKey: `${effectiveFilter ?? 'todos'}|${busqueda}` })

  // ── Primer load ────────────────────────────────────────────────────────────
  // Movimiento: cada salida en un `CrossFade` con su clave (cargando →
  // pendientes, → «todo al día»); lo que ya estaba al montarse no se anima.
  const encabezado = (
    <EncabezadoDePantalla
      seccion="Cobranza"
      titulo={<>{t(`${NS}.pageTitle`)}</>}
      descripcion={<>{t(`${NS}.desc`)}</>}
    />
  )

  if (isLoading && items.length === 0 && !error) {
    return (
      <CrossFade swapKey="cargando">
      {/* C6 (r25): esqueleto con la forma de lo que viene, no una rueda; con
          el encabezado (revisora r25, Pendientes #1). */}
      <div className="p-6 lg:p-8 space-y-6" aria-busy="true">
        {encabezado}
        <EsqueletoTarjetas cantidad={4} />
      </div>
      </CrossFade>
    )
  }

  // ── Empty state celebratorio ───────────────────────────────────────────────
  if (!isLoading && items.length === 0 && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        {encabezado}
        <EmptyState
          icon={CheckCircle}
          title={t(`${NS}.vacio`)}
          description={t(`${NS}.vacioHint`)}
        />
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="pendientes">
    <div className="p-6 lg:p-8 space-y-6">
      {encabezado}

      {/* Error total — solo cuando ninguna fuente rindió datos */}
      {/* C5 (r25): FalloDeCarga con «Intentar de nuevo», nunca el error crudo pegado a la frase. */}
      {error && items.length === 0 ? (
        <FalloDeCarga error={falloDelTexto(error)} queEs="lo pendiente" onReintentar={() => refetch()} />
      ) : null}

      {/* C3 (r25): LA RESPUESTA, las pestañas y la lista en UNA tarjeta. La
          barra va por PRIORIDAD y las pestañas por GRUPO: dos cuentas distintas,
          ninguna repite a la otra. */}
      {items.length > 0 && (
        <Card className="overflow-hidden">
          <CifraHeroe
            className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
            data-testid="pendientes-cuantos"
            tamano="mediana"
            rotulo="Te esperan"
            cifra={items.length.toLocaleString('es-CO')}
            contexto={items.length === 1 ? 'decisión' : 'decisiones'}
            total={items.length}
            tramos={(['alta', 'media', 'baja'] as const).map((pr) => {
              const n = items.filter((i) => i.prioridad === pr).length
              return {
                clave: pr,
                etiqueta: t(PRIORIDAD_TOKEN[pr].labelKey),
                monto: n,
                tono: pr === 'alta' ? ('critico' as const) : pr === 'media' ? ('aviso' as const) : ('neutro' as const),
                cifra: n.toLocaleString('es-CO'),
              }
            })}
          />

          {/* Los grupos, con su conteo: filtran la lista */}
          <div className="border-b border-border px-4 py-3">
            <PestanasDeEstado<string>
              pestanas={[
                { valor: 'todos', etiqueta: 'Todo', cuantos: items.length, fija: true },
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
          </div>

          <div className="border-b border-border px-4 py-3">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <Input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre o motivo"
                aria-label="Buscar en lo pendiente por nombre o motivo"
                className="pl-9"
                data-testid="pendientes-buscar"
              />
            </div>
          </div>

          {/* Lista priorizada — Alta → Media → Baja, fecha DESC dentro */}
          {visibleItems.length === 0 && busqueda.trim() ? (
            <EmptyState
              icon={MagnifyingGlass}
              title="Nada pendiente coincide con la búsqueda"
              description="Revisa el nombre o el motivo, o borra la búsqueda."
              primaryCta={{ label: 'Borrar la búsqueda', onClick: () => setBusqueda('') }}
            />
          ) : (
            <Stagger as="ul" className="divide-y divide-border" aria-label={t(`${NS}.pageTitle`)}>
              {pageItems.map((item) => (
                <PendienteCard key={item.key} item={item} />
              ))}
            </Stagger>
          )}

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
        </Card>
      )}
    </div>
    </CrossFade>
  )
}

export default function PendientesPage() {
  return (
    <PageGuard module="cobranza">
      <PendientesContent />
    </PageGuard>
  )
}

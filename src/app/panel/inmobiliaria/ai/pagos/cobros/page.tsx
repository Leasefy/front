'use client'

/**
 * /ai/pagos/cobros — "Cobros a inquilinos" (visión §2A, §4, §6).
 *
 * La bandeja / ciclo de vida de los cobros a inquilinos: canon, administración,
 * servicios, estudios, penalidades, saldos, acuerdos, parciales y depósitos.
 *
 * T-323 / contrato de UI: NO existe (todavía) un endpoint dedicado de
 * "listado-de-cobros-del-agente", así que esta superficie NO inventa datos:
 *   1. Filtros por ESTADO (los 13 de src/lib/pagos/estados.ts) con
 *      <SegmentedControl> (familia de tono) + <Chip> (estado puntual).
 *   2. Un <EmptyState> honesto explicando que la bandeja del agente llega
 *      después, con cross-link a la tabla profunda real.
 *   3. Un card que CROSS-LINKEA a /panel/inmobiliaria/cobros (la tabla real
 *      de cobros — NO se duplica acá).
 *   4. Una "tarjeta de cobro" de ejemplo (<TarjetaCobro>) que muestra la
 *      anatomía del punto 4 (contrato/inquilino, conceptos, total, fecha
 *      límite, estado, canal, última actividad, siguiente acción) + la barra
 *      de acciones, todas como placeholders "Próximamente" (sin endpoint).
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CurrencyDollar, Receipt, Table, ArrowSquareOut } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card } from '@/components/ui'
import { SegmentedControl, Chip } from '@leasefy/ui'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { TarjetaCobro, type CobroEjemplo } from '@/components/inmobiliaria/pagos/TarjetaCobro'
import { estadoPagoLabel, type PagoEstado } from '@/lib/pagos/estados'
import { useI18n } from '@/lib/i18n'

// ── Familias de tono (excluyentes) → estados que agrupan ──────────────────────
// Espeja las 5 familias de src/lib/pagos/estados.ts, colapsadas a 4 segmentos
// de filtro de alto nivel (neutral + primary = "En curso"; warning = "Atención";
// success = "Cerrados"; danger = "En cobranza").

type Familia = 'todos' | 'en_curso' | 'atencion' | 'cerrados' | 'cobranza'

const FAMILIA_OPTIONS: { value: Familia; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'atencion', label: 'Atención' },
  { value: 'cerrados', label: 'Cerrados' },
  { value: 'cobranza', label: 'En cobranza' },
]

const FAMILIA_ESTADOS: Record<Exclude<Familia, 'todos'>, PagoEstado[]> = {
  en_curso: ['programado', 'listo_para_enviar', 'enviado', 'visto', 'en_proceso', 'en_conciliacion'],
  atencion: ['intento_fallido', 'pago_parcial', 'vencido'],
  cerrados: ['pagado', 'conciliado'],
  cobranza: ['en_cobranza'],
}

const ESTADOS_ORDENADOS: PagoEstado[] = [
  'programado',
  'listo_para_enviar',
  'enviado',
  'visto',
  'en_proceso',
  'intento_fallido',
  'pago_parcial',
  'vencido',
  'pagado',
  'en_conciliacion',
  'conciliado',
  'en_cobranza',
  'cancelado',
]

// ── Cobro de ejemplo (preview, NO dato real) ──────────────────────────────────

const COBRO_EJEMPLO: CobroEjemplo = {
  contrato: 'Contrato CTR-1042',
  inquilino: 'María Restrepo',
  inmueble: 'Apto 502 · Calle 90 #15-30',
  conceptos: [
    { label: 'Canon', monto: '$ 1.800.000' },
    { label: 'Administración', monto: '$ 280.000' },
    { label: 'Servicios', monto: '$ 70.000' },
  ],
  total: '$ 2.150.000',
  fechaLimite: '5 jul 2026',
  estado: 'vencido',
  canal: 'WhatsApp',
  ultimaActividad: 'Visto hace 2 h',
  siguienteAccion: 'Reenviar recordatorio',
}

// ── Página ─────────────────────────────────────────────────────────────────────

function PagosCobros() {
  const { t } = useI18n()
  const [familia, setFamilia] = useState<Familia>('todos')
  // Multi-select de estados puntuales (se inicializan según la familia activa).
  const [estadosSel, setEstadosSel] = useState<Set<PagoEstado>>(new Set())

  // La familia (segmented) restringe qué chips de estado están "en foco".
  const estadosDeFamilia = useMemo<Set<PagoEstado> | null>(() => {
    if (familia === 'todos') return null
    return new Set(FAMILIA_ESTADOS[familia])
  }, [familia])

  function toggleEstado(estado: PagoEstado) {
    setEstadosSel((prev) => {
      const next = new Set(prev)
      if (next.has(estado)) next.delete(estado)
      else next.add(estado)
      return next
    })
  }

  function limpiarFiltros() {
    setFamilia('todos')
    setEstadosSel(new Set())
  }

  const hayFiltro = familia !== 'todos' || estadosSel.size > 0

  // ¿El ejemplo encaja con el filtro activo? (coherencia visual del preview).
  const ejemploVisible = useMemo(() => {
    if (familia !== 'todos' && !FAMILIA_ESTADOS[familia].includes(COBRO_EJEMPLO.estado)) return false
    if (estadosSel.size > 0 && !estadosSel.has(COBRO_EJEMPLO.estado)) return false
    return true
  }, [familia, estadosSel])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <MigaDePan
            backHref="/panel/inmobiliaria/ai/pagos"
            icon={CurrencyDollar}
            crumbs={[
              { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
              { label: t('inmobiliaria.ai.workspace.agente.pagos'), href: '/panel/inmobiliaria/ai/pagos' },
              { label: 'Cobros a inquilinos' },
            ]}
          />
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Cobros a inquilinos</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            El ciclo de vida de cada cobro a inquilinos: canon, administración, servicios, estudios,
            penalidades, saldos, acuerdos, parciales y depósitos. Filtrá por estado y, para operar
            sobre la cartera, abrí la tabla de cobros.
          </p>
        </div>

        {/* Acción principal del header → tabla profunda real (cross-link). */}
        <div className="shrink-0">
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/cobros">
              <Table className="h-4 w-4" weight="duotone" aria-hidden="true" />
              Abrir tabla de cobros
            </Link>
          </Button>
        </div>
      </header>

      {/* Filtros por estado */}
      <section className="space-y-3" aria-label="Filtros por estado del cobro">
        <SegmentedControl<Familia>
          options={FAMILIA_OPTIONS}
          value={familia}
          onChange={(value) => setFamilia(value)}
          aria-label="Familia de estado del cobro"
        />

        <div className="flex flex-wrap items-center gap-2">
          {ESTADOS_ORDENADOS.map((estado) => {
            const enFoco = !estadosDeFamilia || estadosDeFamilia.has(estado)
            return (
              <Chip
                key={estado}
                selected={estadosSel.has(estado)}
                onClick={() => toggleEstado(estado)}
                className={enFoco ? undefined : 'opacity-40'}
                aria-label={`Filtrar por estado ${estadoPagoLabel(estado)}`}
              >
                {estadoPagoLabel(estado)}
              </Chip>
            )
          })}
          {hayFiltro && (
            <Button variant="link" hideArrow onClick={limpiarFiltros} className="h-7 px-1">
              Limpiar filtros
            </Button>
          )}
        </div>
      </section>

      {/* Estado vacío honesto — no hay endpoint de listado-de-cobros-del-agente. */}
      <Card>
        <div className="px-4 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Bandeja del agente</p>
        </div>
        <EmptyBandeja hayFiltro={hayFiltro} />
      </Card>

      {/* Cross-link a la tabla profunda real (no se duplica la tabla acá). */}
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted">
              <Receipt className="h-5 w-5" weight="duotone" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-fg">Tabla de cobros</h2>
              <p className="text-sm text-fg-muted max-w-xl">
                La operación profunda —facturas, aging, registro de pagos y conciliación— vive en la
                tabla de cobros. Desde ahí gestionás cada cobro de la cartera.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href="/panel/inmobiliaria/cobros">
              Ir a la tabla
              <ArrowSquareOut className="h-4 w-4" weight="duotone" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Anatomía de una tarjeta de cobro (ejemplo / preview del punto 4). */}
      <section className="space-y-3" aria-label="Ejemplo de tarjeta de cobro">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">Así se verá cada cobro</h2>
          <p className="text-sm text-fg-muted max-w-2xl">
            Cuando se conecte la bandeja del agente, cada cobro se mostrará como esta tarjeta —con sus
            conceptos, total, fecha límite, estado, canal, última actividad y la acción siguiente.
          </p>
        </div>

        {ejemploVisible ? (
          <TarjetaCobro cobro={COBRO_EJEMPLO} esEjemplo />
        ) : (
          <Card>
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-medium text-fg">El ejemplo no coincide con el filtro</p>
              <p className="text-sm text-fg-muted max-w-sm">
                El cobro de ejemplo está en estado «{estadoPagoLabel(COBRO_EJEMPLO.estado)}». Ajustá o
                limpiá los filtros para verlo.
              </p>
              <Button variant="link" hideArrow onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}

// ── Estado vacío de la bandeja ───────────────────────────────────────────────

function EmptyBandeja({ hayFiltro }: { hayFiltro: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 pb-12 pt-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
        <CurrencyDollar className="h-6 w-6 text-fg-muted" weight="duotone" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[15px] font-semibold text-fg">
          {hayFiltro ? 'Sin cobros con este filtro' : 'La bandeja del agente llega después'}
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-fg-muted">
          Todavía no hay un listado de cobros gestionados por el agente en esta vista. Mientras tanto,
          la cartera completa —con facturas, aging y registro de pagos— está en la tabla de cobros.
        </p>
      </div>
      <Link
        href="/panel/inmobiliaria/cobros"
        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-fg transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
      >
        Abrir tabla de cobros
        <ArrowSquareOut className="h-4 w-4" weight="duotone" aria-hidden="true" />
      </Link>
    </div>
  )
}

export default function PagosCobrosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCobros />
    </PageGuard>
  )
}

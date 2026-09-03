'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/lote — Conciliación masiva (§14).
 *
 * Vista de lote para alto volumen: el resumen del lote, un banner de marca
 * (ink) que aprueba TODAS las coincidencias de alta confianza de un solo golpe
 * (evita ir uno por uno), pestañas para filtrar por caso, una tabla
 * representativa de movimientos con su match/confianza y acciones de lote
 * (revisar excepciones, descargar, reprocesar, cerrar).
 *
 * Mock data inline — Lote Bancolombia · 16 junio · 120 movimientos.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  CaretRight,
  Sparkle,
  FileArrowDown,
  ArrowsClockwise,
  LockSimple,
} from '@phosphor-icons/react'

import { Button, Card } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BrandContour, Eyebrow, StatusBadge, MonoLabel } from '@leasefy/cadence'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number) => COP.format(n)

function band(c: number) {
  if (c >= 90) return { label: 'Alta', fg: '#22663F', soft: '#E9F3EE', dot: '#2C7A53' }
  if (c >= 70) return { label: 'Media', fg: '#8A5A12', soft: '#FBF3E2', dot: '#B7791F' }
  return { label: 'Baja', fg: '#525B6B', soft: '#F1F3F6', dot: '#9AA3B2' }
}

// ── Resumen del lote (barra apilada) ────────────────────────────────────────
const SEGMENTOS = [
  { key: 'alta', label: 'Alta confianza', count: 93, color: '#2C7A53' },
  { key: 'sugeridos', label: 'Sugeridos', count: 18, color: '#B7791F' },
  { key: 'sin_id', label: 'Sin identificar', count: 7, color: '#9AA3B2' },
  { key: 'duplicados', label: 'Duplicados', count: 2, color: '#C4503B' },
]
const TOTAL = 120

// ── Pestañas de filtro ──────────────────────────────────────────────────────
const TABS = [
  { key: 'todos', label: 'Todos', count: 120 },
  { key: 'alta', label: 'Alta confianza', count: 93 },
  { key: 'sugeridos', label: 'Sugeridos', count: 18 },
  { key: 'sin_id', label: 'Sin identificar', count: 7 },
  { key: 'duplicados', label: 'Duplicados', count: 2 },
]
type TabKey = 'todos' | 'alta' | 'sugeridos' | 'sin_id' | 'duplicados'

// ── Movimientos (muestra representativa) ────────────────────────────────────
type Accion = 'aprobar' | 'revisar' | 'buscar'
interface Mov {
  ref: string
  pagador: string
  valor: number
  match: string | null
  confianza: number | null
  tab: Exclude<TabKey, 'todos'>
  nota?: string
}

const MOVS: Mov[] = [
  { ref: '845921', pagador: 'Juan Pérez', valor: 2_300_000, match: '#4582 · Apto Laureles', confianza: 96, tab: 'alta' },
  { ref: '102934', pagador: 'María López', valor: 1_850_000, match: '#3301 · Apto Belén', confianza: 94, tab: 'alta' },
  { ref: '556210', pagador: 'Carlos Ruiz', valor: 3_100_000, match: '#2890 · Casa Envigado', confianza: 91, tab: 'alta' },
  { ref: '610455', pagador: 'Ana Torres', valor: 2_050_000, match: '#1180 · Apto Sabaneta', confianza: 97, tab: 'alta' },
  { ref: '770012', pagador: 'Juan Pablo Ríos', valor: 2_250_000, match: '#3120 · Apto Belén', confianza: 74, tab: 'sugeridos', nota: 'Nombre similar' },
  { ref: '889341', pagador: 'Andrés Gómez', valor: 1_800_000, match: '#4960 · Apto Laureles', confianza: 72, tab: 'sugeridos', nota: 'Pago parcial — falta $500.000' },
  { ref: '445566', pagador: 'Laura Mesa', valor: 2_012_000, match: '#1180 · Local Centro', confianza: 86, tab: 'sugeridos', nota: 'Diferencia de $12.000' },
  { ref: '334109', pagador: 'Sin referencia', valor: 3_100_000, match: null, confianza: null, tab: 'sin_id', nota: 'Sin contrato relacionado' },
  { ref: '299870', pagador: 'Transferencia 3°', valor: 1_500_000, match: null, confianza: null, tab: 'sin_id', nota: 'Pago de un tercero' },
  { ref: '901222', pagador: 'Juan Pérez', valor: 2_300_000, match: '#4582 · Apto Laureles', confianza: 88, tab: 'duplicados', nota: 'Mismo valor y pagador, fecha cercana' },
]

const ACCION_LABEL: Record<Exclude<TabKey, 'todos'>, string> = {
  alta: 'Conciliar',
  sugeridos: 'Revisar',
  sin_id: 'Buscar',
  duplicados: 'Revisar',
}

export default function ConciliacionLotePage() {
  const [tab, setTab] = React.useState<TabKey>('todos')
  const [aprobadas, setAprobadas] = React.useState(false)
  const [confirmando, setConfirmando] = React.useState(false)

  const visibles = tab === 'todos' ? MOVS : MOVS.filter((m) => m.tab === tab)

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Conciliación IA
          </Link>
          <StatusBadge tone="neutral" dot={false}>Lote abierto</StatusBadge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileArrowDown className="w-4 h-4 text-fg-subtle" weight="bold" />
            <MonoLabel className="tracking-[0.08em]">Lote Bancolombia .360</MonoLabel>
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">16 de junio · 120 movimientos</h1>
          <p className="text-[13px] text-fg-muted">Cargado hoy 8:03 a.m. · valor total {fmt(284_700_000)}</p>
        </div>

        {/* Resumen — barra apilada */}
        <Card className="p-5">
          <Eyebrow>Resumen del lote</Eyebrow>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
            {SEGMENTOS.map((s) => (
              <span key={s.key} className="h-full" style={{ width: `${(s.count / TOTAL) * 100}%`, background: s.color }} />
            ))}
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {SEGMENTOS.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <dt className="text-[12.5px] text-fg-muted">{s.label}</dt>
                <dd className="text-[12.5px] font-medium text-[#14130f] tabular-nums">{s.count}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* ── Banner de aprobación masiva (ink anchor §14) ───────────────── */}
        <section className="relative overflow-hidden rounded-lg px-6 py-5 sm:px-7" style={{ background: INK_GRADIENT, boxShadow: '0 24px 60px -28px rgba(20, 19, 15,0.5)' }}>
          <div className="pointer-events-none absolute -inset-x-2 top-[40%] h-[48%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {aprobadas ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(95,208,138,0.16)' }}>
                    <CheckCircle className="w-6 h-6" weight="fill" style={{ color: '#5FD08A' }} />
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold text-white">93 pagos conciliados</p>
                    <p className="text-[13px] text-white/60 mt-0.5">Cartera actualizada · 93 contratos al día. Quedan 27 movimientos por revisar.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAprobadas(false)}
                  className="shrink-0 text-[13px] font-medium text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Deshacer
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <Sparkle className="w-5 h-5 text-white/80" weight="fill" />
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold text-white">93 coincidencias de confianza alta</p>
                    <p className="text-[13px] text-white/60 mt-0.5">
                      {confirmando
                        ? `Vas a conciliar 93 pagos por ${fmt(221_400_000)}. Se actualizará la cartera.`
                        : `Listas para conciliar de una vez · ${fmt(221_400_000)}. No vuelvas a ir uno por uno.`}
                    </p>
                  </div>
                </div>
                {confirmando ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setAprobadas(true); setConfirmando(false) }}
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-white text-[#14130f] text-sm font-medium hover:bg-white/90 transition-colors"
                    >
                      <Check className="w-4 h-4" weight="bold" />
                      Sí, conciliar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      className="inline-flex items-center justify-center h-11 px-4 rounded-lg border border-white/20 text-white/85 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-white text-[#14130f] text-sm font-medium hover:bg-white/90 transition-colors"
                  >
                    <Check className="w-4 h-4" weight="bold" />
                    Aprobar las 93
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Tabla con pestañas ─────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          {/* Tabs */}
          <TabsList variant="underline" aria-label="Filtrar movimientos del lote" className="px-3 pt-2">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="group gap-1.5 whitespace-nowrap"
              >
                {t.label}
                <span className="font-mono text-[10.5px] tabular-nums text-fg-subtle group-data-[state=active]:text-fg-muted">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-0">
          {/* Column header */}
          <div className="hidden sm:grid grid-cols-[96px_1fr_130px_1fr_96px_110px] gap-3 px-5 py-2 border-b border-border-faint bg-surface-muted/60">
            {['Referencia', 'Pagador', 'Valor', 'Coincidencia', 'Confianza', ''].map((h, i) => (
              <MonoLabel key={i} className="text-[10px] tracking-[0.08em]">{h}</MonoLabel>
            ))}
          </div>

          {/* Rows */}
          <ul className="divide-y divide-border-faint">
            {visibles.map((m) => {
              const conciliadoAuto = aprobadas && m.tab === 'alta'
              const cb = m.confianza != null ? band(m.confianza) : null
              return (
                <li key={m.ref} className="grid grid-cols-2 sm:grid-cols-[96px_1fr_130px_1fr_96px_110px] gap-2 sm:gap-3 sm:items-center px-5 py-3">
                  <span className="font-mono text-[12px] text-fg-muted">{m.ref}</span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-[#14130f] truncate">{m.pagador}</span>
                    {m.nota && <span className="block text-[11.5px] text-fg-subtle truncate">{m.nota}</span>}
                  </span>
                  <span className="text-[13.5px] font-medium text-[#14130f] tabular-nums">{fmt(m.valor)}</span>
                  <span className="text-[12.5px] text-fg-muted truncate">
                    {m.match ?? <span className="text-fg-subtle">Sin coincidencia</span>}
                  </span>
                  <span>
                    {cb ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums" style={{ color: cb.fg }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cb.dot }} />
                        {m.confianza}%
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-fg-subtle">—</span>
                    )}
                  </span>
                  <span className="justify-self-start sm:justify-self-end">
                    {conciliadoAuto ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: '#22663F' }}>
                        <CheckCircle className="w-4 h-4" weight="fill" />
                        Conciliado
                      </span>
                    ) : (
                      <Link
                        href="/panel/inmobiliaria/conciliacion-ia/excepcion"
                        className="group inline-flex items-center gap-1 text-[12.5px] font-medium"
                        style={{ color: BLUE }}
                      >
                        {ACCION_LABEL[m.tab]}
                        <CaretRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
                      </Link>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="px-5 py-3 text-[11.5px] text-fg-subtle border-t border-border-faint">
            Vista previa — muestra representativa del lote de {TOTAL} movimientos.
          </p>
          </TabsContent>
          </Tabs>
        </Card>

        {/* ── Acciones del lote ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" hideArrow onClick={() => setTab('sugeridos')}>
            Revisar solo excepciones
          </Button>
          <Button variant="outline" hideArrow>
            <FileArrowDown className="w-4 h-4 text-fg-muted" weight="bold" />
            Descargar reporte
          </Button>
          <Button variant="outline" hideArrow>
            <ArrowsClockwise className="w-4 h-4 text-fg-muted" weight="bold" />
            Reprocesar con reglas
          </Button>
          <Button variant="outline" hideArrow className="ml-auto">
            <LockSimple className="w-4 h-4 text-fg-muted" weight="bold" />
            Cerrar lote
          </Button>
        </div>
      </div>
    </div>
  )
}

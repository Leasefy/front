'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/procesar — Procesamiento (§6) + flujo
 * conectado de subagentes (§19).
 *
 * El momento de "conciliando": Gabriela coordina y el trabajo fluye en cadena
 * de un especialista al siguiente (Laura → Nicolás → Valentina → Samuel → Sofía
 * → Gabriela). Cada subagente muestra su trabajo y el resultado que entrega al
 * siguiente.
 *
 * Anatomy (BRAND-CONTRACT, consistent with avaluos-ia/nuevo):
 *   1. Hero (ink anchor) — Gabriela conciliando + progreso.
 *   2. Pipeline de subagentes (§19) — la cadena de trabajo en orden.
 *   3. CTA — ver resultado del día.
 *
 * Mock data inline — renders standalone for review.
 */

import Link from 'next/link'
import {
  ArrowLeft,
  Sparkle,
  CheckCircle,
} from '@phosphor-icons/react'

import { Button, Card, Spinner } from '@/components/ui'
import { BrandContour, Eyebrow, StatusBadge } from '@leasefy/cadence'

// ── Brand constants ───────────────────────────────────────────────────────────
const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'

// Estado semántico desaturado (§2).
const SUCCESS = '#2C7A53'

// ── Pipeline de subagentes (§19) ────────────────────────────────────────────
type Estado = 'completado' | 'en-curso' | 'pendiente' | 'activo'

interface Subagente {
  inicial: string
  nombre: string
  trabajo: string
  estado: Estado
  resultado: string
  lead?: boolean
}

// Orden = la cadena de trabajo: Laura → Nicolás → Valentina → Samuel → Sofía → Gabriela.
const PIPELINE: Subagente[] = [
  { inicial: 'L', nombre: 'Laura', trabajo: 'Lectura de movimientos', estado: 'completado', resultado: '120 movimientos leídos' },
  { inicial: 'N', nombre: 'Nicolás', trabajo: 'Búsqueda de coincidencias', estado: 'completado', resultado: '93 matches confiables' },
  { inicial: 'V', nombre: 'Valentina', trabajo: 'Resolución de diferencias', estado: 'en-curso', resultado: '11 pagos parciales' },
  { inicial: 'S', nombre: 'Samuel', trabajo: 'Detección de anomalías', estado: 'completado', resultado: '2 duplicados posibles' },
  { inicial: 'S', nombre: 'Sofía', trabajo: 'Reportes y cierre', estado: 'pendiente', resultado: 'Esperando revisión' },
  { inicial: 'G', nombre: 'Gabriela', trabajo: 'Coordinación', estado: 'activo', resultado: '18 casos requieren atención', lead: true },
]

// ── Estado: chip a la derecha de cada fila ─────────────────────────────────────
const ESTADO_META: Record<Estado, { label: string; fg: string; soft: string }> = {
  completado: { label: 'Completado', fg: '#22663F', soft: '#E9F3EE' },
  'en-curso': { label: 'En curso', fg: BLUE, soft: '#EAEEFF' },
  pendiente: { label: 'Pendiente', fg: '#525B6B', soft: '#F1F3F6' },
  activo: { label: 'Activo', fg: BLUE, soft: '#EAEEFF' },
}

// ── Status glyph (CheckCircle / spinner / hueco / punto activo) ─────────────────
function StatusGlyph({ estado }: { estado: Estado }) {
  if (estado === 'completado') {
    return <CheckCircle className="w-5 h-5 shrink-0" weight="fill" style={{ color: SUCCESS }} />
  }
  if (estado === 'en-curso') {
    return <Spinner size="default" className="shrink-0" />
  }
  if (estado === 'activo') {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: BLUE }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: BLUE }} />
      </span>
    )
  }
  return <span className="w-5 h-5 shrink-0 rounded-full border-2 border-border" />
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ConciliacionProcesarPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[760px] space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/panel/inmobiliaria/conciliacion-ia"
            className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Conciliación IA
          </Link>
          <StatusBadge tone="neutral" dot={false}>Vista previa</StatusBadge>
        </div>

        {/* ── 1. HERO (ink anchor) ──────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl px-7 py-8 text-center"
          style={{ background: INK_GRADIENT, boxShadow: '0 26px 64px -28px rgba(20, 19, 15,0.55)' }}
        >
          <div className="pointer-events-none absolute -inset-x-2 top-[52%] h-[42%] text-white/[0.10]">
            <BrandContour />
          </div>

          <div className="relative mx-auto flex max-w-[560px] flex-col items-center gap-4">
            {/* Gabriela avatar with ping */}
            <span className="relative inline-flex items-center justify-center">
              <span
                className="absolute inline-flex h-[72px] w-[72px] rounded-2xl opacity-30 animate-ping"
                style={{ background: BLUE }}
              />
              <span
                className="relative inline-flex items-center justify-center rounded-2xl text-2xl font-semibold text-white"
                style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                G
              </span>
            </span>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5" weight="fill" style={{ color: '#8FA3FF' }} />
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/55">
                  Conciliando
                </span>
              </div>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
                Estoy conciliando los movimientos de hoy
              </h1>
              <p className="text-[13.5px] text-white/60">
                120 movimientos · Bancolombia .360 + links de pago · normalmente toma menos de 1 minuto
              </p>
            </div>

            {/* progress */}
            <div className="w-full max-w-sm mt-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: '70%', background: BLUE }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. PIPELINE de subagentes (§19) ───────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="space-y-1.5">
              <Eyebrow>El equipo en acción</Eyebrow>
              <p className="text-[13px] text-fg-muted">
                El trabajo pasa de un especialista al siguiente. Gabriela coordina el cierre.
              </p>
            </div>
            <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-surface-muted text-[13px] font-semibold tabular-nums text-fg-muted">
              {PIPELINE.length}
            </span>
          </div>

          <ul className="divide-y divide-border-faint">
            {PIPELINE.map((s, i) => {
              const meta = ESTADO_META[s.estado]
              return (
                <li key={i} className="flex items-center gap-3 px-5 py-4">
                  {/* Monograma circular — tintado por estado (no azul sólido §2) */}
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-medium shrink-0"
                    style={{ background: meta.soft, color: meta.fg }}
                  >
                    {s.inicial}
                  </span>

                  {/* Nombre · trabajo · resultado */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-[#14130f]">{s.nombre}</span>
                    <span className="block text-[12.5px] text-fg-muted leading-snug">{s.trabajo}</span>
                    <span className="block mt-1 text-[12.5px] font-medium text-[#14130f] tabular-nums truncate">
                      {s.resultado}
                    </span>
                  </span>

                  {/* Estado: chip + glyph */}
                  <span className="flex items-center gap-2.5 shrink-0">
                    <StatusBadge
                      tone={s.estado === 'completado' ? 'success' : s.estado === 'pendiente' ? 'neutral' : 'info'}
                      dot={false}
                      className="text-[9.5px]"
                    >
                      {meta.label}
                    </StatusBadge>
                    <StatusGlyph estado={s.estado} />
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* ── 3. CTA ────────────────────────────────────────────────────── */}
        <Button asChild className="w-full">
          <Link href="/panel/inmobiliaria/conciliacion-ia/resultado">
            Ver resultado del día
          </Link>
        </Button>
      </div>
    </div>
  )
}

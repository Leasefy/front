'use client'

/**
 * /panel/inmobiliaria/conciliacion-ia/reglas — Reglas configurables (§15).
 *
 * Cada inmobiliaria opera distinto: aquí ajusta CÓMO concilia Gabriela —
 * umbral de auto-conciliación, diferencias permitidas, pagos parciales,
 * excedentes, activación de cobranza por saldo, y reglas de seguridad y de
 * coincidencia. Un banner ink resume el efecto sobre la conciliación de hoy.
 *
 * In-page state, mock — renders standalone for review.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ArrowCounterClockwise, Sparkle } from '@phosphor-icons/react'

import { Button, Switch } from '@/components/ui'
import { BrandContour, Eyebrow, NumberStepper } from '@leasefy/cadence'

const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const pct = (v: number) => `${v}%`
const cop = (v: number) => `$${v.toLocaleString('es-CO')}`

const DEFAULTS = {
  autoUmbral: 90,
  diferenciaActiva: true,
  diferenciaMax: 5000,
  parcialUmbral: 50,
  excedenteProxMes: true,
  cobranzaSaldoActiva: true,
  cobranzaSaldo: 50000,
  noTerceros: true,
  disputaRevision: true,
  ignorarNoCartera: true,
  refDocumento: true,
  contratoAntiguo: true,
}
type Rules = typeof DEFAULTS

// ── Toggle (switch) ─────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Switch checked={on} onCheckedChange={onChange} aria-label={label} />
}

// ── Stepper (threshold) ─────────────────────────────────────────────────────
function Stepper({
  value, onChange, step, min, max, format, label,
}: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; format: (v: number) => string; label: string }) {
  return (
    <NumberStepper
      value={value}
      onChange={onChange}
      step={step}
      min={min}
      max={max}
      formatValue={format}
      aria-label={label}
    />
  )
}

// ── Rule row ────────────────────────────────────────────────────────────────
function Row({ title, desc, children, sub }: { title: string; desc: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-[#14130f]">{title}</p>
          <p className="text-[12.5px] text-fg-muted leading-snug mt-0.5">{desc}</p>
        </div>
        <div className="shrink-0 pt-0.5">{children}</div>
      </div>
      {sub && <div className="mt-2.5">{sub}</div>}
    </div>
  )
}

export default function ConciliacionReglasPage() {
  const [r, setR] = React.useState<Rules>(DEFAULTS)
  const [guardado, setGuardado] = React.useState(false)
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => { setR((prev) => ({ ...prev, [k]: v })); setGuardado(false) }

  const dirty = JSON.stringify(r) !== JSON.stringify(DEFAULTS)

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[860px] space-y-6">
        {/* Header */}
        <Link href="/panel/inmobiliaria/conciliacion-ia" className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-[#14130f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Conciliación IA
        </Link>

        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#14130f]">Reglas de conciliación</h1>
          <p className="text-[14px] text-fg-muted">Ajusta cómo concilia Gabriela según cómo opera tu inmobiliaria.</p>
        </div>

        {/* Ink effect banner (anchor) */}
        <section className="relative overflow-hidden rounded-lg px-6 py-5" style={{ background: INK_GRADIENT, boxShadow: '0 24px 60px -28px rgba(20, 19, 15,0.5)' }}>
          <div className="pointer-events-none absolute -inset-x-2 top-[42%] h-[46%] text-white/[0.10]">
            <BrandContour />
          </div>
          <div className="relative flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <Sparkle className="w-[18px] h-[18px] text-white/80" weight="fill" />
            </span>
            <div>
              <p className="text-[14.5px] font-medium text-white">
                Con estas reglas, hoy concilié 93 de 120 pagos sin intervención (77,5%).
              </p>
              <p className="text-[13px] text-white/60 mt-0.5">
                Aplico el umbral de <span className="font-medium text-white/90 tabular-nums">{pct(r.autoUmbral)}</span> de confianza en cada lote. Subirlo concilia menos solo, pero con más certeza.
              </p>
            </div>
          </div>
        </section>

        {/* Conciliación automática */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <Eyebrow>Conciliación automática</Eyebrow>
          <div className="mt-2 divide-y divide-border-faint">
            <Row title="Conciliar automáticamente" desc="Cuando la confianza del match supere el umbral, Gabriela concilia sin pedir revisión.">
              <Stepper value={r.autoUmbral} onChange={(v) => set('autoUmbral', v)} step={5} min={70} max={99} format={pct} label="umbral de auto-conciliación" />
            </Row>
            <Row
              title="Aceptar diferencias menores"
              desc="Concilia aunque el valor difiera un poco del canon (ajustes bancarios)."
              sub={r.diferenciaActiva && (
                <div className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                  Hasta
                  <Stepper value={r.diferenciaMax} onChange={(v) => set('diferenciaMax', v)} step={1000} min={1000} max={50000} format={cop} label="diferencia máxima permitida" />
                </div>
              )}
            >
              <Toggle on={r.diferenciaActiva} onChange={(v) => set('diferenciaActiva', v)} label="Aceptar diferencias menores" />
            </Row>
            <Row title="Detectar pagos parciales" desc="Marca el pago como parcial si cubre más de este porcentaje del canon.">
              <Stepper value={r.parcialUmbral} onChange={(v) => set('parcialUmbral', v)} step={5} min={30} max={90} format={pct} label="umbral de pago parcial" />
            </Row>
          </div>
        </section>

        {/* Excedentes y saldos */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <Eyebrow>Excedentes y saldos</Eyebrow>
          <div className="mt-2 divide-y divide-border-faint">
            <Row title="Aplicar excedentes al mes siguiente" desc="Si el inquilino paga de más, el excedente queda como saldo a favor.">
              <Toggle on={r.excedenteProxMes} onChange={(v) => set('excedenteProxMes', v)} label="Aplicar excedentes al mes siguiente" />
            </Row>
            <Row
              title="Activar cobranza por saldo"
              desc="Cuando queda un saldo pendiente, Valentina activa la cobranza por el monto."
              sub={r.cobranzaSaldoActiva && (
                <div className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                  Si el saldo supera
                  <Stepper value={r.cobranzaSaldo} onChange={(v) => set('cobranzaSaldo', v)} step={10000} min={0} max={500000} format={cop} label="saldo mínimo para activar cobranza" />
                </div>
              )}
            >
              <Toggle on={r.cobranzaSaldoActiva} onChange={(v) => set('cobranzaSaldoActiva', v)} label="Activar cobranza por saldo" />
            </Row>
          </div>
        </section>

        {/* Seguridad */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <Eyebrow>Seguridad</Eyebrow>
          <div className="mt-2 divide-y divide-border-faint">
            <Row title="No conciliar pagos de terceros automáticamente" desc="Si el pagador no es el inquilino, deja el caso en revisión.">
              <Toggle on={r.noTerceros} onChange={(v) => set('noTerceros', v)} label="No conciliar pagos de terceros" />
            </Row>
            <Row title="Enviar a revisión los contratos en disputa" desc="No concilia automáticamente contratos con una disputa abierta.">
              <Toggle on={r.disputaRevision} onChange={(v) => set('disputaRevision', v)} label="Enviar a revisión contratos en disputa" />
            </Row>
            <Row title="Ignorar movimientos ajenos a la cartera" desc="Descarta ingresos que no corresponden a arriendos (no los intenta conciliar).">
              <Toggle on={r.ignorarNoCartera} onChange={(v) => set('ignorarNoCartera', v)} label="Ignorar movimientos ajenos a la cartera" />
            </Row>
          </div>
        </section>

        {/* Coincidencia */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <Eyebrow>Coincidencia</Eyebrow>
          <div className="mt-2 divide-y divide-border-faint">
            <Row title="Asociar la referencia bancaria con el documento del inquilino" desc="Usa el número de referencia como una señal fuerte de coincidencia.">
              <Toggle on={r.refDocumento} onChange={(v) => set('refDocumento', v)} label="Asociar referencia con documento" />
            </Row>
            <Row title="En empates, priorizar el contrato activo más antiguo" desc="Cuando dos contratos coinciden igual, elige el de mayor antigüedad.">
              <Toggle on={r.contratoAntiguo} onChange={(v) => set('contratoAntiguo', v)} label="Priorizar contrato más antiguo" />
            </Row>
          </div>
        </section>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            hideArrow
            onClick={() => { setR(DEFAULTS); setGuardado(false) }}
            disabled={!dirty}
            className="text-fg-muted"
          >
            <ArrowCounterClockwise className="w-4 h-4" weight="bold" />
            Restaurar valores por defecto
          </Button>

          {guardado ? (
            <span className="inline-flex items-center gap-2 h-11 px-5 text-[14px] font-medium" style={{ color: '#22663F' }}>
              <Check className="w-4 h-4" weight="bold" />
              Reglas guardadas
            </span>
          ) : (
            <Button type="button" hideArrow onClick={() => setGuardado(true)}>
              Guardar reglas
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

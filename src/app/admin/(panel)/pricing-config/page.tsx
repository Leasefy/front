'use client'

import { useState } from 'react'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtNumero } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { modeloDeCobro } from '@/lib/admin/textos-del-admin'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { EditarModeloDeCobro } from '@/components/admin/EditarModeloDeCobro'
import { NOMBRE_DEL_MODELO, fraccionAPorcentaje, type ModeloDeCobro } from '@/lib/admin/modelo-de-cobro'
import { Button } from '@/components/ui/button'
import { Alert } from '@leasefy/cadence'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'

import type { PillTone } from '@/lib/admin/types'


// ── Types co-located with the screen (BACK.md §8.20 · FRONT.md §6.31) ─────────

/**
 * One row = one agency with its agency_policies left-joined.
 * All numeric money fields arrive as numeric strings (API returns raw, SPA formats).
 * allowed_payment_plans is a JSONB column — typed as unknown since not rendered.
 */
interface PolicyRow {
  tenant_id: string
  legal_name: string
  /** 'standard' | 'performance' | 'hybrid' | null */
  billing_model: string | null
  success_fee_pct: string | null
  monthly_min: string | null
  per_deudor: string | null
  base_fee: string | null
  hybrid_pct: string | null
  max_discount: string | null
  max_plan_months: number | string | null
  negotiation_max_attempts: number | string | null
  allowed_payment_plans: unknown
  debtors_count: string
  /** SUM(payments.amount) WHERE status='approved' AND paid_at >= NOW()-30d */
  recovered_30d: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(s: string | number | null | undefined): number {
  if (s == null) return 0
  const n = typeof s === 'number' ? s : parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** «8 %» desde la fracción que guarda la política (0,08). */
function pct(fraccion: string | number | null): string {
  return fraccion != null ? `${fraccionAPorcentaje(fraccion).toLocaleString('es-CO')} %` : '—'
}

/** Lo de la cobranza por voz del mes, de `GET /billing` (la fórmula de la factura del micro). */
interface CobroPorVoz {
  modelo: string
  recuperadoEsteMesCop: number
  recuperadoMesPasadoCop: number
  deudoresConLlamada: number
  estimadoCop: number
  enElMinimo: boolean
  minimoCop: number
}

/**
 * El cobro del mes en palabras (20-10-2026). La cifra la calcula el back con
 * la MISMA fórmula de la factura del micro (`agent/src/billing/engine.ts`):
 * antes esta pantalla estimaba con otra (todos los deudores, 30 días
 * corridos) y no coincidía con Ingresos ni con la factura.
 */
function comoSeCobra(p: PolicyRow, v: CobroPorVoz): string {
  if (v.enElMinimo) return `No llega al mínimo: se cobra el mínimo del mes`
  const deudores = `${fmtNumero(v.deudoresConLlamada)} ${v.deudoresConLlamada === 1 ? 'deudor' : 'deudores'} con llamada × ${fmtCOP(num(p.per_deudor))}`
  const base = num(p.base_fee) > 0 ? `${fmtCOP(num(p.base_fee))} + ` : ''
  switch (p.billing_model) {
    case 'standard':
      return `${base}${deudores}`
    case 'hybrid':
      return `${base}${deudores} + ${pct(p.hybrid_pct)} de ${fmtCOP(v.recuperadoEsteMesCop)}`
    default:
      return `${pct(p.success_fee_pct)} de ${fmtCOP(v.recuperadoEsteMesCop)} recuperado`
  }
}

/** La tarifa de su modelo, en palabras (sólo lo que aplica a ese modelo). */
function tarifa(p: PolicyRow): string[] {
  const minimo = p.monthly_min ? `Mínimo ${fmtCOP(num(p.monthly_min))} al mes` : null
  switch (p.billing_model) {
    case 'standard':
      return [
        `${num(p.base_fee) > 0 ? `${fmtCOP(num(p.base_fee))} fijos + ` : ''}${fmtCOP(num(p.per_deudor))} por deudor con llamada`,
        minimo,
      ].filter(Boolean) as string[]
    case 'performance':
      return [`${pct(p.success_fee_pct)} de lo recuperado`, minimo].filter(Boolean) as string[]
    case 'hybrid':
      return [
        `${fmtCOP(num(p.base_fee))} fijos + ${fmtCOP(num(p.per_deudor))} por deudor con llamada + ${pct(p.hybrid_pct)} de lo recuperado`,
        minimo,
      ].filter(Boolean) as string[]
    default:
      return []
  }
}

function modelTone(model: string | null): PillTone {
  if (!model) return 'warn'
  // Un solo azul en la pantalla (el botón principal): los modelos van en tinta.
  return 'neutral'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * /admin/pricing-config — cuánto le cobra Leasefy a cada inmobiliaria por la
 * cobranza por voz (BACK.md §8.20). 19-10-2026 (QA del admin): en español, la
 * tarifa de cada modelo en palabras, el cobro estimado del mes como cifra
 * arriba, y sin desbordar a 1440.
 */
export default function PricingConfigPage() {
  const { data: rows, isLoading, error, refetch } = useApiQuery<PolicyRow[]>(
    (signal) => adminApi('/pricing-config', { signal }),
    [],
  )
  /**
   * 🔴 El modelo de cobro lo cambia SÓLO Leasefy, desde acá (Nico,
   * 04-10-2026); la inmobiliaria lo ve en sólo lectura en Configuración de
   * cobranza y el micro le rechaza el cambio.
   */
  const [editando, setEditando] = useState<PolicyRow | null>(null)

  const ingresos = useApiQuery<{ inmobiliarias: Array<{ tenant_id: string; voz: CobroPorVoz | null }>; totales: { estimadoPorVozCop: number } }>(
    (signal) => adminApi('/billing', { signal }),
    [],
  )
  const vozDe = new Map((ingresos.data?.inmobiliarias ?? []).map((i) => [i.tenant_id, i.voz]))

  const cuantas = (modelo: string | null) => (rows ?? []).filter((r) => (r.billing_model ?? null) === modelo).length
  const estimadoDelMes = ingresos.data?.totales.estimadoPorVozCop
  // Cuánto deja cada modelo este mes (la suma de los estimados de sus inmobiliarias).
  const porModelo = (modelo: ModeloDeCobro) =>
    (rows ?? []).filter((r) => r.billing_model === modelo).reduce((a, r) => a + (vozDe.get(r.tenant_id)?.estimadoCop ?? 0), 0)
  const tramosDelEstimado: TramoDeLaCifra[] = (['performance', 'standard', 'hybrid'] as const).map((m, i) => ({
    clave: m,
    etiqueta: `${NOMBRE_DEL_MODELO[m]} · ${cuantas(m)}`,
    monto: porModelo(m),
    tono: (['exito', 'neutro', 'aviso'] as const)[i],
    cifra: fmtCOP(porModelo(m)),
  }))

  const columns: Column<PolicyRow>[] = [
    {
      header: 'Inmobiliaria',
      className: 'min-w-[220px]',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name,
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-fg">{r.legal_name}</div>
          <div className="text-caption text-fg-subtle">
            {fmtNumero(num(r.debtors_count))} {num(r.debtors_count) === 1 ? 'deudor' : 'deudores'}
          </div>
        </div>
      ),
    },
    {
      header: 'Modelo',
      orden: (r) => r.billing_model,
      texto: (r) =>
        r.billing_model && r.billing_model in NOMBRE_DEL_MODELO
          ? NOMBRE_DEL_MODELO[r.billing_model as ModeloDeCobro]
          : r.billing_model ? modeloDeCobro(r.billing_model) : 'Sin modelo',
      cell: (r) => (
        <Pill tone={modelTone(r.billing_model)}>
          {r.billing_model && r.billing_model in NOMBRE_DEL_MODELO
            ? NOMBRE_DEL_MODELO[r.billing_model as ModeloDeCobro]
            : r.billing_model ? modeloDeCobro(r.billing_model) : 'Sin modelo'}
        </Pill>
      ),
    },
    {
      header: 'Tarifa',
      texto: (r) => tarifa(r).join(' · '),
      cell: (r) => {
        const lineas = tarifa(r)
        return lineas.length ? (
          <div className="text-body-sm">
            <div className="text-fg">{lineas[0]}</div>
            {lineas[1] ? <div className="text-caption text-fg-muted">{lineas[1]}</div> : null}
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">Sin tarifa</span>
        )
      },
    },
    {
      header: 'Lo que Mori negocia',
      texto: (r) => `Descuento hasta ${pct(r.max_discount)} · hasta ${r.max_plan_months ?? '—'} cuotas · ${r.negotiation_max_attempts ?? '—'} intentos`,
      cell: (r) => (
        <div className="text-caption text-fg-muted">
          <div>Descuento hasta {pct(r.max_discount)}</div>
          <div>
            Hasta {r.max_plan_months ?? '—'} cuotas · {r.negotiation_max_attempts ?? '—'} intentos
          </div>
        </div>
      ),
    },
    {
      header: 'Recuperado este mes',
      align: 'right',
      orden: (r) => vozDe.get(r.tenant_id)?.recuperadoEsteMesCop,
      ordenPrimero: 'desc',
      texto: (r) => vozDe.get(r.tenant_id)?.recuperadoEsteMesCop ?? null,
      cell: (r) => {
        const v = vozDe.get(r.tenant_id)
        return v ? (
          <div className="whitespace-nowrap">
            <div className="font-mono tabular-nums text-fg">{fmtCOP(v.recuperadoEsteMesCop)}</div>
            <div className="text-caption text-fg-subtle">Mes pasado {fmtCOP(v.recuperadoMesPasadoCop)}</div>
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">{ingresos.isLoading ? '…' : '—'}</span>
        )
      },
    },
    {
      header: 'Cobro del mes',
      align: 'right',
      orden: (r) => vozDe.get(r.tenant_id)?.estimadoCop,
      ordenPrimero: 'desc',
      texto: (r) => vozDe.get(r.tenant_id)?.estimadoCop ?? null,
      cell: (r) => {
        const v = vozDe.get(r.tenant_id)
        return v && r.billing_model ? (
          <div className="max-w-[220px]">
            <div className="font-mono tabular-nums text-fg">{fmtCOP(v.estimadoCop)}</div>
            <div className="text-caption text-fg-subtle">{comoSeCobra(r, v)}</div>
          </div>
        ) : (
          <span className="text-caption text-fg-subtle">{ingresos.isLoading ? '…' : '—'}</span>
        )
      },
    },
    {
      header: '',
      align: 'right',
      cell: (r) =>
        r.billing_model ? (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            type="button"
            onClick={() => setEditando(r)}
            data-testid={`editar-modelo-${r.tenant_id}`}
          >
            Cambiar
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Precios de la cobranza por voz"
        description="Cuánto le cobra Leasefy a cada inmobiliaria por Mori."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Los precios de la cobranza por voz" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Sólo Leasefy cambia el modelo de cobro; la inmobiliaria lo ve sin poder editarlo. Cada cambio queda registrado con quién, cuándo y de qué a qué.</p>
              <p>El cobro del mes es un estimado con lo de hoy y la misma fórmula de su factura.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (el cobro estimado del mes) partida por modelo; antes, 5 cifras del mismo
          peso que repetían las pestañas. */}
      {rows ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Cobro estimado del mes"
            cifra={estimadoDelMes != null ? fmtCOP(estimadoDelMes) : '—'}
            contexto={`a ${fmtNumero(rows.length)} ${rows.length === 1 ? 'inmobiliaria' : 'inmobiliarias'} en la cobranza por voz`}
            tramos={estimadoDelMes != null ? tramosDelEstimado : []}
            data-testid="precios-estimado"
          />
        </div>
      ) : null}

      {rows && cuantas(null) > 0 ? (
        <Alert variant="warning" title={`${cuantas(null) === 1 ? 'Una inmobiliaria no tiene' : `${cuantas(null)} inmobiliarias no tienen`} modelo de cobro`}>
          Están en la cobranza por voz pero sin tarifa: no se les puede calcular el cobro. Elige «Sin modelo» en la tabla y
          abre cada una para ponerle el suyo.
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.tenant_id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Ninguna inmobiliaria en la cobranza por voz"
        emptyHint="Cuando una se conecte a Mori, su tarifa aparece aquí."
        aria-label="Precios de la cobranza por voz"
        queSon={['inmobiliaria', 'inmobiliarias']}
        buscar="Buscar inmobiliaria"
        segmentos={[
          { valor: 'todas', nombre: 'Todas', cumple: () => true },
          { valor: 'performance', nombre: NOMBRE_DEL_MODELO.performance, cumple: (r) => r.billing_model === 'performance' },
          { valor: 'standard', nombre: NOMBRE_DEL_MODELO.standard, cumple: (r) => r.billing_model === 'standard' },
          { valor: 'hybrid', nombre: NOMBRE_DEL_MODELO.hybrid, cumple: (r) => r.billing_model === 'hybrid' },
          { valor: 'sin', nombre: 'Sin modelo', cumple: (r) => !r.billing_model },
        ]}
        // Ronda 30: también la que no tiene modelo se abre, para ponerle uno (antes la fila no hacía nada).
        onRowClick={(r) => setEditando(r)}
        filaMarcada={(r) => r.tenant_id === editando?.tenant_id}
        exportar="precios-cobranza-por-voz"
      />

      <Cajon abierto={editando !== null} onOpenChange={(abierto) => (abierto ? null : setEditando(null))}>
        <CajonCabecera
          titulo={
            editando
              ? editando.billing_model
                ? `Modelo de cobro de ${editando.legal_name}`
                : `Ponerle modelo de cobro a ${editando.legal_name}`
              : 'Modelo de cobro'
          }
          descripcion="Sólo Leasefy lo cambia; la inmobiliaria lo ve sin poder editarlo. Queda registrado quién lo cambió, cuándo y de qué a qué."
        />
        <CajonCuerpo>
          {editando ? (
            <EditarModeloDeCobro
              key={editando.tenant_id}
              actual={editando}
              onCerrar={() => setEditando(null)}
              onGuardado={() => {
                setEditando(null)
                refetch()
                ingresos.refetch()
              }}
            />
          ) : null}
        </CajonCuerpo>
      </Cajon>
    </div>
  )
}

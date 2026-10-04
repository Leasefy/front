'use client'

import { useState, type FormEvent } from 'react'
import { fmtCOP } from '@/lib/admin/format'
import {
  MODELOS_DE_COBRO,
  NOMBRE_DEL_MODELO,
  cambiarModeloDeCobro,
  fraccionAPorcentaje,
  mensajeDelFalloDelModelo,
  porcentajeAFraccion,
  type CambioDelModeloDeCobro,
  type ModeloDeCobro,
} from '@/lib/admin/modelo-de-cobro'

/** Lo que la tabla ya tiene de la inmobiliaria (`GET /pricing-config`). */
export interface ModeloActual {
  tenant_id: string
  legal_name: string
  billing_model: string | null
  success_fee_pct: string | null
  hybrid_pct: string | null
  monthly_min: string | null
  per_deudor: string | null
  base_fee: string | null
}

const esModelo = (v: string | null): v is ModeloDeCobro =>
  v !== null && (MODELOS_DE_COBRO as readonly string[]).includes(v)

const entero = (v: string | null) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? Math.round(n) : 0
}

/**
 * Cambiar el modelo de cobro de UNA inmobiliaria (04-10-2026, Nico: «sólo
 * Leasefy lo cambia desde /admin»). La inmobiliaria lo ve en sólo lectura en
 * Configuración de cobranza. Mismo patrón que corregir el NIT: revisar →
 * confirmar, y queda registrado quién lo cambió y de qué a qué.
 */
export function EditarModeloDeCobro({
  actual,
  onCerrar,
  onGuardado,
}: {
  actual: ModeloActual
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [modelo, setModelo] = useState<ModeloDeCobro>(
    esModelo(actual.billing_model) ? actual.billing_model : 'performance',
  )
  const [exito, setExito] = useState(fraccionAPorcentaje(actual.success_fee_pct))
  const [mixto, setMixto] = useState(fraccionAPorcentaje(actual.hybrid_pct))
  const [minimo, setMinimo] = useState(entero(actual.monthly_min))
  const [porDeudor, setPorDeudor] = useState(entero(actual.per_deudor))
  const [base, setBase] = useState(entero(actual.base_fee))
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const porcentajeMalo = (p: number) => !Number.isFinite(p) || p < 0 || p > 50
  const pesoMalo = (n: number) => !Number.isInteger(n) || n < 0
  const errorDelFormulario =
    porcentajeMalo(exito) || porcentajeMalo(mixto)
      ? 'Los porcentajes van de 0 % a 50 %.'
      : pesoMalo(minimo) || pesoMalo(porDeudor) || pesoMalo(base)
        ? 'Los valores en pesos van enteros y sin negativos.'
        : null

  /** Sólo viaja lo que cambió. */
  function cambio(): CambioDelModeloDeCobro {
    const c: CambioDelModeloDeCobro = {}
    if (modelo !== actual.billing_model) c.billingModel = modelo
    if (exito !== fraccionAPorcentaje(actual.success_fee_pct)) c.successFeePct = porcentajeAFraccion(exito)
    if (mixto !== fraccionAPorcentaje(actual.hybrid_pct)) c.hybridPct = porcentajeAFraccion(mixto)
    if (minimo !== entero(actual.monthly_min)) c.monthlyMinCop = minimo
    if (porDeudor !== entero(actual.per_deudor)) c.perDeudorCop = porDeudor
    if (base !== entero(actual.base_fee)) c.baseFeeCop = base
    return c
  }
  const hayCambio = Object.keys(cambio()).length > 0

  function revisar(e: FormEvent) {
    e.preventDefault()
    if (errorDelFormulario || !hayCambio) return
    setFallo(null)
    setConfirmando(true)
  }

  async function guardar() {
    setGuardando(true)
    setFallo(null)
    try {
      await cambiarModeloDeCobro(actual.tenant_id, cambio())
      onGuardado()
    } catch (err) {
      setFallo(mensajeDelFalloDelModelo(err))
      setConfirmando(false)
    } finally {
      setGuardando(false)
    }
  }

  const campoPct = (id: string, etiqueta: string, valor: number, poner: (n: number) => void) => (
    <label className="text-xs text-fg-muted flex flex-col gap-1" htmlFor={id}>
      {etiqueta}
      <span className="flex items-center gap-1">
        <input
          id={id}
          className="input w-24 font-mono"
          type="number"
          min={0}
          max={50}
          step={0.01}
          value={valor}
          disabled={confirmando || guardando}
          onChange={(e) => poner(Number(e.target.value))}
        />
        <span>%</span>
      </span>
    </label>
  )
  const campoPesos = (id: string, etiqueta: string, valor: number, poner: (n: number) => void) => (
    <label className="text-xs text-fg-muted flex flex-col gap-1" htmlFor={id}>
      {etiqueta}
      <input
        id={id}
        className="input w-36 font-mono"
        type="number"
        min={0}
        step={1}
        value={valor}
        disabled={confirmando || guardando}
        onChange={(e) => poner(Number(e.target.value))}
      />
    </label>
  )

  return (
    <section className="card p-5 space-y-4 mt-6" aria-labelledby="modelo-titulo" data-testid="editar-modelo-de-cobro">
      <div>
        <div id="modelo-titulo" className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          modelo de cobro · {actual.legal_name}
        </div>
        <p className="text-xs text-fg-muted mt-1">
          Sólo Leasefy lo cambia; la inmobiliaria lo ve en sólo lectura. Queda registrado quién lo cambió,
          cuándo y de qué a qué.
        </p>
      </div>

      <form onSubmit={revisar} noValidate className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-fg-muted flex flex-col gap-1" htmlFor="modelo-billing">
            Modelo
            <select
              id="modelo-billing"
              className="input"
              value={modelo}
              disabled={confirmando || guardando}
              onChange={(e) => setModelo(e.target.value as ModeloDeCobro)}
            >
              {MODELOS_DE_COBRO.map((m) => (
                <option key={m} value={m}>
                  {NOMBRE_DEL_MODELO[m]}
                </option>
              ))}
            </select>
          </label>
          {campoPesos('modelo-minimo', 'Mínimo mensual (COP)', minimo, setMinimo)}
          {modelo === 'performance' && campoPct('modelo-exito', 'Comisión de éxito', exito, setExito)}
          {modelo === 'standard' && campoPesos('modelo-por-deudor', 'Por deudor (COP)', porDeudor, setPorDeudor)}
          {modelo === 'hybrid' && campoPesos('modelo-base', 'Tarifa base (COP)', base, setBase)}
          {modelo === 'hybrid' && campoPct('modelo-mixto', 'Porcentaje del modelo mixto', mixto, setMixto)}
        </div>

        {errorDelFormulario && (
          <p role="alert" className="text-xs text-bad">
            {errorDelFormulario}
          </p>
        )}

        {!confirmando ? (
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={!hayCambio || Boolean(errorDelFormulario)}>
              Revisar el cambio
            </button>
            <button type="button" className="btn" onClick={onCerrar}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="card p-3 border-warn/40">
            <p className="text-sm text-fg mb-2" data-testid="resumen-del-cambio">
              {actual.legal_name} pasa a {NOMBRE_DEL_MODELO[modelo]}
              {modelo === 'performance' && <> con {exito} % de comisión de éxito</>}
              {modelo === 'hybrid' && <> con {fmtCOP(base)} de base y {mixto} %</>}
              {modelo === 'standard' && <> con {fmtCOP(porDeudor)} por deudor</>}
              {' '}y un mínimo de {fmtCOP(minimo)} al mes. Queda registrado con tu correo.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" disabled={guardando} onClick={() => void guardar()}>
                {guardando ? 'Guardando…' : 'Confirmar el cambio'}
              </button>
              <button type="button" className="btn" disabled={guardando} onClick={() => setConfirmando(false)}>
                Volver
              </button>
            </div>
          </div>
        )}

        {fallo && (
          <p role="alert" className="text-sm text-bad">
            {fallo}
          </p>
        )}
      </form>
    </section>
  )
}

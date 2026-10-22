'use client'

/**
 * En qué meses entra un concepto del contrato (reunión con Portofino, 22-10-2026).
 * Nico: «el concepto debería permitir seleccionar para qué mes se lo vamos a
 * cobrar… diferir 2 millones en 5 meses… o pagar en diciembre, febrero y marzo».
 *
 * Se eligen los meses (uno, varios seguidos o sueltos) o se difiere en N meses
 * desde la próxima cuota. El total se reparte en partes iguales y cada mes se
 * puede cambiar; la suma tiene que dar el total. Un mes ya pagado se puede
 * elegir: su valor pasa a la próxima cuota sin pagar (lo dice al lado).
 */

import { useEffect, useMemo, useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui'
import { MoneyInput } from '@/components/ui/money-input'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { AREAS_DE_LA_DEUDA } from '@/lib/plata/con-centavos'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { contractsApi, type ConceptoDelContrato, type MesParaUnConcepto } from '@/lib/api/contracts.service'
import { enPartesIguales, mesCorto, mesEnPalabras, sumaDeLasPartes, sumanElTotal } from '@/lib/contratos/meses-del-concepto'

export interface MesElegido {
  mes: string
  valorCop: number
}

export function MesesDelConcepto({
  contractId,
  paga,
  total,
  conCentavos,
  valor,
  onCambiar,
  error,
}: {
  contractId: string
  paga: ConceptoDelContrato['paga']
  /** El valor total del concepto. */
  total: number
  conCentavos: boolean
  valor: MesElegido[]
  onCambiar: (meses: MesElegido[]) => void
  error?: string | null
}) {
  const [meses, setMeses] = useState<MesParaUnConcepto[] | null>(null)
  const [disponible, setDisponible] = useState(true)
  const [falla, setFalla] = useState<string | null>(null)
  const [cuantos, setCuantos] = useState('')

  useEffect(() => {
    let vigente = true
    setMeses(null)
    contractsApi
      .mesesParaUnConcepto(contractId, paga)
      .then((r) => {
        if (!vigente) return
        setMeses(r.meses)
        setDisponible(r.disponible)
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setMeses([])
        setFalla(mensajeParaLaPersona(e, { porDefecto: 'No pudimos traer los meses del contrato.', accion: 'traer los meses del contrato' }))
      })
    return () => {
      vigente = false
    }
  }, [contractId, paga])

  // Si cambia el total con meses ya elegidos, se vuelve a repartir en partes iguales.
  useEffect(() => {
    if (valor.length > 0) onCambiar(enPartesIguales(total > 0 ? total : 0, valor.map((v) => v.mes), conCentavos))
    // Sólo cuando cambia el total: lo demás lo decide la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const elegidos = useMemo(() => new Set(valor.map((v) => v.mes)), [valor])
  const noSePueden = useMemo(() => new Map((meses ?? []).filter((m) => !m.sePuede).map((m) => [m.mes, m.porQue ?? 'PAGADA'])), [meses])
  /** Repartir el total en partes iguales entre estos meses (en orden). */
  const repartir = (lista: string[]) => onCambiar(enPartesIguales(total > 0 ? total : 0, [...lista].sort(), conCentavos))

  const alternar = (mes: string) =>
    repartir(elegidos.has(mes) ? [...elegidos].filter((m) => m !== mes) : [...elegidos, mes])

  const diferir = () => {
    const n = Math.trunc(Number(cuantos)) // redondeo: no es plata (cuántos meses)
    if (!meses || !(n > 0)) return
    const desde = meses.findIndex((m) => m.sePuede)
    if (desde < 0) return
    repartir(meses.slice(desde, desde + n).map((m) => m.mes))
  }

  const cambiarValor = (mes: string, v: string) =>
    onCambiar(valor.map((p) => (p.mes === mes ? { ...p, valorCop: Number(v) || 0 } : p)))

  if (meses === null) return <div className="h-24 animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
  if (!disponible) {
    return (
      <p role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-caption text-warning">
        Todavía no se pueden elegir los meses: Leasefy tiene pendiente una actualización. Agrégalo como de todos los meses o de una sola vez.
      </p>
    )
  }
  if (falla) return <p className="text-caption text-destructive">{falla}</p>
  if (meses.length === 0) {
    return <p className="text-caption text-muted-foreground">Este contrato todavía no tiene meses para elegir.</p>
  }

  const suma = sumaDeLasPartes(valor)
  const cuadra = valor.length === 0 || sumanElTotal(total, valor)

  return (
    <div className="space-y-3" data-testid="meses-del-concepto">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="diferir-en" className="text-caption text-muted-foreground">
            Diferir en
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="diferir-en"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              className="w-20 text-right tabular-nums"
              value={cuantos}
              onChange={(e) => setCuantos(e.target.value)}
              data-testid="diferir-en"
            />
            <span className="text-caption text-muted-foreground">meses desde la próxima cuota sin pagar</span>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" hideArrow disabled={!(Number(cuantos) > 0)} onClick={diferir} data-testid="diferir">
          Diferir
        </Button>
      </div>

      <div className="space-y-1">
        <p className="text-caption text-muted-foreground">O elige los meses (seguidos o sueltos):</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meses del contrato">
          {meses.map((m) => {
            const activo = elegidos.has(m.mes)
            return (
              <button
                key={m.mes}
                type="button"
                aria-pressed={activo}
                title={m.sePuede ? mesEnPalabras(m.mes) : `${mesEnPalabras(m.mes)}: ${m.porQue === 'VENCIDA' ? 'ya venció' : 'ya está pagado'}; el valor pasa a la próxima cuota sin pagar`}
                onClick={() => alternar(m.mes)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-caption tabular-nums transition-colors',
                  activo ? 'border-primary bg-primary-soft text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                  !m.sePuede && !activo && 'border-dashed',
                )}
                data-testid={`mes-${m.mes}`}
              >
                {mesCorto(m.mes)}
                {!m.sePuede ? <span className="ml-1 text-[10px]">· {m.porQue === 'VENCIDA' ? 'vencido' : 'pagado'}</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      <Presence show={valor.length > 0} direction="down">
        <div className="space-y-2 rounded-md border border-border p-3">
          {valor.map((p) => (
            <div key={p.mes} className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`valor-${p.mes}`} className="min-w-0 text-sm text-foreground">
                {mesEnPalabras(p.mes).replace(/^./, (l) => l.toUpperCase())}
                {noSePueden.has(p.mes) ? (
                  <span className="block text-caption text-warning">
                    {noSePueden.get(p.mes) === 'VENCIDA' ? 'Ya venció' : 'Ya está pagado'}: va en la próxima cuota sin pagar.
                  </span>
                ) : null}
              </label>
              <MoneyInput
                id={`valor-${p.mes}`}
                areas={AREAS_DE_LA_DEUDA}
                className="w-36"
                value={String(p.valorCop)}
                onChange={(v) => cambiarValor(p.mes, v)}
                data-testid={`valor-${p.mes}`}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-caption">
            <span className={cuadra ? 'text-muted-foreground' : 'text-destructive'} data-testid="suma-de-los-meses">
              Suman {formatCurrency(suma)} de {formatCurrency(total)}
              {cuadra ? '' : ': tienen que dar el total.'}
            </span>
            <button type="button" className="text-primary hover:underline" onClick={() => repartir([...elegidos])}>
              Repartir en partes iguales
            </button>
          </div>
        </div>
      </Presence>
      {error ? <p className="text-caption text-destructive">{error}</p> : null}
    </div>
  )
}

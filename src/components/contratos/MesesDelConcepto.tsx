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

import { useEffect, useId, useMemo, useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui'
import { MoneyInput } from '@/components/ui/money-input'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { AREAS_DE_LA_DEUDA } from '@/lib/plata/con-centavos'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { contractsApi, type ConceptoDelContrato, type MesParaUnConcepto } from '@/lib/api/contracts.service'
import {
  calendarioDeMeses,
  enPartesIguales,
  mesEnPalabras,
  nombreCortoDelMes,
  sumaDeLasPartes,
  sumanElTotal,
} from '@/lib/contratos/meses-del-concepto'

export interface MesElegido {
  mes: string
  valorCop: number
}

export function MesesDelConcepto({
  contractId,
  cargar,
  sinMigracion = 'Todavía no se pueden elegir los meses: Leasefy tiene pendiente una actualización. Agrégalo como de todos los meses o de una sola vez.',
  paga,
  total,
  conCentavos,
  valor,
  onCambiar,
  error,
}: {
  /** El contrato de donde salen los meses. Sin él, `cargar` dice de dónde. */
  contractId?: string
  /**
   * Portofino 22-10: otra fuente de los meses (la reparación diferida los pide
   * por la solicitud: el contrato vigente lo resuelve el back).
   */
  cargar?: () => Promise<{ disponible: boolean; meses: MesParaUnConcepto[]; motivo?: string }>
  /** Lo que se dice si el back todavía no tiene dónde guardar los meses. */
  sinMigracion?: string
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
  const [motivoSinMeses, setMotivoSinMeses] = useState<string | null>(null)
  const idDelCampo = useId()

  useEffect(() => {
    let vigente = true
    setMeses(null)
    setMotivoSinMeses(null)
    const pedir = cargar ?? (contractId ? () => contractsApi.mesesParaUnConcepto(contractId, paga) : null)
    if (!pedir) {
      setMeses([])
      return
    }
    pedir()
      .then((r: { disponible: boolean; meses: MesParaUnConcepto[]; motivo?: string }) => {
        if (!vigente) return
        setMeses(r.meses)
        setDisponible(r.disponible)
        setMotivoSinMeses(r.motivo ?? null)
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setMeses([])
        setFalla(mensajeParaLaPersona(e, { porDefecto: 'No pudimos traer los meses del contrato.', accion: 'traer los meses del contrato' }))
      })
    return () => {
      vigente = false
    }
    // `cargar` se pasa en línea: cambia en cada pintada y no debe volver a pedir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, paga])

  // Si cambia el total con meses ya elegidos, se vuelve a repartir en partes iguales.
  useEffect(() => {
    if (valor.length > 0) onCambiar(enPartesIguales(total > 0 ? total : 0, valor.map((v) => v.mes), conCentavos))
    // Sólo cuando cambia el total: lo demás lo decide la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const elegidos = useMemo(() => new Set(valor.map((v) => v.mes)), [valor])
  const porMes = useMemo(() => new Map((meses ?? []).map((m) => [m.mes, m])), [meses])
  const calendario = useMemo(() => calendarioDeMeses((meses ?? []).map((m) => m.mes)), [meses])
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
        {sinMigracion}
      </p>
    )
  }
  if (falla) return <p className="text-caption text-destructive">{falla}</p>
  if (meses.length === 0) {
    return (
      <p className="text-caption text-muted-foreground">{motivoSinMeses ?? 'Este contrato todavía no tiene meses para elegir.'}</p>
    )
  }

  const suma = sumaDeLasPartes(valor)
  const cuadra = valor.length === 0 || sumanElTotal(total, valor)

  return (
    <div className="space-y-3" data-testid="meses-del-concepto">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor={`${idDelCampo}-diferir-en`} className="text-caption text-muted-foreground">
            Diferir en
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={`${idDelCampo}-diferir-en`}
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

      {/* Nico 22-10: «no veo un calendario que deje elegir los meses». Cada año
          con sus 12 meses; los de fuera del contrato quedan en gris. */}
      <div className="space-y-1.5">
        <p className="text-caption text-muted-foreground">O marca en el calendario los meses en que se cobra (seguidos o sueltos):</p>
        <div
          className="space-y-3 rounded-md border border-border p-3"
          role="group"
          aria-label="Calendario de los meses del contrato"
          data-testid="calendario-de-meses"
        >
          {calendario.map(({ anio, meses: delAnio }) => (
            <div key={anio} className="space-y-1.5">
              <p className="text-caption font-medium tabular-nums text-foreground">{anio}</p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {delAnio.map((mes) => {
                  const m = porMes.get(mes)
                  if (!m) {
                    return (
                      <span
                        key={mes}
                        aria-hidden="true"
                        className="flex h-11 items-center justify-center rounded-md text-caption text-muted-foreground/40"
                        data-testid={`fuera-${mes}`}
                      >
                        {nombreCortoDelMes(mes)}
                      </span>
                    )
                  }
                  const activo = elegidos.has(mes)
                  const estado = m.sePuede ? null : m.porQue === 'VENCIDA' ? 'vencido' : 'pagado'
                  return (
                    <button
                      key={mes}
                      type="button"
                      aria-pressed={activo}
                      aria-label={estado ? `${mesEnPalabras(mes)}, ${estado}` : mesEnPalabras(mes)}
                      title={estado ? `${mesEnPalabras(mes)}: ${estado === 'vencido' ? 'ya venció' : 'ya está pagado'}; el valor pasa a la próxima cuota sin pagar` : mesEnPalabras(mes)}
                      onClick={() => alternar(mes)}
                      className={cn(
                        'flex h-11 flex-col items-center justify-center rounded-md border text-caption leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        activo
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary-soft',
                        !m.sePuede && !activo && 'border-dashed text-muted-foreground',
                      )}
                      data-testid={`mes-${mes}`}
                    >
                      <span className="font-medium">{nombreCortoDelMes(mes)}</span>
                      {estado ? <span className="text-[10px] opacity-80">{estado}</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-caption text-muted-foreground">
          En gris, los meses fuera del contrato. Si marcas uno pagado o vencido, su valor va en la próxima cuota sin pagar.
        </p>
      </div>

      <Presence show={valor.length > 0} direction="down">
        <div className="space-y-2 rounded-md border border-border p-3">
          {valor.map((p) => (
            <div key={p.mes} className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`${idDelCampo}-valor-${p.mes}`} className="min-w-0 text-sm text-foreground">
                {mesEnPalabras(p.mes).replace(/^./, (l) => l.toUpperCase())}
                {noSePueden.has(p.mes) ? (
                  <span className="block text-caption text-warning">
                    {noSePueden.get(p.mes) === 'VENCIDA' ? 'Ya venció' : 'Ya está pagado'}: va en la próxima cuota sin pagar.
                  </span>
                ) : null}
              </label>
              <MoneyInput
                id={`${idDelCampo}-valor-${p.mes}`}
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

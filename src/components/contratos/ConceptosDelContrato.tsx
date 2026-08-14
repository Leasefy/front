'use client'

/**
 * Lo que este contrato cobra además del canon.
 *
 * ── Por qué está acá y no sólo en la calculadora ────────────────────────────
 *
 * El catálogo de conceptos y `liquidar()` existían como una pantalla aparte
 * —útil para entender la regla, inútil para operar—. Un contrato real cobra
 * administración de propiedad horizontal, parqueadero o una cuota de
 * reparación, y hasta ahora eso no vivía en ningún lado: se llevaba por fuera,
 * en el sistema del que la inmobiliaria se está migrando.
 *
 * Lo que se agrega acá **entra en el cobro de cada mes** (los recurrentes). Un
 * concepto que se ve y no mueve un peso sería medio campo.
 *
 * ── El impuesto NO se elige ─────────────────────────────────────────────────
 *
 * Se calcula desde quién le paga a quién y el uso del inmueble. En el catálogo
 * viejo había nueve «Canon De Arrendamiento» que se diferenciaban sólo en el
 * combo tributario del nombre: elegir mal entre nueve opciones que se leen
 * igual no da un error, da una factura equivocada.
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, Receipt, Trash, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  contractsApi,
  type ConceptoDelContrato,
} from '@/lib/api/contracts.service'
import { CONCEPTOS } from '@/lib/contratos/conceptos'
import { liquidar, perfilPorDefecto } from '@/lib/contratos/escenarios-tributarios'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { Contract } from '@/lib/types/contract'

interface Props {
  contract: Contract
  puedeEditar: boolean
}

export function ConceptosDelContrato({ contract, puedeEditar }: Props) {
  const [conceptos, setConceptos] = useState<ConceptoDelContrato[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [agregando, setAgregando] = useState(false)

  const [elegido, setElegido] = useState('')
  const [valor, setValor] = useState('')
  const [recurrente, setRecurrente] = useState(true)

  useEffect(() => {
    let vigente = true
    contractsApi
      .conceptos(contract.id)
      .then((c) => {
        if (vigente) setConceptos(c)
      })
      .catch((e: unknown) => {
        // Un fallo NO se pinta como «no cobra nada más»: son cosas distintas.
        if (vigente) {
          setError(e instanceof Error ? e.message : 'No pudimos cargarlos.')
          setConceptos([])
        }
      })
    return () => {
      vigente = false
    }
  }, [contract.id])

  /*
   * El uso del inmueble decide si hay IVA. Si el contrato todavía no lo tiene
   * definido, la liquidación no se puede afirmar — se dice, no se asume
   * vivienda, que es la opción sin IVA y la que haría desaparecer el impuesto
   * en silencio.
   */
  const uso = contract.usoInmueble ?? null

  /*
   * Lo que se le suma al cobro es SÓLO lo que paga el inquilino: 15 de los 66
   * conceptos del catálogo los pone el propietario o la inmobiliaria —el
   * impuesto predial, la comisión del contrato, la póliza del propietario—.
   * Contarlos todos bajo «se suma al cobro cada mes» diría que al inquilino se
   * le cobra la plata de otro.
   */
  const alCobroDelInquilino = useMemo(
    () =>
      (conceptos ?? [])
        .filter((c) => c.recurrente && c.paga === 'INQUILINO')
        .reduce((s, c) => s + c.valorCop, 0),
    [conceptos],
  )
  const deUnaSolaVez = useMemo(
    () =>
      (conceptos ?? [])
        .filter((c) => !c.recurrente)
        .reduce((s, c) => s + c.valorCop, 0),
    [conceptos],
  )
  const noLosPagaElInquilino = useMemo(
    () =>
      (conceptos ?? [])
        .filter((c) => c.recurrente && c.paga !== 'INQUILINO')
        .reduce((s, c) => s + c.valorCop, 0),
    [conceptos],
  )

  async function agregar() {
    const catalogo = CONCEPTOS.find((c) => c.id === elegido)
    if (!catalogo) return
    const n = Number(valor)
    if (!Number.isFinite(n) || n <= 0) {
      setError('El valor tiene que ser mayor que cero.')
      return
    }
    setOcupado(true)
    setError(null)
    try {
      const creado = await contractsApi.agregarConcepto(contract.id, {
        conceptoId: catalogo.id,
        nombre: catalogo.nombre,
        base: catalogo.base,
        paga: catalogo.paga,
        recibe: catalogo.recibe,
        valorCop: Math.round(n),
        recurrente,
      })
      setConceptos((prev) => [...(prev ?? []), creado])
      setElegido('')
      setValor('')
      setAgregando(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar.')
    } finally {
      setOcupado(false)
    }
  }

  async function quitar(id: string) {
    setOcupado(true)
    setError(null)
    try {
      await contractsApi.quitarConcepto(contract.id, id)
      setConceptos((prev) => (prev ?? []).filter((c) => c.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Cobra además del canon
          </h3>
        </div>
        {puedeEditar && !agregando ? (
          <Button variant="ghost" size="sm" hideArrow onClick={() => setAgregando(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Agregar
          </Button>
        ) : null}
      </div>

      {conceptos === null ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : conceptos.length === 0 && !agregando ? (
        <p className="text-sm text-muted-foreground">
          Sólo el canon. Si este contrato cobra administración, parqueadero o
          alguna cuota, agregala acá y entra en el cobro de cada mes.
        </p>
      ) : null}

      {conceptos && conceptos.length > 0 ? (
        <div className="space-y-2">
          {conceptos.map((c) => (
            <ConceptoEnLista
              key={c.id}
              concepto={c}
              uso={uso}
              contract={contract}
              puedeEditar={puedeEditar}
              ocupado={ocupado}
              onQuitar={() => void quitar(c.id)}
            />
          ))}

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">
              Se le cobra al inquilino cada mes
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(alCobroDelInquilino)}
            </span>
          </div>

          {noLosPagaElInquilino > 0 ? (
            // Lo que pone el propietario o la inmobiliaria NO entra en el cobro
            // del inquilino. Sumarlo ahí le cobraría la plata de otro.
            <p className="text-xs text-muted-foreground">
              Otros {formatCurrency(noLosPagaElInquilino)} los pone el
              propietario o la inmobiliaria: no entran en el cobro del inquilino.
            </p>
          ) : null}

          {deUnaSolaVez > 0 ? (
            // Los de una sola vez no se repiten: decir sólo el total mensual
            // haría creer que se cobran todos los meses.
            <p className="text-xs text-muted-foreground">
              Hay {formatCurrency(deUnaSolaVez)} en conceptos de una sola vez,
              que no se repiten.
            </p>
          ) : null}
        </div>
      ) : null}

      {agregando ? (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Concepto</label>
            <Select value={elegido} onValueChange={setElegido}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí del catálogo" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CONCEPTOS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Valor mensual (antes de impuestos)
            </label>
            <Input
              type="number"
              min="1"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="180000"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <Checkbox
              checked={recurrente}
              onCheckedChange={(v) => setRecurrente(v === true)}
              className="mt-0.5"
            />
            <span>
              Se cobra todos los meses
              <span className="block text-xs text-muted-foreground">
                Desmarcá si es por una sola vez, como una reparación.
              </span>
            </span>
          </label>

          <div className="flex gap-2">
            <Button
              size="sm"
              hideArrow
              disabled={ocupado || !elegido || !valor}
              onClick={() => void agregar()}
            >
              Agregar al contrato
            </Button>
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              disabled={ocupado}
              onClick={() => {
                setAgregando(false)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}

/**
 * Un concepto con su liquidación al lado.
 *
 * Se muestran los MOTIVOS, incluso los negativos: un cobro sin IVA y uno al
 * que se le olvidó el IVA se ven idénticos en una factura.
 */
function ConceptoEnLista({
  concepto,
  uso,
  contract,
  puedeEditar,
  ocupado,
  onQuitar,
}: {
  concepto: ConceptoDelContrato
  uso: 'VIVIENDA' | 'COMERCIAL' | null
  contract: Contract
  puedeEditar: boolean
  ocupado: boolean
  onQuitar: () => void
}) {
  const [abierto, setAbierto] = useState(false)

  const liquidacion = useMemo(() => {
    if (!uso) return null
    /*
     * Perfiles por defecto según el tipo de persona. Es una aproximación
     * declarada, no un dato: el contrato todavía no guarda si cada parte es
     * agente retenedor. Se dice en pantalla para que nadie tome el número como
     * definitivo.
     */
    return liquidar({
      base: concepto.base,
      baseCop: concepto.valorCop,
      uso,
      paga: perfilPorDefecto('NATURAL'),
      recibe: perfilPorDefecto(
        concepto.recibe === 'INMOBILIARIA' ? 'JURIDICA' : 'NATURAL',
      ),
    })
  }, [concepto, uso])

  void contract

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button
          type="button"
          className="text-left text-sm font-medium text-foreground hover:underline"
          onClick={() => setAbierto((v) => !v)}
        >
          {concepto.nombre}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {/* Quién lo paga decide si entra en el cobro del inquilino.
                Deducirlo del nombre es justo lo que hace que se cuele. */}
            · lo paga {QUIEN_PAGA[concepto.paga]}
            {!concepto.recurrente ? ' · una sola vez' : ''}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(concepto.valorCop)}
          </span>
          {puedeEditar ? (
            <button
              type="button"
              aria-label={`Quitar ${concepto.nombre}`}
              disabled={ocupado}
              onClick={onQuitar}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {abierto ? (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          {!uso ? (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <Warning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              No se puede liquidar: falta el uso del inmueble, que es lo que
              decide si hay IVA. Definilo arriba, en Administración.
            </p>
          ) : liquidacion ? (
            <>
              {liquidacion.renglones.map((r) => (
                <div key={r.concepto} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {NOMBRE_DE_RENGLON[r.concepto]} ({r.porcentaje}%)
                  </span>
                  <span
                    className={
                      r.valorCop < 0
                        ? 'tabular-nums text-destructive'
                        : 'tabular-nums text-foreground'
                    }
                  >
                    {formatCurrency(r.valorCop)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-1.5 text-xs font-medium">
                <span className="text-foreground">Neto que recibe</span>
                <span className="tabular-nums text-foreground">
                  {formatCurrency(liquidacion.netoQueRecibeCop)}
                </span>
              </div>
              {/* Los motivos, incluso los negativos: un cobro sin IVA y uno al
                  que se le olvidó el IVA se ven idénticos en una factura. */}
              <ul className="space-y-0.5 pt-1">
                {liquidacion.motivos.map((m) => (
                  <li key={m} className="text-[11px] leading-snug text-muted-foreground">
                    {m}
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Calculado con perfiles por defecto: el contrato todavía no
                guarda si cada parte es agente retenedor.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const QUIEN_PAGA: Record<string, string> = {
  INQUILINO: 'el inquilino',
  PROPIETARIO: 'el propietario',
  INMOBILIARIA: 'la inmobiliaria',
  TERCERO: 'un tercero',
}

const NOMBRE_DE_RENGLON: Record<string, string> = {
  IVA: 'IVA',
  RETENCION_RENTA: 'Retención en la fuente',
  RETE_IVA: 'ReteIVA',
  RETE_ICA: 'ReteICA',
}

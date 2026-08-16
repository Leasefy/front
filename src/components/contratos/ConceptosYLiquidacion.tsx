'use client'

/**
 * ConceptosYLiquidacion — qué se cobra, y qué impuestos le caen.
 *
 * La pantalla existe para hacer visible una sola cosa: **los impuestos no los
 * decide el concepto, los decide quién le paga a quién.** En el catálogo que
 * traemos, esa información estaba metida en el nombre —nueve "Canon de
 * arrendamiento", uno por combinación tributaria— y elegir mal no daba error,
 * daba una factura equivocada.
 *
 * Por eso lo que se muestra al lado del número no es el número: son los
 * MOTIVOS. Un cobro sin IVA y un cobro al que se le olvidó el IVA se ven
 * exactamente igual en una factura; la diferencia sólo existe si está escrita.
 */

import { useMemo, useState } from 'react'
import { Info, Receipt } from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { CONCEPTOS, conceptoPorId } from '@/lib/contratos/conceptos'
import {
  liquidar,
  perfilPorDefecto,
  type PerfilTributario,
  type TipoPersona,
  type UsoDelInmueble,
} from '@/lib/contratos/escenarios-tributarios'

const ETIQUETA_RENGLON: Record<string, string> = {
  IVA: 'IVA',
  RETENCION_RENTA: 'Retención en la fuente',
  RETE_IVA: 'ReteIVA',
  RETE_ICA: 'ReteICA',
}

export function ConceptosYLiquidacion() {
  const [conceptoId, setConceptoId] = useState('canon-arrendamiento')
  const [valor, setValor] = useState(2_000_000)
  const [uso, setUso] = useState<UsoDelInmueble>('VIVIENDA')
  const [paga, setPaga] = useState<PerfilTributario>(perfilPorDefecto('NATURAL'))
  const [recibe, setRecibe] = useState<PerfilTributario>(perfilPorDefecto('NATURAL'))

  const concepto = conceptoPorId(conceptoId) ?? CONCEPTOS[0]

  const cuenta = useMemo(
    () => liquidar({ base: concepto.base, baseCop: valor, uso, paga, recibe }),
    [concepto.base, valor, uso, paga, recibe],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Lo que se elige */}
      <Card className="space-y-5 p-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="concepto">
            Concepto
          </label>
          <Select value={conceptoId} onValueChange={setConceptoId}>
            <SelectTrigger id="concepto" data-testid="selector-concepto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONCEPTOS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Uno solo por concepto. El tratamiento tributario sale de las casillas
            de abajo, no del nombre.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="valor">
            Valor
          </label>
          <Input
            id="valor"
            type="number"
            min={0}
            step={50_000}
            value={valor}
            onChange={(e) => setValor(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">Uso del inmueble</span>
          <Select value={uso} onValueChange={(v) => setUso(v as UsoDelInmueble)}>
            <SelectTrigger data-testid="selector-uso">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIVIENDA">Vivienda</SelectItem>
              <SelectItem value="COMERCIAL">Comercial</SelectItem>
            </SelectContent>
          </Select>
          {/* No es un dato de ficha: es el que decide si hay IVA. */}
          <p className="text-xs text-muted-foreground">
            El arrendamiento de vivienda está excluido de IVA; el comercial no.
          </p>
        </div>

        <Perfil titulo="Quien paga" perfil={paga} onCambio={setPaga} esPagador />
        <Perfil titulo="Quien recibe" perfil={recibe} onCambio={setRecibe} />
      </Card>

      {/* Lo que sale */}
      <Card className="space-y-4 p-5" data-testid="liquidacion">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Liquidación
        </h2>

        <dl className="space-y-2 text-sm">
          <Fila etiqueta={concepto.nombre} valor={formatCurrency(valor)} />
          {cuenta.renglones.map((r) => (
            <Fila
              key={r.concepto}
              etiqueta={`${ETIQUETA_RENGLON[r.concepto]} (${r.porcentaje}% sobre ${formatCurrency(r.sobreCop)})`}
              valor={formatCurrency(r.valorCop)}
              atenuado={r.valorCop < 0}
            />
          ))}
        </dl>

        <div className="space-y-2 border-t border-border pt-3">
          <Fila
            etiqueta="Paga"
            valor={formatCurrency(cuenta.totalAPagarCop)}
            fuerte
          />
          <Fila
            etiqueta="Recibe"
            valor={formatCurrency(cuenta.netoQueRecibeCop)}
            fuerte
            testId="neto"
          />
          {cuenta.totalAPagarCop !== cuenta.netoQueRecibeCop ? (
            // La diferencia no se pierde: la consigna a la DIAN quien paga.
            <p className="text-xs text-muted-foreground">
              La diferencia son retenciones: las descuenta quien paga y las
              consigna a la DIAN a nombre de quien recibe.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Info className="h-3.5 w-3.5" />
            Por qué
          </p>
          <ul className="space-y-1" data-testid="motivos">
            {cuenta.motivos.map((m) => (
              <li key={m} className="text-xs leading-relaxed text-muted-foreground">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}

function Perfil({
  titulo,
  perfil,
  onCambio,
  esPagador = false,
}: {
  titulo: string
  perfil: PerfilTributario
  onCambio: (p: PerfilTributario) => void
  esPagador?: boolean
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium text-foreground">{titulo}</legend>

      <Select
        value={perfil.tipoPersona}
        onValueChange={(v) => onCambio(perfilPorDefecto(v as TipoPersona))}
      >
        <SelectTrigger data-testid={`tipo-${esPagador ? 'paga' : 'recibe'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NATURAL">Persona natural</SelectItem>
          <SelectItem value="JURIDICA">Persona jurídica</SelectItem>
        </SelectContent>
      </Select>

      {esPagador ? (
        <>
          <Casilla
            id="ret-renta"
            marcada={perfil.agenteRetenedorRenta}
            onCambio={(v) =>
              onCambio({
                ...perfil,
                agenteRetenedorRenta: v,
                // ReteIVA presupone ser agente retenedor: apagarlo apaga el otro.
                agenteRetenedorIva: v ? perfil.agenteRetenedorIva : false,
              })
            }
          >
            Practica retención en la fuente
          </Casilla>
          <Casilla
            id="ret-iva"
            marcada={perfil.agenteRetenedorIva}
            deshabilitada={!perfil.agenteRetenedorRenta}
            onCambio={(v) => onCambio({ ...perfil, agenteRetenedorIva: v })}
          >
            Practica ReteIVA
          </Casilla>
          <Casilla
            id="ret-ica"
            marcada={perfil.agenteRetenedorIca}
            onCambio={(v) => onCambio({ ...perfil, agenteRetenedorIca: v })}
          >
            Practica ReteICA
          </Casilla>
        </>
      ) : (
        <Casilla
          id="resp-iva"
          marcada={perfil.responsableIva}
          onCambio={(v) => onCambio({ ...perfil, responsableIva: v })}
        >
          Responsable de IVA
        </Casilla>
      )}
    </fieldset>
  )
}

function Casilla({
  id,
  marcada,
  onCambio,
  deshabilitada = false,
  children,
}: {
  id: string
  marcada: boolean
  onCambio: (v: boolean) => void
  deshabilitada?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-sm ${
        deshabilitada ? 'cursor-not-allowed text-muted-foreground/60' : 'text-foreground/80'
      }`}
    >
      <Checkbox
        id={id}
        checked={marcada}
        disabled={deshabilitada}
        onCheckedChange={(c) => onCambio(c === true)}
      />
      {children}
    </label>
  )
}

function Fila({
  etiqueta,
  valor,
  fuerte = false,
  atenuado = false,
  testId,
}: {
  etiqueta: string
  valor: string
  fuerte?: boolean
  atenuado?: boolean
  testId?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={atenuado ? 'text-muted-foreground' : 'text-foreground/80'}>{etiqueta}</dt>
      <dd
        className={`shrink-0 tabular-nums ${
          fuerte ? 'text-base font-semibold text-foreground' : 'text-foreground'
        }`}
        data-testid={testId}
      >
        {valor}
      </dd>
    </div>
  )
}

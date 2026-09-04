'use client'

/**
 * Uso, periodicidad y comisión: lo que la inmobiliaria necesita del contrato
 * para poder cobrarlo y liquidarlo.
 *
 * Los tres se guardaban desde la migración y no se veían en ninguna pantalla.
 * Un campo que se guarda y no se ve es medio campo: nadie puede notar que el
 * uso quedó mal puesto, y el uso decide si el canon lleva IVA.
 *
 * Editar acá NO invalida firmas ni devuelve el contrato a revisión: ninguno de
 * los tres aparece en el documento que firmó el inquilino. Va por
 * PATCH /contracts/:id/administracion, no por el PATCH que edita el canon.
 */

import { useState } from 'react'
import { Receipt, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { contractsApi } from '@/lib/api/contracts.service'
import type { Contract } from '@/lib/types/contract'

const USOS = { VIVIENDA: 'Vivienda', COMERCIAL: 'Comercial' } as const

const PERIODICIDADES = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
} as const

type Uso = keyof typeof USOS
type Periodicidad = keyof typeof PERIODICIDADES

interface Props {
  contract: Contract
  puedeEditar: boolean
  onActualizado: (c: Contract) => void
}

export function AdministracionDelContrato({
  contract,
  puedeEditar,
  onActualizado,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uso, setUso] = useState<Uso | ''>((contract.usoInmueble as Uso) ?? '')
  const [periodicidad, setPeriodicidad] = useState<Periodicidad | ''>(
    (contract.periodicidad as Periodicidad) ?? '',
  )
  const [comision, setComision] = useState(
    contract.comisionPorcentaje != null ? String(contract.comisionPorcentaje) : '',
  )

  /*
   * Cómo se le cobra a ESTE contrato (lo que Juan describió por contrato):
   * los días de plazo tras la fecha de pago antes de que corra la mora
   * —vacío = los de la inmobiliaria— y si el primer mes se prorratea por los
   * días ocupados. Vivían en el DTO de creación y no se veían ni se podían
   * corregir en un contrato activo.
   */
  const [diasDePlazo, setDiasDePlazo] = useState(
    contract.diasDePlazo != null ? String(contract.diasDePlazo) : '',
  )
  const [prorratear, setProrratear] = useState(contract.prorratearPrimerMes ?? false)

  /*
   * El perfil tributario del inquilino. Es el ÚNICO de los tres que vive en el
   * contrato: la misma persona puede arrendar a título propio y por su empresa.
   * El del propietario está en su ficha y el de la inmobiliaria en su config.
   *
   * Tres estados, no dos: 'si' | 'no' | '' (= no lo sabemos). Un checkbox
   * colapsaría los dos últimos y convertiría un vacío en la afirmación «no
   * retiene», que nadie hizo.
   */
  const [tipoPersona, setTipoPersona] = useState<TipoPersona | ''>(
    contract.inquilinoTipoPersona ?? '',
  )
  const [retieneRenta, setRetieneRenta] = useState<Ternario>(
    aTernario(contract.inquilinoRetenedorRenta),
  )
  const [responsableIva, setResponsableIva] = useState<Ternario>(
    aTernario(contract.inquilinoResponsableIva),
  )
  const [retieneIva, setRetieneIva] = useState<Ternario>(
    aTernario(contract.inquilinoRetenedorIva),
  )
  const [retieneIca, setRetieneIca] = useState<Ternario>(
    aTernario(contract.inquilinoRetenedorIca),
  )

  /*
   * El IVA lo GENERA el arrendador; el inquilino sólo RETIENE. Son ejes
   * distintos, así que es una perilla aparte y no una más del bloque del
   * inquilino.
   *
   * Vacío = heredar de la ficha del propietario, que es como funcionaba antes
   * de que existiera este campo. Se muestra qué está heredando abajo, porque
   * «vacío» sin el valor efectivo obliga a ir a buscar la ficha.
   */
  const [arrendadorIva, setArrendadorIva] = useState<Ternario>(
    aTernario(contract.arrendadorResponsableIva),
  )

  /*
   * Hay DOS comisiones: la del contrato (la que trajo el archivo migrado) y la
   * de la consignación, que es la que la dispersión y el extracto usan para
   * pagarle al propietario. Cuando no coinciden, mostrar una sola sería elegir
   * cuál de las dos verdades contar.
   */
  const delContrato = contract.comisionPorcentaje ?? null
  const deConsignacion = contract.comisionDeConsignacion ?? null
  const discrepan =
    delContrato != null && deConsignacion != null && delContrato !== deConsignacion

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const n = comision.trim() === '' ? undefined : Number(comision)
      if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 100)) {
        setError('La comisión va entre 0 y 100.')
        return
      }
      const plazo = diasDePlazo.trim() === '' ? null : Number(diasDePlazo)
      if (plazo !== null && (!Number.isInteger(plazo) || plazo < 0 || plazo > 60)) {
        setError('Los días de plazo van entre 0 y 60, sin decimales.')
        return
      }
      const actualizado = await contractsApi.actualizarAdministracion(contract.id, {
        usoInmueble: uso === '' ? undefined : uso,
        periodicidad: periodicidad === '' ? undefined : periodicidad,
        comisionPorcentaje: n,
        // `null` = volver a heredar los días de la inmobiliaria.
        diasDePlazo: plazo,
        prorratearPrimerMes: prorratear,
        // `null` es una acción: «volvé a no saberlo». Distinto de no mandar el
        // campo, que lo deja como estaba.
        arrendadorResponsableIva: deTernario(arrendadorIva),
        inquilinoTipoPersona: tipoPersona === '' ? null : tipoPersona,
        inquilinoResponsableIva: deTernario(responsableIva),
        inquilinoRetenedorRenta: deTernario(retieneRenta),
        inquilinoRetenedorIva: deTernario(retieneIva),
        inquilinoRetenedorIca: deTernario(retieneIca),
      })
      onActualizado(actualizado)
      setEditando(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const regimen = contract.regimenTributario ?? null
  const ivaDelCanon = leerIvaDelCanon(contract)

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4" data-testid="administracion">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Cómo se cobra</h3>
        </div>
        {puedeEditar ? (
          <Button variant="ghost" size="sm" hideArrow onClick={() => setEditando(true)}>
            Corregir
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Fila
          etiqueta="Uso del inmueble"
          valor={contract.usoInmueble ? USOS[contract.usoInmueble as Uso] : null}
          ausente="Sin definir — no se sabe si el canon lleva IVA"
        />
        <Fila
          etiqueta="Periodicidad"
          valor={
            contract.periodicidad
              ? PERIODICIDADES[contract.periodicidad as Periodicidad]
              : null
          }
          ausente="Sin definir"
        />
        <Fila
          etiqueta="Día de pago"
          valor={contract.paymentDueDay ? `Día ${contract.paymentDueDay}` : null}
          ausente="El de la inmobiliaria"
        />
        <Fila
          etiqueta="Plazo antes de la mora"
          valor={
            contract.diasDePlazo != null
              ? `${contract.diasDePlazo} ${contract.diasDePlazo === 1 ? 'día' : 'días'}`
              : null
          }
          ausente="Los días de la inmobiliaria"
        />
        <Fila
          etiqueta="Primer mes"
          valor={contract.prorratearPrimerMes ? 'Prorrateado por días' : 'Mes completo'}
          ausente=""
        />
        <Fila
          etiqueta="Comisión"
          valor={deConsignacion != null ? `${deConsignacion}%` : null}
          ausente="Sin consignación: este inmueble no genera cobros"
        />
        {discrepan ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5">
            <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <p className="text-xs text-foreground">
              El contrato dice <strong>{delContrato}%</strong> y la consignación{' '}
              <strong>{deConsignacion}%</strong>. Al propietario se le descuenta la
              de la consignación. Corregí acá para dejar las dos iguales.
            </p>
          </div>
        ) : null}
      </div>

      {/*
        Impuestos, resumidos: una línea para el IVA del canon (lo decide el
        uso y el propietario) y una fila de chips para lo que retiene el
        inquilino. Antes eran seis filas de texto largo que decían lo mismo
        que estos chips, y el ojo no encontraba el que faltaba.
      */}
      <div className="space-y-2 border-t border-border pt-3" data-testid="impuestos">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Impuestos
        </p>
        <Fila etiqueta="IVA sobre el canon" valor={ivaDelCanon.valor} ausente={ivaDelCanon.ausente} />
        <div className="flex items-start justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Inquilino</span>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Chip
              texto={
                contract.inquilinoTipoPersona === 'JURIDICA'
                  ? 'Empresa'
                  : contract.inquilinoTipoPersona === 'NATURAL'
                    ? 'Persona natural'
                    : 'Tipo sin definir'
              }
              estado={contract.inquilinoTipoPersona ? 'si' : 'vacio'}
            />
            <Chip
              texto={
                contract.inquilinoRetenedorRenta == null
                  ? 'Retefuente sin definir'
                  : contract.inquilinoRetenedorRenta
                    ? 'Retiene renta'
                    : 'No retiene renta'
              }
              estado={aTernario(contract.inquilinoRetenedorRenta) || 'vacio'}
              testId="chip-retefuente"
            />
            <Chip
              texto={
                contract.inquilinoRetenedorIva == null
                  ? 'ReteIVA sin definir'
                  : contract.inquilinoRetenedorIva
                    ? 'Retiene IVA'
                    : 'No retiene IVA'
              }
              estado={aTernario(contract.inquilinoRetenedorIva) || 'vacio'}
              testId="chip-reteiva"
            />
            <Chip
              texto={
                contract.inquilinoRetenedorIca == null
                  ? 'ReteICA sin definir'
                  : contract.inquilinoRetenedorIca
                    ? 'Retiene ICA'
                    : 'No retiene ICA'
              }
              estado={aTernario(contract.inquilinoRetenedorIca) || 'vacio'}
              testId="chip-reteica"
            />
            <Chip
              texto={
                contract.inquilinoResponsableIva == null
                  ? 'IVA propio sin definir'
                  : contract.inquilinoResponsableIva
                    ? 'Responsable de IVA'
                    : 'No responsable de IVA'
              }
              estado={aTernario(contract.inquilinoResponsableIva) || 'vacio'}
            />
          </div>
        </div>
        {regimen &&
        (regimen.inquilinoRetenedorRenta.valor == null ||
          regimen.inquilinoRetenedorIva.valor == null ||
          regimen.inquilinoRetenedorIca.valor == null) ? (
          <p className="text-xs text-muted-foreground">
            Lo que está sin definir no se descuenta en el cobro. Se corrige acá y
            sale en el próximo.
          </p>
        ) : null}
      </div>

      {/*
        El formulario va en un diálogo: son once campos, y en la columna
        angosta era un scroll de dos pantallas. En el diálogo caben en dos
        columnas, agrupados por lo que deciden.
      */}
      <Dialog open={editando} onOpenChange={(v) => !guardando && setEditando(v)}>
        <DialogContent className="max-w-3xl" data-testid="administracion-dialogo">
          <DialogHeader>
            <DialogTitle>Cómo se cobra este contrato</DialogTitle>
            <DialogDescription>
              Nada de esto va en el documento firmado: corregirlo no invalida
              firmas. Lo que cambies sale en el próximo cobro.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cobro
              </legend>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Uso del inmueble</label>
                <Select value={uso} onValueChange={(v) => setUso(v as Uso)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USOS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vivienda está excluida de IVA; comercial no.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Periodicidad de cobro</label>
                <Select
                  value={periodicidad}
                  onValueChange={(v) => setPeriodicidad(v as Periodicidad)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODICIDADES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Comisión de administración (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se guarda también en la consignación: es de donde sale lo que
                  se le descuenta al propietario.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Días de plazo antes de la mora
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="60"
                  value={diasDePlazo}
                  onChange={(e) => setDiasDePlazo(e.target.value)}
                  placeholder="Los de la inmobiliaria"
                  data-testid="dias-de-plazo"
                />
                <p className="text-xs text-muted-foreground">
                  La mora corre desde el día de pago más este plazo. Vacío = los
                  días de la inmobiliaria.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                <Checkbox
                  checked={prorratear}
                  onCheckedChange={(v) => setProrratear(v === true)}
                  className="mt-0.5"
                  data-testid="prorratear-primer-mes"
                />
                <span>
                  Prorratear el primer mes
                  <span className="block text-xs text-muted-foreground">
                    El primer cobro sale por los días ocupados, no por el mes
                    completo.
                  </span>
                </span>
              </label>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Impuestos
              </legend>
              <SelectorTernario
                etiqueta="¿El propietario cobra IVA en este contrato?"
                valor={arrendadorIva}
                onChange={setArrendadorIva}
                si="Sí, el canon lleva IVA"
                no="No, este contrato no lleva IVA"
                ayuda={ayudaDelArrendador(contract)}
                testId="arrendador-responsable-iva"
              />

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">El inquilino es</label>
                <Select
                  value={tipoPersona}
                  onValueChange={(v) => setTipoPersona(v as TipoPersona)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No se sabe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATURAL">Persona natural</SelectItem>
                    <SelectItem value="JURIDICA">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SelectorTernario
                etiqueta="¿Practica retención en la fuente?"
                valor={retieneRenta}
                onChange={setRetieneRenta}
                si="Sí, es agente retenedor"
                no="No retiene"
                ayuda="La retención la practica quien paga. Sin este dato el cobro NO descuenta retención."
                testId="inquilino-retenedor-renta"
              />
              <SelectorTernario
                etiqueta="¿Es responsable de IVA?"
                valor={responsableIva}
                onChange={setResponsableIva}
                si="Sí, responsable de IVA"
                no="No es responsable"
                ayuda="Informativo para la cuenta de cobro; el IVA del canon lo decide el propietario y el uso."
                testId="inquilino-responsable-iva"
              />
              <SelectorTernario
                etiqueta="¿Practica reteIVA?"
                valor={retieneIva}
                onChange={setRetieneIva}
                si="Sí, es agente de retención de IVA"
                no="No retiene IVA"
                ayuda="Sólo si el canon lleva IVA (comercial). Se calcula sobre el IVA."
                testId="inquilino-retenedor-iva"
              />
              <SelectorTernario
                etiqueta="¿Practica reteICA?"
                valor={retieneIca}
                onChange={setRetieneIca}
                si="Sí, es agente de retención de ICA"
                no="No retiene ICA"
                ayuda="Necesita la tarifa del municipio configurada en la inmobiliaria."
                testId="inquilino-retenedor-ica"
              />
            </fieldset>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              variant="ghost"
              hideArrow
              disabled={guardando}
              onClick={() => {
                setEditando(false)
                setError(null)
              }}
            >
              Cancelar
            </Button>
            <Button hideArrow disabled={guardando} isLoading={guardando} onClick={() => void guardar()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/**
 * El IVA del canon en una línea. Lo resuelve el BACK (`regimenTributario`,
 * la misma función del motor de cobros); acá sólo se pone en palabras.
 */
function leerIvaDelCanon(contract: Contract): { valor: string | null; ausente: string } {
  const r = contract.regimenTributario
  if (!r) return { valor: null, ausente: 'Sin datos del régimen' }
  const comercial = r.usoComercial.valor
  const propietario = r.arrendadorResponsableIva.valor
  if (comercial === false) return { valor: 'No lleva (vivienda)', ausente: '' }
  if (comercial === null) return { valor: null, ausente: 'Sin definir el uso — no se sabe si lleva IVA' }
  if (propietario === true) {
    return {
      valor: `Sí, 19 %${r.arrendadorResponsableIva.origen === 'PROPIETARIO' ? ' (por la ficha del propietario)' : ''}`,
      ausente: '',
    }
  }
  if (propietario === false) return { valor: 'No lleva (el propietario no es responsable)', ausente: '' }
  return { valor: null, ausente: 'Sin definir si el propietario cobra IVA — el cobro sale sin IVA' }
}

/** Un dato tributario en un chip: dicho que sí, dicho que no, o sin decir. */
function Chip({
  texto,
  estado,
  testId,
}: {
  texto: string
  estado: 'si' | 'no' | 'vacio'
  testId?: string
}) {
  return (
    <span
      data-testid={testId}
      data-estado={estado}
      className={
        estado === 'si'
          ? 'rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary'
          : estado === 'no'
            ? 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
            : 'rounded-full border border-dashed border-warning/60 px-2 py-0.5 text-xs text-warning'
      }
    >
      {texto}
    </span>
  )
}

type TipoPersona = 'NATURAL' | 'JURIDICA'

/**
 * Tres estados, no dos.
 *
 * Un checkbox sólo sabe decir sí o no. Acá «todavía no se sabe» tiene que
 * poder decirse: con un booleano, cada contrato sin configurar afirmaría que
 * el inquilino NO retiene — una afirmación que nadie hizo, sobre plata.
 */
type Ternario = 'si' | 'no' | ''

function aTernario(v: boolean | null | undefined): Ternario {
  if (v === true) return 'si'
  if (v === false) return 'no'
  return ''
}

function deTernario(v: Ternario): boolean | null {
  if (v === 'si') return true
  if (v === 'no') return false
  return null
}

/**
 * Qué está heredando la perilla del arrendador, en palabras.
 *
 * El valor efectivo lo resuelve el BACK (`regimenTributario`) con la misma
 * función que usa el motor de cobros. Acá sólo se traduce a español: si esta
 * pantalla lo dedujera por su cuenta, el día que las dos cuentas difieran el
 * formulario diría una cosa y el cobro cobraría otra.
 */
function ayudaDelArrendador(contract: Contract): string {
  const base =
    'Quien cobra el IVA es el propietario; el inquilino sólo lo retiene. Sólo aplica en inmuebles comerciales: el arrendamiento de vivienda está excluido.'
  const r = contract.regimenTributario?.arrendadorResponsableIva
  if (!r) return base
  if (r.origen === 'CONTRATO') {
    return `${base} Hoy lo decide este contrato.`
  }
  if (r.origen === 'PROPIETARIO') {
    return `${base} Sin definir acá se hereda de la ficha del propietario, que hoy dice ${
      r.valor ? 'que SÍ es responsable de IVA' : 'que NO es responsable de IVA'
    }.`
  }
  return `${base} Sin definir acá y sin el dato en la ficha del propietario, el cobro NO lleva IVA y lo deja dicho.`
}

/** Un sí / no / no se sabe. El vacío NO es «no»: es que nadie lo afirmó. */
function SelectorTernario({
  etiqueta,
  valor,
  onChange,
  si,
  no,
  ayuda,
  testId,
}: {
  etiqueta: string
  valor: Ternario
  onChange: (v: Ternario) => void
  si: string
  no: string
  ayuda: string
  testId: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{etiqueta}</label>
      <Select value={valor} onValueChange={(v) => onChange(v as Ternario)}>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder="No se sabe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="si">{si}</SelectItem>
          <SelectItem value="no">{no}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{ayuda}</p>
    </div>
  )
}

function Fila({
  etiqueta,
  valor,
  ausente,
}: {
  etiqueta: string
  valor: string | null
  ausente: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      {valor ? (
        <span className="text-right font-medium text-foreground">{valor}</span>
      ) : (
        /* Un guión diría "no aplica". Lo que pasa es que no se sabe, y la
           consecuencia de no saberlo es distinta en cada campo. */
        <span className="max-w-[60%] text-right text-xs text-muted-foreground">
          {ausente}
        </span>
      )}
    </div>
  )
}

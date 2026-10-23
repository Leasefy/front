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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Presence } from '@leasefy/cadence'
import { Plus, Receipt, Trash, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { MoneyInput } from '@/components/ui/money-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioCardGroup, RadioCard } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import { MesesDelConcepto, type MesElegido } from './MesesDelConcepto'
import { mesCorto, sumanElTotal } from '@/lib/contratos/meses-del-concepto'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  contractsApi,
  type ConceptoDelContrato,
} from '@/lib/api/contracts.service'
import { ComisionableDelConcepto } from '@/components/inmobiliaria/mandato/ComisionableDelConcepto'
import { type Parte } from '@/lib/contratos/conceptos'
import { useCatalogoDeConceptos } from '@/lib/conceptos/use-catalogo-de-conceptos'
import { liquidar, perfilPorDefecto } from '@/lib/contratos/escenarios-tributarios'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { AREAS_DE_LA_DEUDA, esPlataQueSeAcepta, fraseDeLaPlata } from '@/lib/plata/con-centavos'
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  MENSAJES_DEL_CONTRATO_VIGENTE,
  topeDePesos,
} from '@/lib/contratos/limites-del-contrato-vigente'
import type {
  Contract,
  PerfilTributario,
  PerfilesDelContrato,
} from '@/lib/types/contract'

interface Props {
  contract: Contract
  puedeEditar: boolean
}

export function ConceptosDelContrato({ contract, puedeEditar }: Props) {
  // El catálogo de la inmobiliaria (Nico, 13-10-2026): sus nombres, sin los que apagó.
  const { activos: catalogoActivo } = useCatalogoDeConceptos()
  const [conceptos, setConceptos] = useState<ConceptoDelContrato[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // El error del valor va debajo del valor, no al pie de la tarjeta.
  const [errorDelValor, setErrorDelValor] = useState<string | null>(null)
  const campoDelValor = useRef<HTMLInputElement | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [agregando, setAgregando] = useState(false)
  // El concepto que se está por quitar. Quitar un recurrente cambia lo que se
  // le cobra a alguien todos los meses: se confirma diciendo qué, cuánto y a
  // quién, no a un clic sobre una basura.
  const [aQuitar, setAQuitar] = useState<ConceptoDelContrato | null>(null)

  const [elegido, setElegido] = useState('')
  const [valor, setValor] = useState('')
  const [recurrente, setRecurrente] = useState(true)
  /*
   * Portofino 22-10: «¿cuándo se cobra?» — todos los meses, una sola vez (la
   * próxima cuota) o en los meses que se eligen (diferir o meses sueltos).
   */
  const [cuando, setCuando] = useState<'CADA_MES' | 'UNA_VEZ' | 'MESES'>('CADA_MES')
  const [meses, setMeses] = useState<MesElegido[]>([])
  const [errorDeLosMeses, setErrorDeLosMeses] = useState<string | null>(null)
  // «Centavos en todo» (C3-FRONT): el valor del concepto es plata de la deuda;
  // con sus dos áreas prendidas viaja con centavos, tal cual se escribió.
  const conCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA)

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
          setError(
            mensajeParaLaPersona(e, {
              porDefecto: 'No pudimos cargar los conceptos del contrato.',
              accion: 'cargar los conceptos del contrato',
            }),
          )
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
        .filter((c) => !c.recurrente && !(c.planDeMeses && c.planDeMeses.length > 0))
        .reduce((s, c) => s + c.valorCop, 0),
    [conceptos],
  )
  // Portofino 22-10: los que van en meses elegidos.
  const enMesesElegidos = useMemo(
    () =>
      (conceptos ?? [])
        .filter((c) => c.planDeMeses && c.planDeMeses.length > 0)
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
    const catalogo = catalogoActivo.find((c) => c.clave === elegido)
    if (!catalogo) return
    const n = Number(valor)
    // Con centavos va EXACTO (el campo ya frena el tercer decimal); sin ellos,
    // al peso como siempre.
    const valorCop = conCentavos ? n : Math.round(n)
    // Lo que el back rechazaría se ataja acá, con su misma frase.
    const delCliente =
      !Number.isFinite(n) || n <= 0
        ? 'El valor tiene que ser mayor que cero.'
        : conCentavos && !esPlataQueSeAcepta(n, true)
          ? fraseDeLaPlata(MENSAJES_DEL_CONTRATO_VIGENTE.valorDelConceptoEntero, true)
          : topeDePesos(valorCop, MENSAJES_DEL_CONTRATO_VIGENTE.valorDelConceptoMaximo)
    if (delCliente) {
      setErrorDelValor(delCliente)
      campoDelValor.current?.focus()
      return
    }
    if (cuando === 'MESES') {
      const delPlan =
        meses.length === 0
          ? 'Elige al menos un mes, o difiere en cuántos meses.'
          : !sumanElTotal(valorCop, meses)
            ? 'Los valores de los meses tienen que sumar el total.'
            : meses.some((m) => !(m.valorCop > 0))
              ? 'Cada mes tiene que llevar un valor mayor que cero.'
              : null
      if (delPlan) {
        setErrorDeLosMeses(delPlan)
        return
      }
    }
    setErrorDeLosMeses(null)
    setOcupado(true)
    setError(null)
    setErrorDelValor(null)
    try {
      const creado = await contractsApi.agregarConcepto(contract.id, {
        conceptoId: catalogo.clave,
        nombre: catalogo.nombre,
        base: catalogo.base,
        paga: catalogo.paga,
        recibe: catalogo.recibe,
        valorCop,
        recurrente: cuando === 'CADA_MES',
        ...(cuando === 'MESES' ? { meses } : {}),
      })
      const { avisos, ...concepto } = creado
      setConceptos((prev) => [...(prev ?? []), concepto])
      // Un mes ya pagado o después del fin se movió: se dice a dónde.
      if (avisos && avisos.length > 0) {
        toast.info('Algunos meses se movieron', { description: avisos.join(' ') })
      }
      setElegido('')
      setValor('')
      setCuando('CADA_MES')
      setMeses([])
      setAgregando(false)
    } catch (e) {
      // Un 400 con `campos` va a su campo; lo demás (un 409, un 5xx con su
      // referencia, la red) al pie, por el traductor.
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        mapa: { valorCop: 'valor', meses: 'meses' },
        campos: ['valor', 'meses'] as const,
        porDefecto: 'No pudimos agregar el concepto.',
        accion: 'agregar el concepto',
      })
      if (porCampo.valor) {
        setErrorDelValor(porCampo.valor)
        campoDelValor.current?.focus()
      }
      if (porCampo.meses) setErrorDeLosMeses(porCampo.meses)
      setError(sueltos.length ? sueltos.join(' · ') : null)
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
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos quitar el concepto.',
          accion: 'quitar el concepto',
        }),
      )
    } finally {
      setOcupado(false)
      // Se cierra también si falló: el motivo se pinta al pie de la tarjeta,
      // y detrás del diálogo no se vería.
      setAQuitar(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Conceptos del contrato
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
          alguna cuota, agrégala acá: los recurrentes entran en el cobro de
          cada mes con su IVA y sus retenciones, y salen en la cuenta de cobro.
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
              onQuitar={() => setAQuitar(c)}
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
            <p className="text-caption text-muted-foreground">
              Otros {formatCurrency(noLosPagaElInquilino)} los pone el
              propietario o la inmobiliaria: no entran en el cobro del inquilino.
            </p>
          ) : null}

          {enMesesElegidos > 0 ? (
            <p className="text-caption text-muted-foreground">
              Hay {formatCurrency(enMesesElegidos)} repartidos en los meses elegidos: entran sólo en esas cuotas.
            </p>
          ) : null}

          {deUnaSolaVez > 0 ? (
            // Los de una sola vez no se repiten: decir sólo el total mensual
            // haría creer que se cobran todos los meses.
            <p className="text-caption text-muted-foreground">
              Hay {formatCurrency(deUnaSolaVez)} en conceptos de una sola vez,
              que no se repiten.
            </p>
          ) : null}
        </div>
      ) : null}

      {agregando ? (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <label className="text-caption text-muted-foreground">Concepto</label>
            <Select value={elegido} onValueChange={setElegido}>
              <SelectTrigger>
                <SelectValue placeholder="Elige del catálogo" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {/* QA-CONT C-21: el canon no se agrega como concepto: el contrato
                    ya lo cobra (agregarlo lo cobraría dos veces). */}
                {catalogoActivo.filter((c) => c.clave !== 'canon-arrendamiento').map((c) => (
                  <SelectItem key={c.clave} value={c.clave}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="valor-del-concepto" className="text-caption text-muted-foreground">
              {cuando === 'CADA_MES'
                ? 'Valor mensual (antes de impuestos)'
                : cuando === 'MESES'
                  ? 'Valor total (antes de impuestos)'
                  : 'Valor (antes de impuestos)'}
            </label>
            {/* Agrupa de a miles mientras se escribe: «5.678.888» se lee;
                «5678888» se cuenta con el dedo. */}
            <MoneyInput
              ref={campoDelValor}
              id="valor-del-concepto"
              areas={AREAS_DE_LA_DEUDA}
              value={valor}
              onChange={(v) => {
                setValor(v)
                setErrorDelValor(null)
              }}
              placeholder="180.000"
              data-testid="valor-del-concepto"
              aria-invalid={errorDelValor ? true : undefined}
              aria-describedby="valor-del-concepto-error"
            />
            <ErrorDelCampo id="valor-del-concepto-error" mensaje={errorDelValor} />
          </div>

          {/* Portofino 22-10: «¿cuándo se cobra?». */}
          <div className="space-y-1">
            <span className="text-caption text-muted-foreground">¿Cuándo se cobra?</span>
            <RadioCardGroup
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              value={cuando}
              onValueChange={(v) => {
                setCuando(v as typeof cuando)
                setRecurrente(v === 'CADA_MES')
                setErrorDeLosMeses(null)
              }}
            >
              <RadioCard value="CADA_MES" label="Todos los meses" description="Entra en cada cuota." />
              <RadioCard value="UNA_VEZ" label="Una sola vez" description="En la próxima cuota sin pagar." />
              <RadioCard value="MESES" label="En los meses que elijo" description="Diferir, o meses sueltos." />
            </RadioCardGroup>
          </div>

          {/* Nico 22-10: el calendario sale apenas se elige «En los meses que
              elijo», también sin concepto (los meses son los del contrato; el
              concepto sólo dice de quién son las cuotas ya pagadas, y al elegirlo
              se vuelven a leer sin perder los meses marcados). */}
          <Presence show={cuando === 'MESES'} direction="down">
            <MesesDelConcepto
              contractId={contract.id}
              paga={catalogoActivo.find((c) => c.clave === elegido)?.paga ?? 'INQUILINO'}
              total={Number(valor) || 0}
              conCentavos={conCentavos}
              valor={meses}
              onCambiar={(m) => {
                setMeses(m)
                setErrorDeLosMeses(null)
              }}
              error={errorDeLosMeses}
            />
          </Presence>

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
                setErrorDelValor(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <Presence show={Boolean(error)} initial={false} distance="xs" as="p" role="alert" className="text-sm text-destructive" data-testid="error-de-los-conceptos">
        {error}
      </Presence>

      <AlertDialog
        open={aQuitar !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !ocupado) setAQuitar(null)
        }}
      >
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar «{aQuitar?.nombre}» del contrato?</AlertDialogTitle>
            <AlertDialogDescription data-testid="que-deja-de-cobrarse">
              {aQuitar ? queDejaDeCobrarse(aQuitar) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              loading={ocupado}
              data-testid="confirmar-quitar-concepto"
              onClick={(e) => {
                // Se queda abierto mientras quita: el cierre lo decide la respuesta.
                e.preventDefault()
                if (aQuitar) void quitar(aQuitar.id)
              }}
            >
              {ocupado ? 'Quitando…' : 'Quitar el concepto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/**
 * Qué deja de cobrarse al quitar un concepto, en una frase: cuánto, cada
 * cuánto, quién lo paga y quién lo recibe. Un recurrente que paga el
 * inquilino además sale de su cobro mensual, y eso es lo que más importa.
 */
export function queDejaDeCobrarse(c: ConceptoDelContrato): string {
  const monto = formatCurrency(c.valorCop)
  const partes = `Lo paga ${QUIEN_PAGA[c.paga] ?? c.paga} y lo recibe ${QUIEN_PAGA[c.recibe] ?? c.recibe}.`
  if (!c.recurrente) {
    return `Se quita el cobro de una sola vez por ${monto}. ${partes}`
  }
  const alInquilino =
    c.paga === 'INQUILINO' ? ' Deja de sumarse al cobro mensual del inquilino.' : ''
  return `Deja de cobrarse ${monto} cada mes. ${partes}${alInquilino}`
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
  // El IVA y las retenciones del concepto, al centavo con las llaves de la deuda.
  const conCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA)

  const perfiles = contract.perfilesTributarios ?? null

  const liquidacion = useMemo(() => {
    if (!uso) return null
    /*
     * Los perfiles REALES de las dos partes del concepto. Antes se usaba
     * siempre `perfilPorDefecto('NATURAL')` para quien paga —da igual que
     * pagara una empresa— así que la retención salía en cero incluso cuando
     * se practica.
     *
     * Si el contrato no los trae, se cae al defecto por tipo de persona y se
     * dice abajo. Un supuesto declarado es defendible; uno callado, no.
     */
    return liquidar({
      base: concepto.base,
      baseCop: concepto.valorCop,
      uso,
      paga: perfilDeParte(concepto.paga, perfiles),
      recibe: perfilDeParte(concepto.recibe, perfiles),
      conCentavos,
    })
  }, [concepto, uso, perfiles, conCentavos])

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button
          type="button"
          className="text-left text-sm font-medium text-foreground hover:underline"
          onClick={() => setAbierto((v) => !v)}
        >
          {concepto.nombre}
          <span className="ml-1.5 text-caption font-normal text-muted-foreground">
            {/* Quién lo paga decide si entra en el cobro del inquilino.
                Deducirlo del nombre es justo lo que hace que se cuele. */}
            · lo paga {QUIEN_PAGA[concepto.paga]}
            {concepto.planDeMeses && concepto.planDeMeses.length > 0
              ? ` · en ${concepto.planDeMeses.length === 1 ? mesCorto(concepto.planDeMeses[0].mes) : `${concepto.planDeMeses.length} meses`}`
              : !concepto.recurrente
                ? ' · una sola vez'
                : ''}
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

      {concepto.planDeMeses && concepto.planDeMeses.length > 1 ? (
        <p className="mt-1 text-caption text-muted-foreground" data-testid={`plan-${concepto.id}`}>
          {concepto.planDeMeses.map((p) => `${mesCorto(p.mes)} ${formatCurrency(p.valorCop)}`).join(' · ')}
        </p>
      ) : null}

      {abierto ? (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          {!uso ? (
            <p className="flex items-start gap-1.5 text-caption text-warning">
              <Warning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              No se puede liquidar: falta el uso del inmueble, que es lo que
              decide si hay IVA. Defínelo arriba, en Administración.
            </p>
          ) : liquidacion ? (
            <>
              {liquidacion.renglones.map((r) => (
                <div key={r.concepto} className="flex justify-between text-caption">
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
              <div className="flex justify-between border-t border-border pt-1.5 text-caption font-medium">
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
              {esSupuesto(concepto, perfiles) ? (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Alguna de las dos partes no tiene el perfil tributario
                  configurado: para esos campos se usa el valor por defecto de
                  su tipo de persona.
                </p>
              ) : null}
            </>
          ) : null}
          {/*
            17-09: qué entra en la base de la comisión de administración.
            QA-CONT-95 r3 (E-13): FUERA de la liquidación. Que un concepto se
            comisione no depende del uso del inmueble; sin el uso (contratos
            migrados) el interruptor no aparecía y no había cómo marcarlo.
          */}
          <div className="pt-1">
            <ComisionableDelConcepto
              contractId={contract.id}
              concepto={concepto}
              puedeEditar={puedeEditar}
            />
          </div>
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

/**
 * El perfil tributario de una de las partes del concepto.
 *
 * Un TERCERO —la copropiedad, la DIAN— no es parte del contrato y no tenemos
 * su perfil. Se trata como persona natural sin retenciones: es el lado que no
 * inventa un descuento que después nadie puede consignar.
 */
function perfilDeParte(
  parte: Parte,
  perfiles: PerfilesDelContrato | null,
): ReturnType<typeof perfilPorDefecto> {
  const sinLaMarca = (p: PerfilTributario) => ({
    tipoPersona: p.tipoPersona,
    responsableIva: p.responsableIva,
    agenteRetenedorRenta: p.agenteRetenedorRenta,
    agenteRetenedorIva: p.agenteRetenedorIva,
    agenteRetenedorIca: p.agenteRetenedorIca,
  })

  if (!perfiles) {
    return perfilPorDefecto(parte === 'INMOBILIARIA' ? 'JURIDICA' : 'NATURAL')
  }

  switch (parte) {
    case 'INQUILINO':
      return sinLaMarca(perfiles.inquilino)
    case 'PROPIETARIO':
      return sinLaMarca(perfiles.propietario)
    case 'INMOBILIARIA':
      return sinLaMarca(perfiles.inmobiliaria)
    default:
      return perfilPorDefecto('NATURAL')
  }
}

/** Si alguna de las dos partes del concepto tiene el perfil sin configurar. */
function esSupuesto(
  concepto: { paga: Parte; recibe: Parte },
  perfiles: PerfilesDelContrato | null,
): boolean {
  if (!perfiles) return true
  const porDefecto = (parte: Parte): boolean => {
    switch (parte) {
      case 'INQUILINO':
        return perfiles.inquilino.esPorDefecto
      case 'PROPIETARIO':
        return perfiles.propietario.esPorDefecto
      case 'INMOBILIARIA':
        return perfiles.inmobiliaria.esPorDefecto
      default:
        // De un tercero nunca vamos a tener el perfil: no es parte del contrato.
        return true
    }
  }
  return porDefecto(concepto.paga) || porDefecto(concepto.recibe)
}

const NOMBRE_DE_RENGLON: Record<string, string> = {
  IVA: 'IVA',
  RETENCION_RENTA: 'Retención en la fuente',
  RETE_IVA: 'ReteIVA',
  RETE_ICA: 'ReteICA',
}

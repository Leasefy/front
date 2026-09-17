'use client'

/**
 * «Nueva factura» — el mes que se emite, y hasta dónde se puede mirar.
 *
 * Nico (2026-09-12): «Facturar y que me arroje el listado completo de las
 * facturas que hay por generar, NO QUE ME PONGA A ESCOGER UNA… Una vez
 * seleccione el mes, debe separar por facturas de propietarios y facturas de
 * inquilinos pero debe arrojar el listado completo de las facturas que puedo
 * generar para ese mes.»
 *
 * Por eso acá no hay ningún buscador de contrato ni ningún «elegir uno»: se
 * elige el MES y el back responde las dos listas completas
 * (`GET /inmobiliaria/facturacion/por-generar`). Lo único que la persona hace
 * es desmarcar lo que no quiere y apretar «Generar N facturas».
 *
 * ── 🔴 Cada fila SALE de la cuota del contrato ──────────────────────────────
 *
 * La deuda nace con el contrato y vive en `contrato_cuotas`, diferida por mes:
 * esa fila ES la factura de ese mes, con su canon, su prorrateo, su IVA y sus
 * retenciones ya calculados el día que se firmó. La pantalla no recalcula nada
 * y el back tampoco — es la misma plata que el cliente ve en su estado de
 * cuenta, que es lo único que hace defendible una factura frente a un reclamo.
 *
 * ── Mirar hasta diciembre, emitir mes a mes ─────────────────────────────────
 *
 * El CEO (2026-09-13): «Si quiero mirar qué facturas tengo por generar hasta el
 * 31 de diciembre… Lo que NO se puede es enviarlas [antes de tiempo].» El
 * selector «Ver hasta» estira la consulta; las casillas y el botón siguen siendo
 * SÓLO del mes elegido, y una fila de un mes que no empezó viene con
 * `emitible: false` y su motivo — el back devuelve 400 si se intenta igual.
 *
 * ── Lo que la pantalla dice en voz alta ─────────────────────────────────────
 *
 * Las ya emitidas NO se esconden: se muestran con su número y sin casilla. Una
 * lista que sólo trae lo pendiente no deja verificar que el mes esté completo,
 * que es justamente lo que la persona de facturación necesita saber.
 *
 * Cada fila muestra su BASE, su IVA, lo que el cliente RETIENE y el TOTAL.
 * 🔴 La retención no baja el total: baja el neto, porque la practica quien
 * recibe la factura al pagar. Una fila cuya cuota se generó sin escenario
 * confirmado sale sin impuestos y se marca «sin confirmar». Y los `avisos` de la
 * fila se muestran: la plata que no se puede facturar se dice, no se pierde en
 * silencio.
 *
 * ── 🔴 El interés de mora, y de dónde salió ────────────────────────────────
 *
 * Nico: «el interés sí se va cargando a la factura cada vez que se genera.» Una
 * cuota en cartera lleva su recargo, y la fila dice con qué autoridad: **del
 * cobro** (finanzas ya lo liquidó, el número está escrito y no se mueve) o
 * **sobre la cuota** (el mismo motor de mora corriendo hoy, porque ningún cobro
 * reclamó ese mes — el caso normal). El segundo CRECE cada día hasta que la
 * factura se emita, y por eso no se puede pintar igual que el primero.
 *
 * Y el número: sale de la RESOLUCIÓN de la DIAN. Sin resolución vigente el back
 * no emite, así que el botón se apaga y la pantalla dice por qué y a dónde ir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Info, Receipt, SealWarning, Warning } from '@phosphor-icons/react'
import { BarraDeTrabajo } from '@/components/migracion/BarraDeTrabajo'
import {
  generarPorTandas,
  type ProgresoDeFacturas,
  type ResultadoDeLaCorrida,
} from './facturasPorTandas'
import { InformeDeFacturacion, mensajeDelFalloDeEmision } from './InformeDeFacturacion'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/format'
import {
  facturacionPorMesService,
  fechaLegible,
  mesActual,
  mesLegible,
  mesesParaElegir,
  type FacturaDelMes,
  type FacturasPorGenerar,
} from '@/lib/api/facturacion-por-mes.service'
import { PrefacturasDelRango, finDeAnio } from './PrefacturasDelRango'

/** Lo que se lee de un renglón cuando la fila resume sus conceptos. */
function conceptosLegibles(factura: FacturaDelMes): string {
  const nombres = factura.lineas
    .filter((l) => !l.resta)
    .map((l) => l.nombre)
  if (nombres.length === 0) return '—'
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
}

/** El recargo de mora que lleva la fila. `0` si no lleva. */
function moraDe(factura: FacturaDelMes): number {
  return factura.mora?.recargosCop ?? 0
}

/**
 * 🔴 EL INTERÉS DE MORA, CON SU ORIGEN.
 *
 * Nico: «el interés sí se va cargando a la factura cada vez que se genera.»
 *
 * Que la fila diga de DÓNDE salió el número no es un detalle: `Del cobro` es un
 * valor que finanzas ya liquidó y quedó escrito, así que no se mueve; `Sobre la
 * cuota` es el mismo motor de mora corriendo HOY sobre una deuda que ningún
 * cobro reclamó, y por lo tanto CRECE cada día hasta que se emita. Quien mira
 * la pantalla decide distinto según cuál de las dos sea.
 */
function InteresDeMora({ factura }: { factura: FacturaDelMes }) {
  const mora = factura.mora
  if (!mora || mora.recargosCop <= 0) return null
  const delCobro = mora.origen === 'COBRO'
  return (
    <p
      className="truncate text-caption text-fg-muted"
      data-testid={`mora-${factura.clave}`}
      title={
        delCobro
          ? 'Lo liquidó el cobro de ese mes: es un valor ya escrito y no se mueve.'
          : 'Lo calcula el motor de mora sobre la cuota, con las reglas de esta inmobiliaria. Crece cada día hasta que la factura se emita.'
      }
    >
      Mora {formatCurrency(mora.recargosCop)} · {mora.diasDeMora}{' '}
      {mora.diasDeMora === 1 ? 'día' : 'días'} ·{' '}
      <span className={delCobro ? 'text-fg-subtle' : 'text-warning'}>
        {delCobro ? 'del cobro' : 'sobre la cuota'}
      </span>
    </p>
  )
}

/**
 * 🔴 «Impuestos sin confirmar»: esta factura sale SIN impuestos porque el
 * escenario tributario del contrato está DEDUCIDO o falta un dato. El motivo va
 * en el `title`, con las palabras que da el back — nunca se factura un impuesto
 * deducido, y esa decisión tiene que poder leerse sin salir de la tabla.
 */
function ImpuestosSinConfirmar({ factura }: { factura: FacturaDelMes }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-caption text-warning"
      title={
        factura.notasTributarias.join(' ') ||
        'Falta confirmar el escenario tributario del contrato.'
      }
      data-testid={`sin-confirmar-${factura.clave}`}
    >
      <SealWarning className="h-3.5 w-3.5" weight="fill" />
      Sin confirmar
    </span>
  )
}

interface TablaProps {
  titulo: string
  descripcion: string
  filas: FacturaDelMes[]
  seleccion: Set<string>
  onAlternarUna: (clave: string) => void
  onAlternarTodas: (claves: string[]) => void
  ocupado: boolean
  testid: string
}

function TablaDeFacturas({
  titulo,
  descripcion,
  filas,
  seleccion,
  onAlternarUna,
  onAlternarTodas,
  ocupado,
  testid,
}: TablaProps) {
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, { resetKey: testid + filas.length })

  /*
   * 🔴 Sólo lo que HOY se puede emitir entra a la selección. Una fila de un mes
   * que todavía no empieza se ve y no se marca: el back la rechazaría con un
   * 400, y una casilla que produce un error no es una opción, es una trampa.
   */
  const porEmitir = useMemo(
    () =>
      filas
        .filter((f) => (f.estado === 'POR_EMITIR' || f.estado === 'GENERADA') && f.emitible)
        .map((f) => f.clave),
    [filas],
  )
  const sinConfirmar = filas.filter((f) => f.impuestosSinConfirmar).length
  // 🔴 La mora se totaliza aparte: es plata que la factura suma por encima de la
  // cuota, y hasta la segunda vuelta de facturación NO se estaba cobrando.
  const conMora = filas.filter((f) => moraDe(f) > 0)
  const moraCop = conMora.reduce((s, f) => s + moraDe(f), 0)
  const elegidas = porEmitir.filter((c) => seleccion.has(c))
  const todas = porEmitir.length > 0 && elegidas.length === porEmitir.length
  const algunas = elegidas.length > 0 && !todas

  return (
    <section
      className="rounded-lg border border-border bg-surface overflow-hidden"
      data-testid={`facturacion-${testid}`}
    >
      <div className="border-b border-border p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-body font-semibold text-fg">{titulo}</h3>
          <p className="text-caption text-fg-muted">{descripcion}</p>
        </div>
        <div className="text-caption text-fg-muted tabular-nums sm:text-right">
          <p className="whitespace-nowrap">
            {total} {total === 1 ? 'factura' : 'facturas'} ·{' '}
            {formatCurrency(filas.reduce((s, f) => s + f.totalCop, 0))}
          </p>
          <p className="whitespace-nowrap">
            IVA {formatCurrency(filas.reduce((s, f) => s + f.ivaCop, 0))} ·
            retenciones{' '}
            {formatCurrency(filas.reduce((s, f) => s + f.retencionesCop, 0))}
            {sinConfirmar > 0 && ` · ${sinConfirmar} sin confirmar`}
          </p>
          {conMora.length > 0 && (
            /* «Recargos», no «interés»: `recargosCop` suma el interés de mora
               Y el gasto administrativo. En la agencia de QA (16-09) eran
               $34.150.917: $1.360.917 de interés y $32.790.000 del gasto del
               10 % sobre el canon. Rotulado «Interés de mora», el número era
               25 veces el interés de verdad. */
            <p
              className="whitespace-nowrap"
              data-testid={`facturacion-${testid}-mora`}
              title="Interés de mora y gasto administrativo, según las reglas de mora de la inmobiliaria."
            >
              Recargos de mora {formatCurrency(moraCop)} en {conMora.length}{' '}
              {conMora.length === 1 ? 'factura' : 'facturas'}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={todas}
                  indeterminate={algunas}
                  disabled={ocupado || porEmitir.length === 0}
                  onCheckedChange={() => onAlternarTodas(porEmitir)}
                  aria-label={`Seleccionar todas las facturas de ${titulo.toLowerCase()}`}
                  data-testid={`facturacion-${testid}-todas`}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Contrato</TableHead>
              <TableHead className="whitespace-nowrap">Tercero</TableHead>
              <TableHead className="whitespace-nowrap">Inmueble</TableHead>
              <TableHead className="whitespace-nowrap">Concepto</TableHead>
              <TableHead className="whitespace-nowrap text-right">Base</TableHead>
              <TableHead className="whitespace-nowrap text-right">IVA</TableHead>
              {/* La retención NO se resta del total: la practica quien recibe
                  la factura al pagar. Por eso está en su propia columna y no
                  metida en el total. */}
              <TableHead className="whitespace-nowrap text-right">Retenciones</TableHead>
              <TableHead className="whitespace-nowrap text-right">Total</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-0">
                  <SinDatos
                    queSon={`facturas de ${titulo.toLowerCase()} este mes`}
                    icono={Receipt}
                    descripcion={descripcion}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((factura) => {
                const emitida = factura.estado === 'EMITIDA'
                const bloqueada = !emitida && !factura.emitible
                return (
                  <TableRow
                    key={factura.clave}
                    data-testid={`factura-${factura.clave}`}
                    className={emitida || bloqueada ? 'opacity-70' : undefined}
                  >
                    <TableCell className="w-10">
                      <Checkbox
                        checked={
                          !emitida && factura.emitible && seleccion.has(factura.clave)
                        }
                        disabled={emitida || bloqueada || ocupado}
                        onCheckedChange={() => onAlternarUna(factura.clave)}
                        aria-label={
                          emitida
                            ? 'Ya emitida'
                            : bloqueada
                              ? (factura.motivoNoEmitible ??
                                'Todavía no se puede emitir')
                              : `Seleccionar la factura de ${factura.terceroNombre}`
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {/* El número que la inmobiliaria conoce es el suyo (el
                          Nui), no nuestro consecutivo. Se muestran los dos
                          diciendo cuál es cuál. */}
                      <span className="font-medium text-fg">
                        {factura.numeroExterno ?? `#${factura.codigo ?? '—'}`}
                      </span>
                      {factura.numeroExterno && factura.codigo !== null && (
                        <span className="text-fg-muted"> · Leasefy #{factura.codigo}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-fg">{factura.terceroNombre}</p>
                      {factura.terceroDocumento && (
                        <p className="truncate text-caption text-fg-muted tabular-nums">
                          {factura.terceroDocumento}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-fg-muted">{factura.inmueble}</p>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate text-fg-muted">
                        {conceptosLegibles(factura)}
                      </p>
                      <p className="truncate text-caption text-fg-muted">
                        {factura.diasFacturados === factura.diasDelMes
                          ? 'Mes completo'
                          : `${factura.diasFacturados} de ${factura.diasDelMes} días`}
                      </p>
                      {factura.deduccionAlEgresoCop > 0 && (
                        <p className="truncate text-caption text-fg-muted">
                          {formatCurrency(factura.deduccionAlEgresoCop)} van a
                          deducción del egreso, no a la factura
                        </p>
                      )}
                      <InteresDeMora factura={factura} />
                      {/* 🔴 Lo que esta factura NO lleva y alguien tiene que
                          saber: el interés de una cuota en mora que ningún cobro
                          liquidó, o un desglose que hubo que cuadrar contra el
                          estado de cuenta. Se dice acá porque perder plata en
                          silencio es peor que una línea de más. */}
                      {factura.avisos.length > 0 && (
                        <p
                          className="flex items-start gap-1 text-caption text-warning"
                          title={factura.avisos.join(' ')}
                          data-testid={`aviso-${factura.clave}`}
                        >
                          <Warning
                            className="mt-0.5 h-3 w-3 flex-shrink-0"
                            weight="fill"
                          />
                          <span className="line-clamp-2">
                            {factura.avisos.join(' ')}
                          </span>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {formatCurrency(factura.baseCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {/* 🔴 Un cero y un «sin confirmar» no son lo mismo, y la
                          columna tiene que distinguirlos: la factura sin IVA
                          por escenario confirmado dice «—»; la que no lo pudo
                          calcular lleva la marca. */}
                      {factura.ivaCop > 0 ? (
                        formatCurrency(factura.ivaCop)
                      ) : factura.impuestosSinConfirmar ? (
                        <ImpuestosSinConfirmar factura={factura} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {factura.retencionesCop > 0
                        ? `−${formatCurrency(factura.retencionesCop)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums font-medium text-fg">
                      {formatCurrency(factura.totalCop)}
                      {factura.retencionesCop > 0 && (
                        <p className="text-caption font-normal text-fg-muted">
                          Neto {formatCurrency(factura.netoCop)}
                        </p>
                      )}
                      {factura.ivaCop > 0 &&
                        factura.impuestosSinConfirmar === false &&
                        factura.escenario && (
                          <p className="text-caption font-normal text-fg-muted">
                            {factura.escenario.codigo}
                          </p>
                        )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {emitida ? (
                        <span className="text-caption text-fg-muted">
                          {/* El número que vale ante la DIAN es el autorizado
                              por la resolución; el consecutivo interno queda
                              debajo, para poder cruzarlo. */}
                          {factura.numeroDian ?? `N° ${factura.numero}`}
                          {factura.numeroDian && (
                            <span className="block">
                              interna N° {factura.numero}
                            </span>
                          )}
                        </span>
                      ) : bloqueada ? (
                        /* 🔴 MOSTRAR NO ES EMITIR. El motivo va en el `title` con
                           las palabras del back: «Diciembre de 2026 todavía no
                           empieza…». Una casilla apagada sin explicación es cómo
                           alguien concluye que el sistema está roto. */
                        <span
                          className="text-caption text-fg-subtle"
                          title={factura.motivoNoEmitible ?? undefined}
                          data-testid={`todavia-no-${factura.clave}`}
                        >
                          Todavía no
                        </span>
                      ) : (
                        <span className="text-caption text-primary">Por emitir</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </section>
  )
}

export function NuevaFactura() {
  const [mes, setMes] = useState(() => mesActual())
  /**
   * Hasta dónde MIRAR. Arranca en el mes elegido —que es el trabajo diario— y
   * el botón de al lado lo estira al 31 de diciembre, que es la pregunta del
   * CEO. Arrancar en diciembre le cobraría a todos los días una consulta que se
   * usa de vez en cuando.
   */
  const [hasta, setHasta] = useState(() => mesActual())
  const [datos, setDatos] = useState<FacturasPorGenerar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [generando, setGenerando] = useState(false)

  const meses = useMemo(() => mesesParaElegir(), [])

  const cargar = useCallback(async (elMes: string, elTope: string) => {
    setCargando(true)
    setError(null)
    try {
      const r = await facturacionPorMesService.porGenerar({
        desde: elMes,
        // Un tope anterior al mes elegido sería un rango al revés (400 del
        // back): se pide el mes solo, que es lo que la persona quiso decir.
        hasta: elTope && elTope >= elMes ? elTope : elMes,
      })
      setDatos(r)
      /*
       * Arranca seleccionado todo lo que se puede emitir HOY y es DEL MES
       * elegido: el pedido es facturar el mes, no ir marcando 800 casillas.
       * Los meses de más adelante se miran, no se marcan.
       */
      setSeleccion(
        new Set(
          [...r.inquilinos, ...r.propietarios]
            .filter(
              (f) =>
                f.mes === elMes && (f.estado === 'POR_EMITIR' || f.estado === 'GENERADA') && f.emitible,
            )
            .map((f) => f.clave),
        ),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(mes, hasta)
  }, [cargar, mes, hasta])

  const alternarUna = (clave: string) => {
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })
  }

  const alternarTodas = (claves: string[]) => {
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (claves.every((c) => siguiente.has(c))) {
        for (const c of claves) siguiente.delete(c)
      } else {
        for (const c of claves) siguiente.add(c)
      }
      return siguiente
    })
  }

  /**
   * Las filas DEL MES elegido: son las que llevan casilla y las que se emiten.
   * Los meses de más adelante viven en `PrefacturasDelRango`, sin casillas.
   */
  const delMes = useMemo(() => {
    if (!datos) return { inquilinos: [], propietarios: [] }
    return {
      inquilinos: datos.inquilinos.filter((f) => f.mes === mes),
      propietarios: datos.propietarios.filter((f) => f.mes === mes),
    }
  }, [datos, mes])

  const elegidas = useMemo(() => [...seleccion], [seleccion])
  const totalElegido = useMemo(() => {
    if (!datos) return 0
    return [...datos.inquilinos, ...datos.propietarios]
      .filter(
        (f) => seleccion.has(f.clave) && (f.estado === 'POR_EMITIR' || f.estado === 'GENERADA') && f.emitible,
      )
      .reduce((s, f) => s + f.totalCop, 0)
  }, [datos, seleccion])

  /*
   * F3 (auditoría 13-09): la corrida va en tandas de 200 con progreso real y
   * «Detener». F2: al terminar —entera, detenida o caída a mitad— queda un
   * informe con lo que salió y lo que no, hasta que se cierre o se cambie de
   * mes. Antes una tanda caída decía «No se pudieron emitir las facturas»
   * sobre las que sí habían salido.
   */
  const [progreso, setProgreso] = useState<ProgresoDeFacturas | null>(null)
  const [deteniendo, setDeteniendo] = useState(false)
  const detenerRef = useRef(false)
  const [corridaHecha, setCorridaHecha] = useState<ResultadoDeLaCorrida | null>(null)

  useEffect(() => {
    // El informe es de UN mes: con otro mes elegido se leería como de éste.
    setCorridaHecha(null)
  }, [mes])

  async function generar() {
    if (elegidas.length === 0 || generando) return
    const claves = [...elegidas]
    setGenerando(true)
    setCorridaHecha(null)
    detenerRef.current = false
    setDeteniendo(false)
    setProgreso({ hechas: 0, total: claves.length, tanda: 0, tandas: 0 })
    try {
      const resultado = await generarPorTandas(
        mes,
        claves,
        (elMes, lote) => facturacionPorMesService.generar(elMes, lote),
        setProgreso,
        { debeParar: () => detenerRef.current },
      )
      const { informe, corte } = resultado
      setCorridaHecha(resultado)

      if (informe.emitidas > 0 || informe.yaEstaban > 0) {
        const partes = [
          `${informe.emitidas} ${informe.emitidas === 1 ? 'factura emitida' : 'facturas emitidas'}`,
          formatCurrency(informe.totalCop),
        ]
        if (informe.yaEstaban > 0) partes.push(`${informe.yaEstaban} ya estaban emitidas`)
        toast.success(partes.join(' · '))
      }
      // El rango de la resolución no alcanzó para todas: se emitió lo que cabía
      // y lo demás NO se numeró. Es un aviso aparte, no un renglón del éxito.
      if (informe.sinNumero > 0 && informe.motivos[0]) toast.error(informe.motivos[0])
      if (corte === 'fallo') toast.error(mensajeDelFalloDeEmision(resultado.error))

      // Lo que salió tiene que verse como emitido, también después de un
      // corte: y lo que quedó por emitir vuelve seleccionado para reintentar.
      await cargar(mes, hasta)
    } finally {
      setGenerando(false)
      setProgreso(null)
      setDeteniendo(false)
    }
  }

  const detenerCorrida = () => {
    detenerRef.current = true
    setDeteniendo(true)
  }

  const vacio =
    datos !== null &&
    delMes.inquilinos.length === 0 &&
    delMes.propietarios.length === 0

  return (
    <div className="space-y-4">
      {/* 🔴 La resolución de la DIAN manda: sin una vigente el back no emite
          nada, así que la pantalla lo dice ANTES de que alguien seleccione
          ochocientas filas y apriete un botón que va a fallar. El texto es el
          del back, con el motivo exacto (no cargada, vencida, anulada, rango
          agotado): cada uno se arregla distinto. */}
      {datos && !datos.resolucion.puedeNumerar && (
        <div
          className="rounded-lg bg-warning-soft border border-warning/30 p-3 flex items-start gap-2.5"
          data-testid="facturacion-sin-resolucion"
        >
          <SealWarning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">
            {datos.resolucion.explicacion ??
              'No hay una resolución de facturación vigente con la cual numerar.'}
          </p>
        </div>
      )}

      {/* Lo que esta pantalla todavía NO hace. Se dice, no se deja adivinar. */}
      <div className="rounded-lg bg-surface-muted border border-border p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" weight="fill" />
        <p className="text-caption text-fg-muted">
          Cada factura sale de la cuota del contrato: el mismo canon, el mismo
          prorrateo y los mismos impuestos que el cliente ve en su estado de
          cuenta. Una cuota que se generó sin escenario tributario confirmado se
          factura SIN impuestos y se marca «sin confirmar»: nunca se factura un
          impuesto que nadie confirmó. La factura se numera con la resolución
          vigente de la DIAN, pero todavía no se transmite electrónicamente (sin
          CUFE ni validación): eso necesita el proveedor tecnológico de la
          inmobiliaria.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="facturacion-mes"
              className="text-caption font-medium text-fg"
            >
              Mes de facturación
            </label>
            <Select
              value={mes}
              onValueChange={(m) => {
                setMes(m)
                // El tope nunca puede quedar antes del mes elegido: sería un
                // rango al revés y el back lo rechaza.
                setHasta((h) => (h && h >= m ? h : m))
              }}
            >
              <SelectTrigger
                id="facturacion-mes"
                className="w-56"
                data-testid="facturacion-selector-mes"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m} value={m}>
                    {mesLegible(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔴 «Ver hasta» es MIRAR, no emitir. El CEO (13-09): «Si quiero
              mirar qué facturas tengo por generar hasta el 31 de diciembre…
              Lo que NO se puede es enviarlas [antes de tiempo].» Por eso
              estira la consulta y no toca ni las casillas ni el botón. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="facturacion-hasta"
              className="text-caption font-medium text-fg"
            >
              Ver hasta
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="facturacion-hasta"
                type="month"
                className="w-40 tabular-nums"
                min={mes}
                value={hasta}
                onChange={(e) => setHasta(e.target.value || mes)}
                data-testid="facturacion-hasta"
              />
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => setHasta(finDeAnio().slice(0, 7))}
                data-testid="facturacion-hasta-fin-de-anio"
              >
                Hasta diciembre
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          {datos && (
            <p className="text-caption text-fg-muted tabular-nums">
              {datos.totales.contratos}{' '}
              {datos.totales.contratos === 1 ? 'contrato' : 'contratos'} ·{' '}
              {datos.totales.meses === 1
                ? mesLegible(mes)
                : `${datos.totales.meses} meses hasta ${mesLegible(datos.hasta)}`}
              {elegidas.length > 0 && ` · ${formatCurrency(totalElegido)} seleccionados`}
            </p>
          )}
          {datos?.resolucion.puedeNumerar && (
            <p
              className="text-caption text-fg-muted tabular-nums"
              data-testid="facturacion-siguiente-numero"
            >
              Resolución {datos.resolucion.numero} · sigue el{' '}
              {datos.resolucion.siguiente} · {datos.resolucion.disponibles}{' '}
              números disponibles hasta el{' '}
              {fechaLegible(datos.resolucion.vigenteHasta)}
            </p>
          )}
          <Button
            hideArrow
            disabled={
              elegidas.length === 0 ||
              generando ||
              cargando ||
              // 🔴 Sin resolución vigente el back devuelve 400: apagar el botón
              // dice lo mismo sin hacer perder la selección.
              (datos !== null && !datos.resolucion.puedeNumerar)
            }
            onClick={() => void generar()}
            data-testid="facturacion-generar"
          >
            {generando ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Receipt className="h-4 w-4" weight="bold" />
            )}
            {generando
              ? progreso
                ? `Emitiendo ${progreso.hechas.toLocaleString('es-CO')} de ${progreso.total.toLocaleString('es-CO')}…`
                : 'Generando…'
              : `Generar ${elegidas.length} ${elegidas.length === 1 ? 'factura' : 'facturas'}`}
          </Button>
        </div>
      </div>

      {/* F3: la ranura viva de la corrida — en qué va, cuánto falta y cómo
          salir. Un spinner sin número sobre 3.824 facturas eran minutos sin
          saber si seguía. */}
      {generando && progreso && (
        <div
          className="rounded-lg border border-border bg-surface p-4"
          data-testid="facturacion-en-curso"
        >
          <BarraDeTrabajo
            testid="facturacion"
            titulo="Emitiendo las facturas"
            hechas={progreso.hechas}
            total={progreso.total}
            onDetener={detenerCorrida}
            deteniendo={deteniendo}
            nota={`${
              progreso.tandas > 1 ? `Tanda ${progreso.tanda} de ${progreso.tandas}. ` : ''
            }Si detienes, termina la tanda en curso; volver a apretar «Generar» no duplica las que ya salieron.`}
          />
        </div>
      )}

      {/* F2: lo que salió y lo que no, hasta que se cierre o cambie el mes. */}
      {corridaHecha && !generando && (
        <InformeDeFacturacion
          corrida={corridaHecha}
          onCerrar={() => setCorridaHecha(null)}
        />
      )}

      {/* 🔴 El rango sólo aparece cuando la persona lo pidió: con «Ver hasta»
          en el mismo mes, esta pantalla se ve exactamente como antes. Es la
          MISMA consulta mirada más lejos —la misma cuota, los mismos números—,
          pero sin casillas: emitir sigue siendo del mes de arriba. */}
      {datos && datos.meses.length > 1 && (
        <PrefacturasDelRango datos={datos} />
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={vacio}
        queEs="las facturas del mes"
        onReintentar={() => void cargar(mes, hasta)}
        cuandoVacio={
          <SinDatos
            queSon={`facturas por generar en ${mesLegible(mes)}`}
            icono={Receipt}
            descripcion="Ningún contrato de la inmobiliaria cubre ese mes. Elige otro mes o revisa las fechas de los contratos."
          />
        }
      >
        {datos && (
          <div className="space-y-4">
            <TablaDeFacturas
              titulo="Inquilinos"
              descripcion="El canon del período y los conceptos que se le facturan al inquilino."
              filas={delMes.inquilinos}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid="inquilinos"
            />
            <TablaDeFacturas
              titulo="Propietarios"
              descripcion="La comisión de administración del mes. Lo que el propietario paga y no se factura va a deducción del egreso."
              filas={delMes.propietarios}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid="propietarios"
            />

            {/* Los contratos que tocan el mes y NO generan factura. Sin esto,
                la diferencia entre «735 contratos» y «730 facturas» no tiene
                explicación en ninguna parte. */}
            {datos.omitidos.length > 0 && (
              <details
                className="rounded-lg border border-border bg-surface p-4"
                data-testid="facturacion-omitidos"
              >
                <summary className="cursor-pointer text-body-sm text-fg flex items-center gap-2">
                  <Warning className="h-4 w-4 text-fg-muted" weight="fill" />
                  {datos.omitidos.length}{' '}
                  {datos.omitidos.length === 1
                    ? 'cuota no genera factura'
                    : 'cuotas no generan factura'}
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {datos.omitidos.slice(0, 50).map((o) => (
                    <li
                      key={`${o.contractId}-${o.mes}-${o.destinatario}`}
                      className="text-caption text-fg-muted"
                    >
                      {/* El número que la inmobiliaria conoce, y el nuestro rotulado. */}
                      <span className="tabular-nums">
                        {o.numeroExterno ?? `#${o.codigo ?? '—'}`}
                        {o.numeroExterno && o.codigo !== null && ` · Leasefy #${o.codigo}`}
                      </span>{' '}
                      · {o.inmueble} · {mesLegible(o.mes)} ·{' '}
                      {o.destinatario === 'INQUILINO' ? 'inquilino' : 'propietario'}:{' '}
                      {o.motivo}
                    </li>
                  ))}
                  {datos.omitidos.length > 50 && (
                    <li className="text-caption text-fg-muted">
                      …y {datos.omitidos.length - 50} más.
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}
      </EstadoDeDatos>
    </div>
  )
}

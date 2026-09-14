'use client'

/**
 * «Nueva factura» — el mes, y todo lo que hay que facturar ese mes.
 *
 * Nico (2026-09-12): «Facturar y que me arroje el listado completo de las
 * facturas que hay por generar, NO QUE ME PONGA A ESCOGER UNA. En el módulo de
 * facturación debe tener la pestaña de nueva factura y permitir seleccionar
 * por mes de facturación. Una vez seleccione el mes, debe separar por facturas
 * de propietarios y facturas de inquilinos pero debe arrojar el listado
 * completo de las facturas que puedo generar para ese mes… El sistema ya debe
 * saber automáticamente si en septiembre tengo que facturar 800 contratos y
 * cuáles.»
 *
 * Por eso acá no hay ningún buscador de contrato ni ningún «elegir uno»: se
 * elige el MES y el back responde las dos listas completas
 * (`GET /inmobiliaria/facturacion/por-generar`). Lo único que la persona hace
 * es desmarcar lo que no quiere y apretar «Generar N facturas».
 *
 * ── Lo que la pantalla dice en voz alta ─────────────────────────────────────
 *
 * Las ya emitidas NO se esconden: se muestran con su número y sin casilla. Una
 * lista que sólo trae lo pendiente no deja verificar que el mes esté completo,
 * que es justamente lo que la persona de facturación necesita saber.
 *
 * Y lo tributario, que es el pedido del 12 a las 22:50: cada fila muestra su
 * BASE, su IVA, lo que el cliente RETIENE y el TOTAL. 🔴 La retención no baja
 * el total: baja el neto, porque la practica quien recibe la factura al pagar.
 * Una fila cuyo escenario está deducido o sin definir sale sin impuestos y se
 * marca «impuestos sin confirmar» — una factura sin IVA y una a la que se le
 * olvidó el IVA se ven exactamente igual sin esa marca.
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
import { PorGenerarHasta } from './PorGenerarHasta'

/** Lo que se lee de un renglón cuando la fila resume sus conceptos. */
function conceptosLegibles(factura: FacturaDelMes): string {
  const nombres = factura.lineas
    .filter((l) => !l.resta)
    .map((l) => l.nombre)
  if (nombres.length === 0) return '—'
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
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

  const porEmitir = useMemo(
    () => filas.filter((f) => f.estado === 'POR_EMITIR').map((f) => f.clave),
    [filas],
  )
  const sinConfirmar = filas.filter((f) => f.impuestosSinConfirmar).length
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
                return (
                  <TableRow
                    key={factura.clave}
                    data-testid={`factura-${factura.clave}`}
                    className={emitida ? 'opacity-70' : undefined}
                  >
                    <TableCell className="w-10">
                      <Checkbox
                        checked={!emitida && seleccion.has(factura.clave)}
                        disabled={emitida || ocupado}
                        onCheckedChange={() => onAlternarUna(factura.clave)}
                        aria-label={
                          emitida
                            ? 'Ya emitida'
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
  const [datos, setDatos] = useState<FacturasPorGenerar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [generando, setGenerando] = useState(false)

  const meses = useMemo(() => mesesParaElegir(), [])

  const cargar = useCallback(
    async (elMes: string) => {
      setCargando(true)
      setError(null)
      try {
        const r = await facturacionPorMesService.porGenerar(elMes)
        setDatos(r)
        // Todo lo que está por emitir arranca seleccionado: el pedido es
        // facturar el mes, no ir marcando 800 casillas. Desmarcar lo que
        // sobra es mucho menos trabajo que marcar lo que falta.
        setSeleccion(
          new Set(
            [...r.inquilinos, ...r.propietarios]
              .filter((f) => f.estado === 'POR_EMITIR')
              .map((f) => f.clave),
          ),
        )
      } catch (e) {
        setError(e)
        setDatos(null)
      } finally {
        setCargando(false)
      }
    },
    [],
  )

  useEffect(() => {
    void cargar(mes)
  }, [cargar, mes])

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

  const elegidas = useMemo(() => [...seleccion], [seleccion])
  const totalElegido = useMemo(() => {
    if (!datos) return 0
    return [...datos.inquilinos, ...datos.propietarios]
      .filter((f) => seleccion.has(f.clave) && f.estado === 'POR_EMITIR')
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
      await cargar(mes)
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
    datos.inquilinos.length === 0 &&
    datos.propietarios.length === 0

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
          Los montos salen del contrato y los impuestos del escenario tributario
          de cada uno. Un contrato cuyo escenario está deducido o sin confirmar
          se factura SIN impuestos y se marca «sin confirmar»: nunca se factura
          un impuesto que nadie confirmó. La factura se numera con la resolución
          vigente de la DIAN, pero todavía no se transmite electrónicamente (sin
          CUFE ni validación): eso necesita el proveedor tecnológico de la
          inmobiliaria.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="facturacion-mes"
            className="text-caption font-medium text-fg"
          >
            Mes de facturación
          </label>
          <Select value={mes} onValueChange={setMes}>
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

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          {datos && (
            <p className="text-caption text-fg-muted tabular-nums">
              {datos.totales.contratosDelMes}{' '}
              {datos.totales.contratosDelMes === 1 ? 'contrato toca' : 'contratos tocan'}{' '}
              {mesLegible(mes)}
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

      {/* 🔴 «Ver por generar hasta <fecha>» va acá, pegado al selector de mes,
          porque es la MISMA pregunta mirada más lejos — pero es una consulta,
          no una emisión. CEO (2026-09-13): «Lo que NO se puede es enviarlas
          todas en un solo mes.» Por eso el botón «Generar» de arriba sigue
          siendo por mes y este bloque no tiene ninguno. */}
      <PorGenerarHasta />

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={vacio}
        queEs="las facturas del mes"
        onReintentar={() => void cargar(mes)}
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
              filas={datos.inquilinos}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid="inquilinos"
            />
            <TablaDeFacturas
              titulo="Propietarios"
              descripcion="La comisión de administración del mes. Lo que el propietario paga y no se factura va a deducción del egreso."
              filas={datos.propietarios}
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
                  {datos.omitidos.length} contratos del mes no generan factura
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {datos.omitidos.slice(0, 50).map((o) => (
                    <li
                      key={`${o.contractId}-${o.destinatario}`}
                      className="text-caption text-fg-muted"
                    >
                      {/* El número que la inmobiliaria conoce, y el nuestro rotulado. */}
                      <span className="tabular-nums">
                        {o.numeroExterno ?? `#${o.codigo ?? '—'}`}
                        {o.numeroExterno && o.codigo !== null && ` · Leasefy #${o.codigo}`}
                      </span>{' '}
                      · {o.inmueble} ·{' '}
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

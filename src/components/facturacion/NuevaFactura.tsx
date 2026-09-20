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
 * Por eso el punto de partida es el MES: el back responde las dos listas
 * completas (`GET /inmobiliaria/facturacion/por-generar`) con todo marcado, y
 * lo normal es desmarcar lo que no va y apretar «Generar N facturas».
 *
 * ── 🔴 Y poder hacer UNA, sin dejar de tener la lista (Nico, 18-09 de noche) ─
 *
 * «Selecciono sólo una y no da el poder generar factura de sólo esa, y agrega
 * un buscador a la tabla.»
 *
 * No se contradice con lo de arriba, y la diferencia importa para no volver a
 * romper esto: el 12 rechazó una pantalla que OBLIGABA a elegir un contrato
 * para poder ver algo. La lista completa y premarcada se queda. Lo que
 * faltaba era poder **actuar sobre una sola fila** y poder **encontrarla**
 * entre 730. Tres cosas lo resuelven:
 *
 *   1. un **buscador dentro de la tabla** (contrato, tercero, documento,
 *      inmueble, concepto);
 *   2. **«Generar esta»** en la fila: una factura, un clic, sin tocar la
 *      selección de las otras 729;
 *   3. la casilla de la cabecera **limpia** cuando hay algo marcado, en vez de
 *      marcarlo todo. Estando en 726 de 730, apretarla subía a 730: para
 *      dejar una sola había que apretarla dos veces y adivinar el orden.
 *
 * 🔴 Y lo que de verdad lo bloqueaba: **el botón estaba apagado** porque la
 * inmobiliaria no tiene resolución de la DIAN para «Canon del inquilino». El
 * porqué vivía en un banner arriba de todo, a media pantalla del botón — o
 * sea, un control que no se mueve y no dice por qué, que se lee como roto.
 * Ahora el motivo y la salida («Cargar la resolución») están AL LADO del
 * botón, y cada «Generar esta» lo repite en su `title`.
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
import { Info, MagnifyingGlass, Receipt, SealWarning, Warning } from '@phosphor-icons/react'
import { BarraDeTrabajo } from '@/components/migracion/BarraDeTrabajo'
import {
  generarPorTandas,
  type ProgresoDeFacturas,
  type ResultadoDeLaCorrida,
} from './facturasPorTandas'
import { InformeDeFacturacion, mensajeDelFalloDeEmision } from './InformeDeFacturacion'

import { Button } from '@/components/ui/button'
import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
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
  /**
   * Emitir UNA fila, sin tocar la selección de las demás (Nico, 18-09:
   * «selecciono sólo una y no da el poder generar factura de sólo esa»).
   */
  onGenerarUna: (clave: string) => void
  /** Por qué no se puede emitir hoy (sin resolución de la DIAN). `null` = se puede. */
  motivoParaNoEmitir: string | null
}

/**
 * Lo que la búsqueda mira de una fila. Es lo que la persona tiene a mano
 * cuando quiere UNA factura: el número del contrato (el suyo y el nuestro),
 * el nombre o el documento del tercero, la dirección, y el concepto.
 */
function textoBuscableDe(f: FacturaDelMes): string {
  return [
    f.numeroExterno,
    f.codigo === null ? null : String(f.codigo),
    f.terceroNombre,
    f.terceroDocumento,
    f.inmueble,
    conceptosLegibles(f),
  ]
    .filter(Boolean)
    .join(' ')
}

/** Sin tildes y en minúsculas: nadie escribe «Ramírez» con tilde en un buscador. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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
  onGenerarUna,
  motivoParaNoEmitir,
}: TablaProps) {
  /*
   * 🔴 El buscador va DENTRO de la tabla (Nico, 18-09). Con 730 filas, querer
   * una factura y no poder llegar a su fila es lo mismo que no poder hacerla.
   * Es local y no toca la selección: buscar ESCONDE filas, nunca desmarca —
   * desmarcar 700 facturas sin querer, escribiendo en un campo, sería mucho
   * peor que no tener buscador.
   */
  const [busqueda, setBusqueda] = useState('')
  const visibles = useMemo(() => {
    const q = normalizar(busqueda)
    if (q === '') return filas
    return filas.filter((f) => normalizar(textoBuscableDe(f)).includes(q))
  }, [filas, busqueda])

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${testid}|${filas.length}|${busqueda}` })

  /*
   * 🔴 Sólo lo que HOY se puede emitir entra a la selección. Una fila de un mes
   * que todavía no empieza se ve y no se marca: el back la rechazaría con un
   * 400, y una casilla que produce un error no es una opción, es una trampa.
   */
  const porEmitir = useMemo(
    () =>
      visibles
        .filter((f) => (f.estado === 'POR_EMITIR' || f.estado === 'GENERADA') && f.emitible)
        .map((f) => f.clave),
    [visibles],
  )
  const sinConfirmar = filas.filter((f) => f.impuestosSinConfirmar).length
  // 🔴 La mora se totaliza aparte: es plata que la factura suma por encima de la
  // cuota, y hasta la segunda vuelta de facturación NO se estaba cobrando.
  const conMora = filas.filter((f) => moraDe(f) > 0)
  const moraCop = conMora.reduce((s, f) => s + moraDe(f), 0)
  /*
   * 🔴 19-09-2026 (Nico) · Una columna que dice «—» en TODAS sus filas es
   * ancho gastado en nada — y acá costaba caro: con IVA y Retenciones vacías
   * la tabla no cabía, «Total» quedaba tapado por la columna anclada y Nico
   * vio «TOT | ESTADO» partido al medio. Su palabra fue: «veo separadas cosas
   * que no deberían estar separadas».
   *
   * Las dos columnas aparecen sólo si ALGUNA fila tiene algo que poner. Lo que
   * no se pierde: los totales de IVA y retenciones siguen en el encabezado de
   * la sección, y la marca «sin confirmar» —que es por fila y sí importa— se
   * muda al lado de la base cuando la columna del IVA no está.
   */
  const hayIva = filas.some((f) => f.ivaCop > 0 || f.impuestosSinConfirmar)
  const hayRetenciones = filas.some((f) => f.retencionesCop > 0)

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
          {/* 🔴 Del MES entero, no de lo que el buscador dejó a la vista: el
              alcance de la búsqueda se dice al lado del buscador. Si estas
              cifras se movieran al escribir, nadie sabría cuál es el mes. */}
          <p className="whitespace-nowrap">
            {filas.length} {filas.length === 1 ? 'factura' : 'facturas'} ·{' '}
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

      {/* 🔴 El buscador, DENTRO de la tabla (Nico, 18-09). A su lado, cuántas
          filas quedaron a la vista: las cifras de arriba siguen siendo las del
          mes completo y los dos números tienen que poder conciliarse. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Contrato, tercero, documento, inmueble o concepto"
            aria-label={`Buscar en las facturas de ${titulo.toLowerCase()}`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid={`facturacion-${testid}-buscar`}
          />
        </div>
        <p
          className="text-caption text-fg-muted tabular-nums"
          data-testid={`facturacion-${testid}-alcance`}
        >
          {busqueda.trim() === '' ? (
            <>
              {filas.length} {filas.length === 1 ? 'factura' : 'facturas'} en el mes
            </>
          ) : (
            <>
              {visibles.length} de {filas.length} facturas.{' '}
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="font-medium text-primary underline-offset-4 hover:underline"
                data-testid={`facturacion-${testid}-limpiar-busqueda`}
              >
                Quitar la búsqueda
              </button>
            </>
          )}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                {/* 🔴 Con algo marcado, esta casilla LIMPIA (Nico, 18-09).
                    Antes, estando en 726 de 730, apretarla subía a 730: para
                    dejar una sola había que apretarla dos veces y adivinar el
                    orden. Con búsqueda puesta sólo toca lo que se ve, que es
                    lo que hace posible «marcar sólo estas». */}
                <Checkbox
                  checked={todas}
                  indeterminate={algunas}
                  disabled={ocupado || porEmitir.length === 0}
                  onCheckedChange={() => onAlternarTodas(porEmitir)}
                  aria-label={
                    elegidas.length > 0
                      ? `Quitar la selección de ${titulo.toLowerCase()}`
                      : `Seleccionar todas las facturas de ${titulo.toLowerCase()}`
                  }
                  data-testid={`facturacion-${testid}-todas`}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Contrato</TableHead>
              <TableHead className="whitespace-nowrap">Tercero</TableHead>
              <TableHead className="whitespace-nowrap">Inmueble</TableHead>
              <TableHead className="whitespace-nowrap">Concepto</TableHead>
              <TableHead className="whitespace-nowrap text-right">Base</TableHead>
              {hayIva && <TableHead className="whitespace-nowrap text-right">IVA</TableHead>}
              {/* La retención NO se resta del total: la practica quien recibe
                  la factura al pagar. Por eso está en su propia columna y no
                  metida en el total. */}
              {hayRetenciones && (
                <TableHead className="whitespace-nowrap text-right">Retenciones</TableHead>
              )}
              <TableHead className="whitespace-nowrap text-right">Total</TableHead>
              {/*
                🔴 19-09 (medido en el navegador, no deducido): esta tabla mide
                1.427 px dentro de un contenedor de 1.172, y «Estado» —donde
                vive el botón «Generar esta»— caía en left:1584 con una pantalla
                de 1512. O sea: **el botón de generar UNA factura, que es
                exactamente lo que pidió Nico, estaba fuera de la pantalla** y
                sólo aparecía si alguien adivinaba que la tabla se arrastra de
                lado. Se ancla a la derecha para que la acción de la fila esté
                siempre donde se la busca, se haya arrastrado o no.
              */}
              <TableHead className="sticky right-0 z-20 whitespace-nowrap border-l border-border bg-bg dark:bg-surface-muted">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8 + (hayIva ? 1 : 0) + (hayRetenciones ? 1 : 0)} className="p-0">
                  <SinDatos
                    hayFiltros={busqueda.trim() !== ''}
                    queSon={`facturas de ${titulo.toLowerCase()} este mes`}
                    icono={Receipt}
                    descripcion={descripcion}
                    onLimpiarFiltros={
                      busqueda.trim() !== '' ? () => setBusqueda('') : undefined
                    }
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
                    {/* 🔴 19-09: los anchos se midieron en el navegador. La
                        tabla daba 1.428 px en un contenedor de 1.172 y
                        sobraban 256, así que Retenciones y Total quedaban
                        fuera de vista. Tercero, Inmueble y Concepto son las
                        tres que crecen con el dato; se recortan, y el texto
                        entero queda en el `title` —truncar algo que después no
                        se puede leer es esconderlo. */}
                    <TableCell className="max-w-[160px]">
                      <p className="truncate text-fg" title={factura.terceroNombre}>
                        {factura.terceroNombre}
                      </p>
                      {factura.terceroDocumento && (
                        <p className="truncate text-caption text-fg-muted tabular-nums">
                          {factura.terceroDocumento}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <p className="truncate text-fg-muted" title={factura.inmueble}>
                        {factura.inmueble}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[190px]">
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
                      {/* Sin columna de IVA, la marca de «sin confirmar» vive
                          acá: es por fila y decide si esa factura sale con o
                          sin impuestos. No se puede perder. */}
                      {!hayIva && factura.impuestosSinConfirmar && (
                        <span className="mt-0.5 block font-sans">
                          <ImpuestosSinConfirmar factura={factura} />
                        </span>
                      )}
                    </TableCell>
                    {hayIva && (
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
                    )}
                    {hayRetenciones && (
                      <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                        {factura.retencionesCop > 0
                          ? `−${formatCurrency(factura.retencionesCop)}`
                          : '—'}
                      </TableCell>
                    )}
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
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-surface">
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
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-caption text-primary">Por emitir</span>
                          {/* 🔴 «Selecciono sólo una y no da el poder generar
                              factura de sólo esa» (Nico, 18-09). Una factura,
                              un clic, sin tocar la selección de las otras 729
                              ni obligar a limpiarla primero. Apagado dice por
                              qué: el mismo motivo del botón grande. */}
                          <Button
                            size="sm"
                            variant="outline"
                            hideArrow
                            disabled={ocupado || motivoParaNoEmitir !== null}
                            title={motivoParaNoEmitir ?? undefined}
                            onClick={() => onGenerarUna(factura.clave)}
                            data-testid={`generar-una-${factura.clave}`}
                          >
                            Generar esta
                          </Button>
                        </div>
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

export interface NuevaFacturaProps {
  /**
   * Llevar a la pestaña «Resolución». La pestaña es estado local de la página,
   * no una URL, así que se recibe como callback: sin esto, el aviso de «no hay
   * resolución» diría a dónde ir y no llevaría.
   */
  onIrAResolucion?: () => void
}

export function NuevaFactura({ onIrAResolucion }: NuevaFacturaProps = {}) {
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
  /**
   * 🔴 ¿La selección la pusimos nosotros o la puso la persona?
   *
   * Arranca en `true` porque al cargar el mes marcamos solas las facturas
   * emitibles. En cuanto toca una casilla pasa a `false` y ya no se vuelve a
   * prender hasta que se recargue el mes: a partir de ese clic la selección es
   * suya y llamarla «preseleccionamos» sería mentir.
   */
  const [seleccionSugerida, setSeleccionSugerida] = useState(true)
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
      setSeleccionSugerida(true)
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
    setSeleccionSugerida(false)
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })
  }

  /**
   * 🔴 Con ALGO marcado, limpia; sólo con nada marcado, marca todo.
   *
   * Antes la condición era «si están TODAS marcadas, quita»: estando en 726 de
   * 730 —el estado normal después de desmarcar cuatro— apretarla subía a 730,
   * y para dejar una sola había que apretarla dos veces y adivinar el orden.
   * Es media explicación de «selecciono sólo una y no da» (Nico, 18-09).
   *
   * `claves` son las filas VISIBLES de esa tabla: con el buscador puesto,
   * marcar toca sólo lo que se ve, que es lo que hace posible «sólo estas».
   */
  const alternarTodas = (claves: string[]) => {
    setSeleccionSugerida(false)
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (claves.some((c) => siguiente.has(c))) {
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

  /** La salida de la sugerencia, en un clic. */
  const quitarSeleccion = () => {
    setSeleccionSugerida(false)
    setSeleccion(new Set())
  }

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

  /**
   * Emite. Sin argumento, lo que esté seleccionado; con `soloEstas`, esas y
   * nada más —es el botón «Generar esta» de la fila (Nico, 18-09)—, que no
   * toca la selección de las demás ni obliga a limpiarla primero.
   */
  async function generar(soloEstas?: string[]) {
    const claves = soloEstas ?? [...elegidas]
    if (claves.length === 0 || generando) return
    if (motivoParaNoEmitir !== null) return
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

  /**
   * 🔴 Por qué HOY no se puede emitir nada, en las palabras del back.
   *
   * Sin resolución vigente el back devuelve 400, así que el botón se apaga
   * — y hasta el 18-09 se apagaba MUDO: el porqué vivía en un banner arriba
   * de todo, a media pantalla de distancia. Nico apretó, no pasó nada, y lo
   * leyó como «no da el poder generar». Un control que no se mueve y no dice
   * por qué se lee como roto: el motivo va al lado del control, y con la
   * salida puesta.
   */
  const motivoParaNoEmitir: string | null =
    datos !== null && !datos.resolucion.puedeNumerar
      ? (datos.resolucion.explicacion ??
        'No hay una resolución de facturación vigente con la cual numerar.')
      : null

  /*
   * 🔴 19-09 (visto en el navegador): el botón decía «Generar 208 facturas» y
   * justo encima, en la misma tarjeta, «50 números disponibles». La pantalla
   * tenía el dato y no sacaba la cuenta. Y no es un susto teórico: probado
   * contra datos reales el 19-09, el back numera las que alcanzan y las demás
   * fallan con «rango agotado» — o sea, apretar dejaba 50 facturas emitidas,
   * 158 errores y a alguien preguntándose qué pasó.
   *
   * Se AVISA, no se apaga: emitir las 50 que caben es trabajo legítimo, y
   * bloquear el botón obligaría a deseleccionar 158 filas a mano para hacerlo.
   */
  const numerosQueFaltan: number | null =
    datos !== null && datos.resolucion.puedeNumerar && elegidas.length > datos.resolucion.disponibles
      ? elegidas.length - datos.resolucion.disponibles
      : null

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
              'No hay una resolución de facturación vigente con la cual numerar.'}{' '}
            {onIrAResolucion && (
              <button
                type="button"
                onClick={onIrAResolucion}
                className="font-medium underline underline-offset-4"
                data-testid="facturacion-ir-a-resolucion-banner"
              >
                Cargar la resolución
              </button>
            )}
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

        {/* 🔴 Acá arriba quedan los FILTROS y lo que hay que saber antes de
            emitir. El botón que emite se fue al pie: hay DOS tablas debajo
            —Inquilinos y Propietarios— que comparten una sola selección, y
            desde arriba quedaba fuera de la pantalla justo cuando se estaba
            marcando (Nico, 19-09). */}
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          {datos && (
            <p className="text-caption text-fg-muted tabular-nums">
              {datos.totales.contratos}{' '}
              {datos.totales.contratos === 1 ? 'contrato' : 'contratos'} ·{' '}
              {datos.totales.meses === 1
                ? mesLegible(mes)
                : `${datos.totales.meses} meses hasta ${mesLegible(datos.hasta)}`}
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
              onGenerarUna={(clave) => void generar([clave])}
              motivoParaNoEmitir={motivoParaNoEmitir}
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
              onGenerarUna={(clave) => void generar([clave])}
              motivoParaNoEmitir={motivoParaNoEmitir}
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

            {/* 🔴 EL PIE: lo marcado y lo que se puede hacer con ello, pegado
                al borde de abajo mientras se recorren las dos tablas. Es la
                misma pieza de todas las tablas con acciones masivas
                (`BarraDeAccionesMasivas`). */}
            <BarraDeAccionesMasivas
              testid="facturacion-acciones"
              marcadas={elegidas.length}
              queSon={['factura', 'facturas']}
              monto={elegidas.length > 0 ? formatCurrency(totalElegido) : null}
              sugerida={seleccionSugerida}
              deDonde={`de ${mesLegible(mes)}: son las que se pueden emitir hoy`}
              onQuitar={quitarSeleccion}
              ocupado={generando}
              cuandoNoHayNada="No hay ninguna factura marcada. Marca las que quieras, o usa «Generar esta» en una fila."
              nota={
                <>
                  {/* 🔴 Por qué está apagado, AL LADO del botón y con la salida
                      puesta. El mismo motivo vivía sólo en un banner arriba de
                      todo: Nico apretó, no pasó nada, y lo leyó como «no da el
                      poder generar». Un control que no se mueve y no dice por
                      qué se lee como roto. */}
                  {!generando &&
                    motivoParaNoEmitir === null &&
                    numerosQueFaltan !== null &&
                    datos !== null && (
                      <p
                        className="max-w-xl text-caption text-warning"
                        data-testid="facturacion-rango-corto"
                      >
                        La resolución sólo tiene{' '}
                        {datos.resolucion.disponibles.toLocaleString('es-CO')}{' '}
                        {datos.resolucion.disponibles === 1 ? 'número' : 'números'} y
                        elegiste {elegidas.length.toLocaleString('es-CO')}: se numeran
                        las primeras y las {numerosQueFaltan.toLocaleString('es-CO')}{' '}
                        restantes van a fallar por rango agotado.{' '}
                        {onIrAResolucion && (
                          <button
                            type="button"
                            onClick={onIrAResolucion}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            data-testid="facturacion-ir-a-resolucion-rango"
                          >
                            Cargar otra resolución
                          </button>
                        )}
                      </p>
                    )}
                  {!generando && motivoParaNoEmitir !== null && (
                    <p
                      className="max-w-xl text-caption text-warning"
                      data-testid="facturacion-motivo-apagado"
                    >
                      {motivoParaNoEmitir}{' '}
                      {onIrAResolucion && (
                        <button
                          type="button"
                          onClick={onIrAResolucion}
                          className="font-medium underline underline-offset-4"
                          data-testid="facturacion-ir-a-resolucion"
                        >
                          Cargar la resolución
                        </button>
                      )}
                    </p>
                  )}
                </>
              }
            >
              <Button
                hideArrow
                disabled={
                  elegidas.length === 0 ||
                  generando ||
                  cargando ||
                  // 🔴 Sin resolución vigente el back devuelve 400: apagar el
                  // botón dice lo mismo sin hacer perder la selección.
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
                  : // Sin nada marcado, «Generar 0 facturas» es un rótulo que
                    // nadie escribiría: el botón dice qué hace y el pie de al
                    // lado dice por qué está apagado.
                    elegidas.length === 0
                    ? 'Generar facturas'
                    : `Generar ${elegidas.length} ${elegidas.length === 1 ? 'factura' : 'facturas'}`}
              </Button>
            </BarraDeAccionesMasivas>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  )
}

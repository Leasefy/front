'use client'

/**
 * «Ver por generar hasta <fecha>» — la prefactura hacia adelante.
 *
 * CEO (Juan Camilo López, 2026-09-13): «Si quiero mirar qué facturas tengo por
 * generar hasta el 31 de diciembre, revisa los estados de cuenta de los
 * contratos y muestra todas las posibles facturas hasta esa fecha; los
 * contratos que finalicen antes se van eliminando de la prefactura. Lo que NO
 * se puede es enviarlas todas en un solo mes.»
 *
 * Por eso esto es una CONSULTA y no una emisión: acá no hay casillas ni botón
 * de generar. Generar sigue siendo por mes, con el selector de mes de
 * «Nueva factura» y su botón «Generar N facturas», que esta pantalla no toca.
 * El aviso lo dice en voz alta arriba de la lista, porque una tabla con 1.200
 * filas y un botón «Generar» a dos centímetros es exactamente la confusión que
 * el CEO quiere evitar.
 *
 * ── Agrupar es trabajo de acá ───────────────────────────────────────────────
 * El back manda una LISTA PLANA (`prefacturas`) más el conteo por mes
 * (`porMes`). El mes y el lado —inquilino / propietario— los arma esta
 * pantalla, porque el pedido de Nico es justamente ése: «debe separar por
 * facturas de propietarios y facturas de inquilinos». Los encabezados de mes
 * usan `porMes` tal cual viene: si la cuenta de la pantalla y la del back
 * discreparan, manda el back.
 *
 * ── Los contratos que terminan ──────────────────────────────────────────────
 * El back ya los saca del listado («los contratos que finalicen antes se van
 * eliminando de la prefactura»). Acá NO se inventa una lista de cuáles: se dice
 * que están excluidos, que es lo que vuelve creíble el total sin afirmar un
 * dato que nadie mandó.
 *
 * ── Por qué NO se pide solo al abrir la pestaña ─────────────────────────────
 * «Si quiero mirar» es una acción que la persona pide, no el trabajo diario de
 * la pestaña: lo diario es facturar el mes. Recorrer el estado de cuenta de
 * cada contrato hasta diciembre es una consulta cara, y dispararla cada vez que
 * alguien abre Facturación se la cobra a todos para que la use uno. Entonces el
 * panel arranca cerrado y la consulta sale cuando la persona lo abre O cuando
 * cambia la fecha —tocar el selector es pedirlo—.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, Receipt } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatCurrency } from '@/lib/format'
import { fechaLegible, mesLegible } from '@/lib/api/facturacion-por-mes.service'
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service'
import type {
  PrefacturaDelMes,
  PrefacturasHasta,
} from '@/lib/types/estado-de-cuenta'

/** El aviso del CEO, en un solo lugar: se muestra y además se prueba. */
export const AVISO_SE_GENERAN_POR_MES =
  'Se muestran todas las facturas hasta esa fecha; se generan por mes.'

/**
 * Lo que el back YA hizo por nosotros, dicho en pantalla.
 *
 * «Los contratos que finalicen antes se van eliminando de la prefactura»: si no
 * se dice, el total se lee como una proyección que ignora los vencimientos.
 */
export const AVISO_CONTRATOS_QUE_TERMINAN =
  'Los contratos que terminan antes de esa fecha dejan de prefacturarse: sus meses posteriores no aparecen en este listado.'

/**
 * El tope por defecto: el 31 de diciembre del año en curso.
 *
 * Es la fecha que el CEO dijo, y es la que tiene sentido: el corte con el que
 * una inmobiliaria mira «qué me queda del año». Se arma con los campos locales
 * del `Date` —no con ISO— porque `new Date('2026-12-31')` se lee como UTC y en
 * Bogotá (UTC−5) cae el 30. El back usa el mismo default cuando no se le manda
 * `hasta`; igual se manda explícito, para que la pantalla y la consulta digan
 * lo mismo.
 */
export function finDeAnio(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-12-31`
}

/** Un mes ya armado: sus dos lados y lo que el back dice que pesa. */
export interface MesAgrupado {
  mes: string
  inquilinos: PrefacturaDelMes[]
  propietarios: PrefacturaDelMes[]
  /** De `porMes` del back, no de `length`: si discrepan, manda el back. */
  cantidad: number
  totalCop: number
}

/**
 * Agrupa la lista plana por mes y, dentro, por lado.
 *
 * El orden de los meses lo da `porMes` (el back ya los manda en orden). Un mes
 * que aparezca en `prefacturas` y no en `porMes` igual se muestra, al final:
 * esconder filas porque el resumen no las nombró sería perder facturas.
 */
export function agruparPorMes(datos: PrefacturasHasta): MesAgrupado[] {
  const porMes = new Map<string, MesAgrupado>()

  const nuevo = (mes: string): MesAgrupado => {
    const resumen = datos.porMes.find((m) => m.mes === mes)
    return {
      mes,
      inquilinos: [],
      propietarios: [],
      cantidad: resumen?.cantidad ?? 0,
      totalCop: resumen?.totalCop ?? 0,
    }
  }

  // Primero los meses que el back nombró, en su orden.
  for (const m of datos.porMes) porMes.set(m.mes, nuevo(m.mes))

  for (const p of datos.prefacturas) {
    let grupo = porMes.get(p.mes)
    if (!grupo) {
      grupo = nuevo(p.mes)
      porMes.set(p.mes, grupo)
    }
    if (p.lado === 'INQUILINO') grupo.inquilinos.push(p)
    else grupo.propietarios.push(p)
  }

  return [...porMes.values()]
}

/** El período que cubre la cuota: «22/05/2026 → 21/06/2026». */
function periodoLegible(p: PrefacturaDelMes): string {
  return `${fechaLegible(p.desde)} → ${fechaLegible(p.hasta)}`
}

interface TablaProps {
  titulo: string
  filas: PrefacturaDelMes[]
  testid: string
}

/**
 * Un lado de un mes. Sin casillas: esto no se emite desde acá.
 *
 * Lo ya facturado NO se esconde —se marca—: una lista que sólo trae lo
 * pendiente no deja verificar que el mes esté completo, que es justo lo que se
 * viene a mirar.
 */
function TablaDePrefacturas({ titulo, filas, testid }: TablaProps) {
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, { resetKey: `${testid}-${filas.length}` })

  const totalCop = filas.reduce((s, f) => s + f.totalCop, 0)
  const facturadas = filas.filter((f) => f.yaFacturada).length

  if (filas.length === 0) {
    // Un lado vacío se dice en una línea, no con una tabla de encabezados
    // huérfanos: en un listado de cuatro meses eso son ocho tablas en blanco.
    return (
      <div
        className="rounded-lg border border-border-faint bg-surface-muted px-4 py-3"
        data-testid={testid}
      >
        <p className="text-caption text-fg-muted">
          Ninguna factura de {titulo.toLowerCase()} este mes.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-border-faint overflow-hidden"
      data-testid={testid}
    >
      <div className="flex flex-col gap-1 border-b border-border-faint bg-surface-muted px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h5 className="text-body-sm font-semibold text-fg">{titulo}</h5>
        <p className="font-mono text-caption tabular-nums text-fg-muted">
          {total} {total === 1 ? 'factura' : 'facturas'} · {formatCurrency(totalCop)}
          {facturadas > 0 && ` · ${facturadas} ya emitidas`}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Contrato</TableHead>
            <TableHead className="whitespace-nowrap">Cliente</TableHead>
            <TableHead className="whitespace-nowrap">Inmueble</TableHead>
            <TableHead className="whitespace-nowrap">Período</TableHead>
            <TableHead className="whitespace-nowrap">Vence</TableHead>
            <TableHead className="whitespace-nowrap text-right">Base</TableHead>
            <TableHead className="whitespace-nowrap text-right">IVA</TableHead>
            <TableHead className="whitespace-nowrap text-right">Total</TableHead>
            <TableHead className="whitespace-nowrap">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((p) => (
            <TableRow
              key={p.cuotaId}
              data-testid={`prefactura-${p.cuotaId}`}
              className={p.yaFacturada ? 'opacity-70' : undefined}
            >
              {/* El número que la inmobiliaria conoce es el del contrato, no
                  nuestro id interno: es con ése que llama al cliente. */}
              <TableCell className="whitespace-nowrap font-mono tabular-nums font-medium text-fg">
                {p.contratoNumero}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="truncate text-fg">{p.clienteNombre}</p>
                {p.clienteDocumento && (
                  <p className="truncate font-mono text-caption tabular-nums text-fg-muted">
                    {p.clienteDocumento}
                  </p>
                )}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="truncate text-fg-muted">{p.inmueble}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">
                {periodoLegible(p)}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
                {fechaLegible(p.vencimiento)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                {formatCurrency(p.baseCop)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                {/* Un cero se dice «—»: una factura sin IVA y una a la que
                    todavía no se le calculó se leen distinto. */}
                {p.ivaCop > 0 ? formatCurrency(p.ivaCop) : '—'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums font-medium text-fg">
                {formatCurrency(p.totalCop)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {p.yaFacturada ? (
                  <span
                    className="inline-block rounded-full bg-success-soft px-2 py-0.5 text-caption text-success"
                    data-testid={`prefactura-emitida-${p.cuotaId}`}
                  >
                    Ya emitida
                  </span>
                ) : (
                  <span className="text-caption text-fg-muted">Por generar</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {shouldPaginate && (
        <div className="border-t border-border-faint px-4 py-3">
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
    </div>
  )
}

/** Un mes del listado: su encabezado y sus dos lados. */
function MesDelListado({ mes }: { mes: MesAgrupado }) {
  return (
    <section
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
      data-testid={`prefacturas-mes-${mes.mes}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        {/* `mesLegible` y no `toLocaleDateString`: `new Date('2026-12')` se lee
            como UTC y en Bogotá pinta el mes anterior. */}
        <h4 className="text-body font-semibold text-fg">{mesLegible(mes.mes)}</h4>
        <p className="font-mono text-caption tabular-nums text-fg-muted">
          {mes.cantidad} {mes.cantidad === 1 ? 'factura' : 'facturas'} ·{' '}
          {formatCurrency(mes.totalCop)}
        </p>
      </div>

      <TablaDePrefacturas
        titulo="Inquilinos"
        filas={mes.inquilinos}
        testid={`prefacturas-${mes.mes}-inquilinos`}
      />
      <TablaDePrefacturas
        titulo="Propietarios"
        filas={mes.propietarios}
        testid={`prefacturas-${mes.mes}-propietarios`}
      />
    </section>
  )
}

/**
 * Los números de arriba. Los de plata salen de `totales` del back; cuántas son
 * de cada lado se cuenta acá, porque el back manda el lado fila por fila.
 */
function TotalesDeLaPrefactura({
  datos,
  meses,
}: {
  datos: PrefacturasHasta
  meses: MesAgrupado[]
}) {
  const t = datos.totales
  const deInquilinos = meses.reduce((s, m) => s + m.inquilinos.length, 0)
  const dePropietarios = meses.reduce((s, m) => s + m.propietarios.length, 0)

  const celdas: { rotulo: string; valor: string; testid: string }[] = [
    { rotulo: 'Facturas', valor: String(t.cantidad), testid: 'total-facturas' },
    { rotulo: 'Inquilinos', valor: String(deInquilinos), testid: 'total-inquilinos' },
    {
      rotulo: 'Propietarios',
      valor: String(dePropietarios),
      testid: 'total-propietarios',
    },
    { rotulo: 'Base', valor: formatCurrency(t.baseCop), testid: 'total-base' },
    { rotulo: 'IVA', valor: formatCurrency(t.ivaCop), testid: 'total-iva' },
    { rotulo: 'Total', valor: formatCurrency(t.totalCop), testid: 'total-total' },
  ]

  return (
    <div
      className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6"
      data-testid="prefacturas-totales"
    >
      {celdas.map((c) => (
        <div key={c.testid}>
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {c.rotulo}
          </p>
          <p
            className="mt-1 font-mono text-lg font-medium tabular-nums text-fg"
            data-testid={`prefacturas-${c.testid}`}
          >
            {c.valor}
          </p>
        </div>
      ))}
    </div>
  )
}

export function PorGenerarHasta() {
  const [hasta, setHasta] = useState(() => finDeAnio())
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState<PrefacturasHasta | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<unknown>(null)

  /**
   * La fecha que YA se pidió. Sin esto, cerrar y volver a abrir el panel
   * dispara otra vez la consulta cara sobre datos que no cambiaron.
   */
  const pedida = useRef<string | null>(null)

  const cargar = useCallback(async (laFecha: string) => {
    pedida.current = laFecha
    setCargando(true)
    setError(null)
    try {
      setDatos(await estadoDeCuentaApi.prefacturas(laFecha))
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!abierto) return
    if (pedida.current === hasta) return
    void cargar(hasta)
  }, [abierto, hasta, cargar])

  /** Tocar el selector ES pedirlo: abre el panel y vuelve a consultar. */
  function cambiarLaFecha(valor: string) {
    // Un `<input type="date">` vacío manda ''. Sin fecha no hay tope que pedir:
    // se guarda lo que la persona escribió y no se consulta nada.
    setHasta(valor)
    if (valor) setAbierto(true)
  }

  const meses = useMemo(() => (datos ? agruparPorMes(datos) : []), [datos])
  const vacio = datos !== null && datos.prefacturas.length === 0

  return (
    <section
      className="rounded-lg border border-border bg-surface"
      data-testid="prefacturas"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prefacturas-hasta"
            className="text-caption font-medium text-fg"
          >
            Ver por generar hasta
          </label>
          <Input
            id="prefacturas-hasta"
            type="date"
            className="w-full font-mono tabular-nums sm:w-56"
            value={hasta}
            onChange={(e) => cambiarLaFecha(e.target.value)}
            data-testid="prefacturas-hasta"
          />
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {/* Los dos avisos se ven SIEMPRE, abierto o cerrado: el primero separa
              «mirar» de «emitir»; el segundo explica por qué el total no cuenta
              los contratos que se acaban en el camino. */}
          <div className="max-w-md space-y-0.5 sm:text-right">
            <p className="text-caption text-fg-muted">{AVISO_SE_GENERAN_POR_MES}</p>
            <p className="text-caption text-fg-subtle">
              {AVISO_CONTRATOS_QUE_TERMINAN}
            </p>
          </div>
          <Button
            variant="outline"
            hideArrow
            disabled={!hasta}
            onClick={() => setAbierto((a) => !a)}
            data-testid="prefacturas-ver"
          >
            <CalendarBlank className="h-4 w-4" weight="bold" />
            {abierto ? 'Ocultar el listado' : 'Ver el listado'}
          </Button>
        </div>
      </div>

      {abierto && (
        <div className="border-t border-border p-4">
          <EstadoDeDatos
            cargando={cargando}
            error={error}
            vacio={vacio}
            queEs="las facturas por generar hasta esa fecha"
            onReintentar={() => void cargar(hasta)}
            cuandoVacio={
              <SinDatos
                queSon={`facturas por generar hasta el ${fechaLegible(hasta)}`}
                icono={Receipt}
                descripcion="Ningún contrato vigente genera facturas antes de esa fecha. Prueba con una fecha más lejana o revisa las fechas de los contratos."
              />
            }
          >
            {datos && (
              <div className="space-y-4">
                <TotalesDeLaPrefactura datos={datos} meses={meses} />
                {meses.map((m) => (
                  <MesDelListado key={m.mes} mes={m} />
                ))}
              </div>
            )}
          </EstadoDeDatos>
        </div>
      )}
    </section>
  )
}

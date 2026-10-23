'use client'

/**
 * Las liquidaciones de Leasefy a cada inmobiliaria: por inmobiliaria, por
 * fecha del giro y por estado (generada → girada → conciliada en el banco de
 * la inmobiliaria). Cada una se abre con sus pagos, se descarga en Excel o PDF
 * y se marca «girada» cuando Leasefy transfirió. Desde la ola E (E6, Nico E2
 * Q2 a) una girada se puede DESMARCAR, con motivo obligatorio, y la historia
 * del giro queda a la vista.
 *
 * 🔴 Lo descontado se muestra TAL COMO VINO (reporte de Wompi o Leasefy):
 * esta pantalla no calcula ninguna tarifa.
 */

import { useState } from 'react'
import { Funnel } from '@phosphor-icons/react'
import { Collapse, Presence } from '@leasefy/cadence'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarraDeFiltros, Desplegable, Filtro } from '@/components/admin/screen/Filtros'
import { useEstadoDeLaTabla } from '@/lib/admin/use-estado-de-la-tabla'
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha'

import { Pill } from '@/components/admin/Pill'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pagination } from '@/components/admin/screen/Pagination'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { fmtDateTime, fmtFecha } from '@/lib/admin/format'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

/** «generada» → «Generada» (los estados viven en minúscula para ir dentro de una frase). */
const conMayuscula = (t: string) => t.charAt(0).toLocaleUpperCase('es-CO') + t.slice(1)
import { useApiQuery } from '@/lib/admin/use-api-query'
import { aFechaIso, hoyLocal } from '@/lib/fechas-locales'
import {
  exportarLiquidacionAExcel,
  exportarLiquidacionAPdf,
  pesos,
} from '@/lib/admin/documento-de-la-liquidacion'
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos'
import {
  desmarcarGirada,
  listarLiquidaciones,
  marcarGirada,
  MOTIVO_MAXIMO_PARA_DESMARCAR,
  MOTIVO_MINIMO_PARA_DESMARCAR,
  NOMBRE_DE_QUIEN_CONCILIO,
  NOMBRE_DEL_ESTADO,
  TONO_DEL_ESTADO,
  verLiquidacion,
  type DetalleDeLaLiquidacion,
  type EstadoDeLaLiquidacion,
  type FiltrosDeLiquidaciones,
  type InmobiliariaDelRecaudo,
  type LiquidacionDelRecaudo,
  type MovimientoDelGiro,
} from '@/lib/admin/recaudo-en-linea'
import { Cifra, ErrorDeLaAccion, Etiqueta } from './partes'
import { GenerarLiquidaciones } from './GenerarLiquidaciones'
import { Card, MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const POR_PAGINA = 25

export function Liquidaciones({
  inmobiliarias,
  giroDisponible,
  version,
  generando,
  alPedirGenerar,
}: {
  inmobiliarias: InmobiliariaDelRecaudo[]
  giroDisponible: boolean
  /** Sube cuando otra parte de la pantalla cambió algo (importar un reporte). */
  version: number
  /** «Generar liquidaciones» se abre desde el encabezado de la pantalla (la acción principal). */
  generando: boolean
  /** La misma acción, desde el vacío (ronda 26: la salida del vacío va en el vacío). */
  alPedirGenerar?: () => void
}) {
  // Ronda 26 (revisora r25): los filtros y la página viven en la URL (antes en el estado de la pestaña: una
  // lista filtrada no se compartía con el enlace ni sobrevivía a recargar). Sin enrutador (una prueba), en memoria.
  const url = useEstadoDeLaTabla()
  const estadoDeLaUrl = url.get('estado')
  const filtros: FiltrosDeLiquidaciones = {
    agencyId: url.get('inmobiliaria') || undefined,
    desde: url.get('desde') || undefined,
    hasta: url.get('hasta') || undefined,
    estado: (['generada', 'girada', 'conciliada'].includes(estadoDeLaUrl) ? estadoDeLaUrl : undefined) as
      | EstadoDeLaLiquidacion
      | undefined,
  }
  const pagina = Number(url.get('pagina')) || 0
  const setPagina = (p: number) => url.setFilters({ pagina: p <= 0 ? undefined : p })
  const [abierta, setAbierta] = useState<string | null>(null)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const rangoInvertido = !!filtros.desde && !!filtros.hasta && filtros.desde > filtros.hasta

  const { data, isLoading, error, refetch } = useApiQuery(
    (signal) => listarLiquidaciones({ ...filtros, pagina, porPagina: POR_PAGINA }, signal),
    [filtros.agencyId, filtros.desde, filtros.hasta, filtros.estado, pagina, version],
    !rangoInvertido,
  )

  const cambiar = (cambio: Partial<FiltrosDeLiquidaciones>) => {
    const clave: Record<keyof FiltrosDeLiquidaciones, string> = {
      agencyId: 'inmobiliaria',
      desde: 'desde',
      hasta: 'hasta',
      estado: 'estado',
    } as Record<keyof FiltrosDeLiquidaciones, string>
    const patch: Record<string, string | undefined> = { pagina: undefined }
    for (const [k, v] of Object.entries(cambio)) patch[clave[k as keyof FiltrosDeLiquidaciones] ?? k] = (v as string | undefined) || undefined
    url.setFilters(patch)
    setAbierta(null)
  }
  const hayFiltros = Boolean(filtros.agencyId || filtros.desde || filtros.hasta || filtros.estado)
  const filtrosPuestos = [filtros.agencyId, filtros.desde || filtros.hasta, filtros.estado].filter(Boolean).length

  return (
    <div data-testid="liquidaciones">
      {/* Ronda 28 (revisora r27): primero lo que se genera y LA RESPUESTA; después UNA tarjeta con los filtros
          DENTRO (antes la barra suelta, «selects por ahí tirados») y la lista. A 390 los filtros van detrás de
          «Filtros (n)». */}
      <Collapse open={generando}>
        <div className="pb-4">
          <GenerarLiquidaciones
            inmobiliarias={inmobiliarias}
            alGenerar={() => {
              setPagina(0)
              refetch()
            }}
          />
        </div>
      </Collapse>

      {data && data.disponible && data.total > 0 ? (
        // LA RESPUESTA: cuánto se gira con estos filtros y cuánto se quedó en el camino (Wompi y Leasefy).
        <div className="mb-4 rounded-lg border border-border bg-surface p-5 sm:p-6" data-testid="totales-de-liquidaciones">
          <CifraHeroe
            rotulo="Neto que se gira"
            cifra={pesos(data.totales.netoCop)}
            contexto={`en ${data.totales.liquidaciones === 1 ? '1 liquidación' : `${data.totales.liquidaciones} liquidaciones`}, de ${pesos(data.totales.brutoCop)} que pagaron los inquilinos`}
            tramos={[
              { clave: 'neto', etiqueta: 'Se gira', monto: data.totales.netoCop, tono: 'exito', cifra: pesos(data.totales.netoCop) },
              {
                clave: 'descontado',
                etiqueta: 'Descontado (Wompi y Leasefy)',
                monto: Math.max(0, data.totales.brutoCop - data.totales.netoCop),
                tono: 'neutro',
                cifra: pesos(Math.max(0, data.totales.brutoCop - data.totales.netoCop)),
              },
            ]}
            total={data.totales.brutoCop}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="space-y-3 border-b border-border p-4">
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            type="button"
            className="w-full gap-2 sm:hidden"
            aria-expanded={filtrosAbiertos}
            onClick={() => setFiltrosAbiertos((v) => !v)}
            data-testid="liquidaciones-boton-filtros"
          >
            <Funnel className="h-4 w-4" aria-hidden />
            Filtros{filtrosPuestos > 0 ? ` (${filtrosPuestos})` : ''}
          </Button>
          <div className={filtrosAbiertos ? 'block' : 'hidden sm:block'}>
        <BarraDeFiltros>
          <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria-recaudo">
            <Desplegable
              id="filtro-inmobiliaria-recaudo"
              value={filtros.agencyId ?? ''}
              onChange={(v) => cambiar({ agencyId: v || undefined })}
              todas="Todas las inmobiliarias"
              aria-label="Inmobiliaria"
              data-testid="filtro-inmobiliaria"
              opciones={inmobiliarias.map((i) => ({ valor: i.id, nombre: i.nombre }))}
            />
          </Filtro>
          <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Fecha del giro">
            <span className="w-full shrink-0 whitespace-nowrap text-caption text-fg-muted sm:w-auto">Fecha del giro</span>
            <label htmlFor="filtro-desde" className="sr-only">
              Desde
            </label>
            <div className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none">
              <CampoDeFecha id="filtro-desde" testid="filtro-desde" value={filtros.desde ?? ''} onChange={(v) => cambiar({ desde: v || undefined })} />
            </div>
            <span aria-hidden="true" className="text-fg-subtle">
              –
            </span>
            <label htmlFor="filtro-hasta" className="sr-only">
              Hasta
            </label>
            <div className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none">
              <CampoDeFecha id="filtro-hasta" testid="filtro-hasta" value={filtros.hasta ?? ''} onChange={(v) => cambiar({ hasta: v || undefined })} />
            </div>
          </div>
          <Filtro etiqueta="Estado" htmlFor="filtro-estado-recaudo">
            <Desplegable
              id="filtro-estado-recaudo"
              value={filtros.estado ?? ''}
              onChange={(v) => cambiar({ estado: (v || undefined) as EstadoDeLaLiquidacion | undefined })}
              todas="Todos los estados"
              aria-label="Estado"
              data-testid="filtro-estado"
              opciones={[
                { valor: 'generada', nombre: 'Generada' },
                { valor: 'girada', nombre: 'Girada' },
                { valor: 'conciliada', nombre: 'Conciliada en el banco' },
              ]}
            />
          </Filtro>
          {hayFiltros ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => cambiar({ agencyId: undefined, desde: undefined, hasta: undefined, estado: undefined })}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </BarraDeFiltros>
          </div>
          {rangoInvertido ? (
            <p className="text-body-sm text-danger" data-testid="rango-invertido">
              La fecha «desde» va antes de la fecha «hasta».
            </p>
          ) : null}
        </div>
      <div className="p-4">
        {isLoading ? (
          <LoadingBlock label="cargando liquidaciones" />
        ) : error ? (
          <ErrorBlock error={error} onReintentar={refetch} />
        ) : !data || data.data.length === 0 ? (
          // Ronda 26 (T7): «con estos filtros» sólo con filtros puestos; sin filtros, la acción va en el vacío.
          hayFiltros ? (
            <EmptyBlock
              title="Ninguna liquidación con estos filtros"
              hint="Quita algún filtro para ver más."
              accion={
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  type="button"
                  onClick={() => cambiar({ agencyId: undefined, desde: undefined, hasta: undefined, estado: undefined })}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              title="Todavía no hay liquidaciones"
              // Ronda 28 (revisora r27): sin repetir «la frecuencia… por definir» (va arriba) y sin un segundo azul.
              hint="Elige un rango de fechas y se arma la de cada inmobiliaria."
              accion={
                alPedirGenerar && !generando ? (
                  <Button size="sm" variant="outline" hideArrow type="button" onClick={alPedirGenerar}>
                    Generar liquidaciones
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <div className="space-y-px" data-testid="lista-de-liquidaciones">
            {data.data.map((l) => (
              <FilaDeLiquidacion
                key={l.id}
                liquidacion={l}
                abierta={abierta === l.id}
                alAbrir={() => setAbierta((a) => (a === l.id ? null : l.id))}
                giroDisponible={giroDisponible && data.giroDisponible}
                alCambiar={refetch}
              />
            ))}
          </div>
        )}
        {data ? <Pagination page={pagina} total={data.total} pageSize={POR_PAGINA} onPage={setPagina} /> : null}
      </div>
      </div>
    </div>
  )
}

function FilaDeLiquidacion({
  liquidacion: l,
  abierta,
  alAbrir,
  giroDisponible,
  alCambiar,
}: {
  liquidacion: LiquidacionDelRecaudo
  abierta: boolean
  alAbrir: () => void
  giroDisponible: boolean
  alCambiar: () => void
}) {
  return (
    <Card data-testid={`liquidacion-${l.numero}`}>
      {/* Glow up 22-10: la fila responde «¿cuánto se le gira, a quién y cuándo?» —el neto grande a la derecha—;
          el desglose (bruto y cada descuento) va en UNA línea callada, no en 8 cifras del mismo peso. */}
      <button
        type="button"
        className="w-full rounded-lg p-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={alAbrir}
        aria-expanded={abierta}
        data-testid={`abrir-${l.numero}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-fg">{l.inmobiliaria ?? 'Sin nombre'}</span>
              <Pill tone={TONO_DEL_ESTADO[l.estado]}>{conMayuscula(NOMBRE_DEL_ESTADO[l.estado])}</Pill>
            </div>
            <p className="text-caption text-fg-muted">
              <span className="font-mono">{l.numero}</span> · giro del{' '}
              <span className="font-mono tabular-nums">{l.fechaDelGiro ? fmtFecha(l.fechaDelGiro) : '—'}</span> ·{' '}
              {l.cantidadDePagos === 1 ? '1 pago' : `${l.cantidadDePagos} pagos`}
            </p>
          </div>
          <div className="text-right">
            <MonoLabel className="block">Neto que se gira</MonoLabel>
            <span className="font-mono text-subtitle tabular-nums text-fg">{pesos(l.netoCop)}</span>
          </div>
        </div>
        <p className="mt-2 text-caption text-fg-muted">
          Bruto <span className="font-mono tabular-nums text-fg">{pesos(l.brutoCop)}</span> · comisión{' '}
          <span className="font-mono tabular-nums">{pesos(l.comisionCop)}</span> · IVA{' '}
          <span className="font-mono tabular-nums">{pesos(l.ivaCop)}</span> · retenciones{' '}
          <span className="font-mono tabular-nums">{pesos(l.retencionesCop)}</span>
          {l.otrosDescuentosCop ? (
            <>
              {' '}
              · otros de Leasefy <span className="font-mono tabular-nums">{pesos(l.otrosDescuentosCop)}</span>
            </>
          ) : null}
        </p>
      </button>
      <Collapse open={abierta}>
        <DetalleDeLiquidacion id={l.id} giroDisponible={giroDisponible} alCambiar={alCambiar} />
      </Collapse>
    </Card>
  )
}

function DetalleDeLiquidacion({
  id,
  giroDisponible,
  alCambiar,
}: {
  id: string
  giroDisponible: boolean
  alCambiar: () => void
}) {
  const [tick, setTick] = useState(0)
  const { data: l, isLoading, error } = useApiQuery((signal) => verLiquidacion(id, signal), [id, tick])
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null)
  const [errorDeAccion, setErrorDeAccion] = useState<string | null>(null)
  // «Centavos en todo» (P8 a): con la llave de la tesorería el PDF escribe
  // siempre los dos decimales; apagada, como siempre.
  const conCentavos = usePlataConCentavos('tesoreria_y_conciliacion')

  async function exportar(formato: 'xlsx' | 'pdf', d: DetalleDeLaLiquidacion) {
    setExportando(formato)
    setErrorDeAccion(null)
    try {
      if (formato === 'xlsx') await exportarLiquidacionAExcel(d)
      // Con la llave apagada, la llamada de siempre (sin opciones).
      else if (conCentavos) await exportarLiquidacionAPdf(d, { conCentavos })
      else await exportarLiquidacionAPdf(d)
    } catch (err) {
      setErrorDeAccion(
        mensajeDelAdmin(err, {
          accion: 'descargar la liquidación',
          porDefecto: 'No se pudo armar el archivo de la liquidación. Prueba de nuevo.',
        }),
      )
    } finally {
      setExportando(null)
    }
  }

  if (isLoading && !l) return <div className="px-4 pb-4"><LoadingBlock label="cargando pagos" /></div>
  if (error) return <div className="px-4 pb-4"><ErrorBlock error={error} /></div>
  if (!l) return null

  return (
    <div className="px-4 pb-5 border-t border-border" data-testid={`detalle-${l.numero}`}>
      <div className="grid gap-4 sm:grid-cols-2 pt-4">
        <div>
          <Etiqueta>la inmobiliaria</Etiqueta>
          <p className="text-body-sm text-fg mt-1">
            {l.inmobiliaria ?? 'Sin nombre'} · NIT {l.nit ?? 'sin registrar'}
          </p>
          <p className="text-body-sm text-fg-muted mt-1">
            Referencia del giro: <span className="font-mono">{l.referenciaDelGiro}</span>
          </p>
          <p className="text-body-sm text-fg-muted">
            Generada por {l.creadaPor}
            {l.createdAt ? ` el ${fmtDateTime(l.createdAt)}` : ''}
          </p>
          <EstadoEnPalabras l={l} />
        </div>
        <div>
          <Etiqueta>bruto, descuentos y neto (tal como vienen)</Etiqueta>
          <ul className="mt-1 space-y-0.5 text-body-sm" data-testid="descuentos">
            <li className="flex justify-between gap-3">
              <span className="text-fg">Recaudado (bruto)</span>
              <span className="font-mono tabular-nums">{pesos(l.brutoCop)}</span>
            </li>
            {l.descuentos.map((d, i) => (
              <li key={`${d.concepto}-${i}`} className="flex justify-between gap-3">
                <span className="text-fg-muted">
                  {d.concepto}{' '}
                  <MonoLabel>
                    {d.fuente === 'leasefy' ? 'leasefy' : 'reporte de wompi'}
                  </MonoLabel>
                </span>
                <span className="font-mono tabular-nums">−{pesos(d.valorCop)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-border pt-1 font-medium">
              <span className="text-fg">Neto que se gira</span>
              <span className="font-mono tabular-nums">{pesos(l.netoCop)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button variant="outline" hideArrow type="button"
          
          disabled={exportando !== null}
          onClick={() => void exportar('xlsx', l)}
          data-testid="descargar-excel"
        >
          {exportando === 'xlsx' ? 'Armando el Excel…' : 'Descargar Excel'}
        </Button>
        <Button variant="outline" hideArrow type="button"
          
          disabled={exportando !== null}
          onClick={() => void exportar('pdf', l)}
          data-testid="descargar-pdf"
        >
          {exportando === 'pdf' ? 'Armando el PDF…' : 'Descargar PDF'}
        </Button>
      </div>

      {l.estado === 'generada' ? (
        <MarcarGirada
          liquidacion={l}
          giroDisponible={giroDisponible}
          alMarcar={() => {
            setTick((t) => t + 1)
            alCambiar()
          }}
        />
      ) : null}

      {l.estado === 'girada' ? (
        <DesmarcarGirada
          liquidacion={l}
          alDesmarcar={() => {
            setTick((t) => t + 1)
            alCambiar()
          }}
        />
      ) : null}

      {l.historiaDelGiro && l.historiaDelGiro.length > 0 ? (
        <HistoriaDelGiro historia={l.historiaDelGiro} />
      ) : null}

      <ErrorDeLaAccion mensaje={errorDeAccion} testId="error-del-detalle" />

      <div className="mt-5">
        <Etiqueta>los pagos en línea que incluye</Etiqueta>
        <div className="overflow-x-auto mt-2">
          <Table data-testid="pagos-de-la-liquidacion">
            <TableHeader>
              <TableRow className="border-b border-border text-left">
                <TableHead ><Etiqueta>fecha</Etiqueta></TableHead>
                <TableHead ><Etiqueta>transacción</Etiqueta></TableHead>
                <TableHead ><Etiqueta>referencia</Etiqueta></TableHead>
                <TableHead ><Etiqueta>recibo</Etiqueta></TableHead>
                <TableHead className="text-right"><Etiqueta>bruto</Etiqueta></TableHead>
                <TableHead className="text-right"><Etiqueta>comisión</Etiqueta></TableHead>
                <TableHead className="text-right"><Etiqueta>iva</Etiqueta></TableHead>
                <TableHead className="text-right"><Etiqueta>retenciones</Etiqueta></TableHead>
                <TableHead className="text-right"><Etiqueta>neto de wompi</Etiqueta></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {l.pagos.map((p) => (
                <TableRow key={p.transaccionId}>
                  <TableCell className="px-2 py-1.5 font-mono tabular-nums">{p.fecha ? fmtFecha(p.fecha) : '—'}</TableCell>
                  <TableCell className="px-2 py-1.5 font-mono">{p.transaccionId}</TableCell>
                  <TableCell className="px-2 py-1.5 font-mono">{p.referencia ?? '—'}</TableCell>
                  <TableCell className="px-2 py-1.5 font-mono">{p.reciboNumero ?? '—'}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">{pesos(p.brutoCop)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">{pesos(p.comisionCop)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">{pesos(p.ivaCop)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">{pesos(p.retencionesCop)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">{pesos(p.netoCop)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function EstadoEnPalabras({ l }: { l: DetalleDeLaLiquidacion }) {
  if (l.estado === 'conciliada') {
    const quien = l.conciliadaPor ? (NOMBRE_DE_QUIEN_CONCILIO[l.conciliadaPor] ?? l.conciliadaPor) : null
    const detalle = [l.conciliadaAt ? fmtDateTime(l.conciliadaAt) : null, quien].filter(Boolean).join(', ')
    return (
      <p className="text-body-sm text-success mt-2" data-testid="estado-en-palabras">
        La línea del giro ya está conciliada en el banco de la inmobiliaria{detalle ? ` (${detalle})` : ''}.
      </p>
    )
  }
  if (l.estado === 'girada') {
    return (
      <p className="text-body-sm text-fg mt-2" data-testid="estado-en-palabras">
        Leasefy la giró el {l.giradaEl ? fmtFecha(l.giradaEl) : '—'}
        {l.giradaPor ? ` (marcó ${l.giradaPor})` : ''}
        {l.referenciaBancariaDelGiro ? ` · comprobante ${l.referenciaBancariaDelGiro}` : ''}. Falta que la
        línea aparezca en el extracto de la inmobiliaria.
      </p>
    )
  }
  return (
    <p className="text-body-sm text-warning mt-2" data-testid="estado-en-palabras">
      Generada: todavía no se ha girado.
    </p>
  )
}

function MarcarGirada({
  liquidacion: l,
  giroDisponible,
  alMarcar,
}: {
  liquidacion: DetalleDeLaLiquidacion
  giroDisponible: boolean
  alMarcar: () => void
}) {
  const hoy = aFechaIso(hoyLocal())
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(hoy)
  const [referencia, setReferencia] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const problema = !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? 'Elige el día en que salió la transferencia.'
    : fecha > hoy
      ? 'La fecha del giro no puede ser después de hoy.'
      : null

  if (!giroDisponible) {
    return (
      <p className="text-body-sm text-fg-muted mt-4" data-testid="giro-sin-migracion">
        Marcar «girada» todavía no está habilitado en esta base (falta una migración que aplica Víctor).
      </p>
    )
  }

  async function confirmar() {
    if (problema) return
    setEnviando(true)
    setError(null)
    try {
      await marcarGirada(l.id, { fecha, referenciaBancaria: referencia })
      setAbierto(false)
      alMarcar()
    } catch (err) {
      setError(mensajeDelAdmin(err, { accion: 'marcar la liquidación como girada', porDefecto: 'No se pudo marcar como girada.' }))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4">
      {!abierto ? (
        <Button hideArrow type="button"  onClick={() => setAbierto(true)} data-testid="marcar-girada">
          Marcar como girada
        </Button>
      ) : null}
      <Presence show={abierto}>
        <Card className="p-4 " data-testid="confirmar-girada">
          <p className="text-body-sm text-fg">
            Esto deja dicho que Leasefy ya le transfirió {pesos(l.netoCop)} a {(l.inmobiliaria ?? 'la inmobiliaria').replace(/\.+$/, '')}.
            ¿Ya salió la plata?
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <label className="block">
              <Etiqueta>día de la transferencia</Etiqueta>
              <Input
                type="date"
                className="mt-1"
                value={fecha}
                max={hoy}
                onChange={(e) => setFecha(e.target.value)}
                data-testid="fecha-del-giro"
              />
            </label>
            <label className="block">
              <Etiqueta>comprobante o referencia (opcional)</Etiqueta>
              <Input
                className="mt-1"
                value={referencia}
                maxLength={120}
                onChange={(e) => setReferencia(e.target.value)}
                data-testid="referencia-del-giro"
              />
            </label>
          </div>
          {problema ? <p className="text-body-sm text-danger mt-2">{problema}</p> : null}
          <p className="text-body-sm text-fg-muted mt-2">
            Si la línea del banco todavía no ha llegado, la fecha del giro pasa a ser este día: con ella
            se busca en el extracto de la inmobiliaria.
          </p>
          <div className="flex gap-2 mt-3">
            <Button hideArrow type="button"
              
              disabled={enviando || problema !== null}
              onClick={() => void confirmar()}
              data-testid="confirmar-girada-si"
            >
              {enviando ? 'Guardando…' : 'Sí, ya se giró'}
            </Button>
            <Button variant="ghost" hideArrow type="button"  disabled={enviando} onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
          </div>
          <ErrorDeLaAccion mensaje={error} testId="error-de-girada" />
        </Card>
      </Presence>
    </div>
  )
}

/**
 * 🔴 Desmarcar «girada» (ola E, E6 · Nico E2 Q2 a): sólo el equipo de Leasefy
 * llega a este panel; el motivo es OBLIGATORIO (10 a 500 caracteres) y queda en
 * la bitácora del giro. La liquidación vuelve a «generada».
 */
function DesmarcarGirada({
  liquidacion: l,
  alDesmarcar,
}: {
  liquidacion: DetalleDeLaLiquidacion
  alDesmarcar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const largo = motivo.trim().length
  const problema =
    largo < MOTIVO_MINIMO_PARA_DESMARCAR
      ? `Escribe por qué se desmarca (al menos ${MOTIVO_MINIMO_PARA_DESMARCAR} caracteres).`
      : largo > MOTIVO_MAXIMO_PARA_DESMARCAR
        ? `El motivo va en ${MOTIVO_MAXIMO_PARA_DESMARCAR} caracteres como máximo.`
        : null

  // Un back anterior no dice si se puede: no se ofrece.
  if (l.desmarcarDisponible === undefined) return null
  if (!l.desmarcarDisponible) {
    return (
      <p className="text-body-sm text-fg-muted mt-4" data-testid="desmarcar-sin-migracion">
        Desmarcar «girada» todavía no está habilitado en esta base (falta la migración de la bitácora del giro,
        que aplica Víctor).
      </p>
    )
  }

  async function confirmar() {
    if (problema) return
    setEnviando(true)
    setError(null)
    try {
      await desmarcarGirada(l.id, motivo)
      setAbierto(false)
      setMotivo('')
      alDesmarcar()
    } catch (err) {
      setError(
        mensajeDelAdmin(err, {
          accion: 'desmarcar la liquidación como girada',
          porDefecto: 'No se pudo desmarcar la liquidación.',
        }),
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4">
      {!abierto ? (
        <Button variant="outline" hideArrow type="button"  onClick={() => setAbierto(true)} data-testid="desmarcar-girada">
          Desmarcar como girada
        </Button>
      ) : null}
      <Presence show={abierto}>
        <Card className="p-4 " data-testid="confirmar-desmarcar">
          <p className="text-body-sm text-fg">
            La liquidación {l.numero} vuelve a «generada»: deja de decir que Leasefy le giró {pesos(l.netoCop)} a{' '}
            {l.inmobiliaria ?? 'la inmobiliaria'} el {l.giradaEl ? fmtFecha(l.giradaEl) : '—'}. Queda escrito en la bitácora del giro con tu
            motivo.
          </p>
          <label className="block mt-3">
            <Etiqueta>¿por qué se desmarca?</Etiqueta>
            <textarea
              className="input mt-1 min-h-[5rem]"
              value={motivo}
              maxLength={MOTIVO_MAXIMO_PARA_DESMARCAR}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por ejemplo: el banco rechazó la transferencia"
              data-testid="motivo-de-desmarcar"
            />
          </label>
          <p className="text-body-sm text-fg-muted mt-1 tabular-nums">
            {largo} de {MOTIVO_MAXIMO_PARA_DESMARCAR}
          </p>
          {problema && largo > 0 ? <p className="text-body-sm text-danger mt-1">{problema}</p> : null}
          <div className="flex gap-2 mt-3">
            <Button hideArrow type="button"
              
              disabled={enviando || problema !== null}
              onClick={() => void confirmar()}
              data-testid="confirmar-desmarcar-si"
            >
              {enviando ? 'Guardando…' : 'Sí, desmarcar'}
            </Button>
            <Button variant="ghost" hideArrow type="button"
              
              disabled={enviando}
              onClick={() => {
                setAbierto(false)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
          <ErrorDeLaAccion mensaje={error} testId="error-de-desmarcar" />
        </Card>
      </Presence>
    </div>
  )
}

/** La bitácora del giro (ola E, E6): cada vez que se marcó o se desmarcó, la más reciente primero. */
function HistoriaDelGiro({ historia }: { historia: MovimientoDelGiro[] }) {
  return (
    <div className="mt-5" data-testid="historia-del-giro">
      <Etiqueta>historia del giro</Etiqueta>
      <ul className="mt-2 space-y-1.5 text-body-sm">
        {historia.map((h, i) => (
          <li key={`${h.accion}-${h.at ?? i}`} className="text-fg">
            {h.accion === 'marcada' ? (
              <>
                Marcada como girada el {h.giradaEl ? fmtFecha(h.giradaEl) : '—'}
                {h.referenciaBancaria ? ` (comprobante ${h.referenciaBancaria})` : ''}
              </>
            ) : (
              <>
                Desmarcada: <span className="text-fg-muted">«{h.motivo ?? ''}»</span>
              </>
            )}
            <span className="text-fg-muted">
              {' '}
              · {h.por}
              {h.at ? `, ${fmtDateTime(h.at)}` : ''}
              {h.fechaDelGiroAntes && h.fechaDelGiroDespues && h.fechaDelGiroAntes !== h.fechaDelGiroDespues
                ? ` · fecha del giro ${fmtFecha(h.fechaDelGiroAntes)} → ${fmtFecha(h.fechaDelGiroDespues)}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

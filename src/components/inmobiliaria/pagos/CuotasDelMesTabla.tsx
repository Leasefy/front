'use client'

/**
 * CuotasDelMesTabla — las CUOTAS de un mes en LA tabla de la casa.
 *
 * Reemplaza a `CobrosDelMesTabla`, que listaba `Cobro`. El cambio no es de
 * columnas: es de unidad. Nico (2026-09-16), mirando la pantalla vacía sobre
 * 30.951 cuotas: «el cobro ya está generado, porque en el estado de cuenta el
 * usuario debe pagar en varias etapas […] no es que le dé cobrar para poder
 * que paguen». Un `Cobro` es el DOCUMENTO con el que finanzas reclama; la
 * deuda vive en la cuota del contrato y existe desde la firma. Listar cobros
 * dejaba la tabla en cero en la inmobiliaria migrada, que tiene cero.
 *
 * Las primitivas son las mismas que Agenda, Inquilinos y el resto del panel:
 * `Table` + `useTablePagination` + `TablePagination`, sin título encima («no
 * nombramos las tablas»), y con el vacío DENTRO del `<TableBody>` para que los
 * encabezados se sigan viendo.
 *
 * 🔴 La columna «Estado» dice EN QUÉ CAJÓN está la cuota, con las mismas
 * palabras que «Cartera por concepto» (`CarteraPorConcepto.tsx`): por vencer ·
 * vencido, en plazo · cartera. Pintar «vencido dentro del plazo» igual que
 * «cartera» es cómo se termina llamando a alguien que está usando el plazo que
 * la inmobiliaria misma le dio, con la Ley 2300 de por medio.
 *
 * ── 🔴 De acá se sale al ESTADO DE CUENTA (Nico, 2026-09-16) ────────────────
 *
 * «Sigo preguntando si eso está con estado de cuenta atado, y ya te he
 * explicado tantas veces que **eso va atado al estado de cuenta**.» La pantalla
 * del estado de cuenta existía desde el 13-09 y su única puerta era la tarjeta
 * resumida de las fichas (contrato, propietario, inquilino): desde Pagos, donde
 * se trabaja la plata, no se llegaba. Esta fila es el lugar más natural
 * para abrirla —es una cuota del mes, o sea un renglón del estado de cuenta de
 * alguien—, así que el nombre del inquilino es el enlace.
 *
 * Con quién se abre lo decide `refDelInquilino`: la cuenta del portal si la
 * tiene, si no el DOCUMENTO (que es lo normal en lo migrado). Sin ninguno de
 * los dos el nombre va en texto plano: un enlace que lleva a un 404 enseña que
 * la pantalla no sirve.
 *
 * Sólo pinta. Cargando y fallo los resuelve `EstadoDeDatos` en el panel.
 */

import Link from 'next/link'
import { CurrencyCircleDollar } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { SinDatos } from '@/components/estado/SinDatos'
import { useTablePagination } from '@/lib/hooks/use-table-pagination'
import { refDelInquilino } from '@/lib/estado-de-cuenta/con-quien-se-abre'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { rotuloDelContrato } from '@/lib/cartera/conceptos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'
import type { CajonDeLaCuota, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { cn } from '@/lib/utils'
import { CLAVE_DE_MORA, interesPendiente } from '@/components/cartera/interes-de-mora'

/**
 * Cómo se lee cada cajón. Las palabras son las de la pantalla de cartera, no
 * unas nuevas: el mismo hecho tiene que llamarse igual en las dos.
 */
export const NOMBRE_DEL_CAJON: Record<CajonDeLaCuota, string> = {
  CARTERA: 'Cartera',
  VENCIDA_EN_PLAZO: 'Vencido, en plazo',
  POR_VENCER: 'Por vencer',
  SIN_DEUDA: 'Pagada',
}

const VARIANTE_DEL_CAJON: Record<
  CajonDeLaCuota,
  'destructive' | 'warning' | 'secondary' | 'success'
> = {
  CARTERA: 'destructive',
  VENCIDA_EN_PLAZO: 'warning',
  POR_VENCER: 'secondary',
  SIN_DEUDA: 'success',
}

/**
 * `vence` llega como 'YYYY-MM-DD' (el back ya lo recortó del `@db.Date`).
 * Se construye en hora LOCAL a partir de sus tres componentes: pasarlo por
 * `new Date(iso)` y formatearlo en Colombia (UTC-5) lo corre al día anterior.
 */
export function fechaLocal(iso: string, locale: 'es' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const VOLVER_A = '/panel/inmobiliaria/pagos'

/**
 * El nombre del inquilino, que es la puerta a su estado de cuenta cuando se le
 * puede identificar. Sin referencia se pinta igual, pero sin enlace.
 */
function EnlaceAlEstadoDeCuenta({ fila }: { fila: FilaDeLaCuotaDelMes }) {
  const nombre = fila.inquilino ?? 'Sin nombre en el contrato'
  const ref = refDelInquilino(fila)
  if (!ref) {
    return <p className="truncate font-medium text-fg">{nombre}</p>
  }
  return (
    <Link
      href={`${rutaDelEstadoDeCuenta('inquilino', ref)}?volver=${encodeURIComponent(VOLVER_A)}`}
      data-testid="cuota-estado-de-cuenta"
      title={`Ver el estado de cuenta de ${nombre}`}
      className="block truncate font-medium text-fg underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      {nombre}
    </Link>
  )
}

export interface CuotasDelMesTablaProps {
  /** TODAS las filas a mostrar; la tabla pagina sola. */
  filas: readonly FilaDeLaCuotaDelMes[]
  /** 'YYYY-MM'. Cambiar de mes (o de filtro) vuelve a la página 1. */
  mes: string
  /** ¿Hay búsqueda o pestaña de cajón puestas? Distingue los dos vacíos. */
  hayFiltros?: boolean
  onLimpiarFiltros?: () => void
  /**
   * 🔴 Sin marco propio: la tabla vive DENTRO de otra tarjeta, que ya trae el
   * borde y el redondeo (Nico, 18-09: «esto tiene que hacer parte de la
   * tabla»). Dos bordes anidados a 1 px de distancia se leen como dos cajas.
   */
  sinMarco?: boolean
}

const COLUMNAS = 6

export function CuotasDelMesTabla({
  filas,
  mes,
  hayFiltros = false,
  onLimpiarFiltros,
  sinMarco = false,
}: CuotasDelMesTablaProps) {
  const { locale, t } = useI18n()
  const idioma = locale === 'es' ? 'es' : 'en'

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, { initialPageSize: 10, resetKey: `${mes}|${hayFiltros}` })

  return (
    <div
      className={cn(
        'overflow-hidden bg-surface',
        sinMarco ? '' : 'rounded-lg border border-border',
      )}
      data-testid="pagos-cuotas-tabla"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Inquilino</TableHead>
            <TableHead className="whitespace-nowrap">Inmueble</TableHead>
            <TableHead className="whitespace-nowrap">Período</TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              Se debe
            </TableHead>
            <TableHead className="whitespace-nowrap" numeric>
              Pagado / falta
            </TableHead>
            <TableHead className="whitespace-nowrap">Vence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                {/*
                  🔴 El vacío NO puede decir «todavía no hay cobros»: con
                  contratos vigentes SÍ hay deuda. Un mes sin ninguna cuota es
                  un mes que nadie generó, y eso es lo que se dice.
                */}
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="cuotas"
                  icono={CurrencyCircleDollar}
                  titulo="Ningún contrato tiene cuota de este mes"
                  descripcion="La deuda nace con el contrato: si no hay ni una cuota, es que todavía no se generó la tabla de amortización de ningún contrato vigente."
                  onLimpiarFiltros={hayFiltros ? onLimpiarFiltros : undefined}
                />
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((f) => (
              <TableRow key={f.cuotaId} data-testid="cuota-fila">
                <TableCell>
                  <EnlaceAlEstadoDeCuenta fila={f} />
                  <p className="truncate text-caption text-fg-muted">
                    {f.documento ? `CC ${f.documento}` : ''}
                    {f.contrato ? rotuloDelContrato(f) : ''}
                  </p>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <p className="truncate text-fg">{f.inmueble}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {nombreDelMes(f.mes, idioma, 'short')}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums" numeric>
                  <span className="font-medium text-fg">{formatCurrency(f.totalCop)}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums" numeric>
                  <span
                    className={cn(
                      'font-medium',
                      f.pagadoCop > 0 ? 'text-success' : 'text-fg-muted',
                    )}
                  >
                    {formatCurrency(f.pagadoCop)}
                  </span>
                  <p
                    className={cn(
                      'text-caption',
                      f.enMora ? 'text-danger' : 'text-fg-muted',
                    )}
                  >
                    {formatCurrency(f.pendienteCop)}
                  </p>
                  {/* 🔴 El interés, aparte del capital. Una cuota ya pagada que
                      lo sigue debiendo tiene «falta $0» y esta línea. */}
                  {interesPendiente(f) > 0 && (
                    <p className="text-caption text-danger" data-testid="cuota-intereses">
                      {t(CLAVE_DE_MORA.masIntereses, {
                        monto: formatCurrency(interesPendiente(f)),
                      })}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="block tabular-nums text-fg-muted">
                    {fechaLocal(f.vence, idioma)}
                  </span>
                  {/*
                    El cajón, con su matiz: la cartera dice cuántos días lleva
                    y lo vencido en plazo dice cuántos días le quedan. Son dos
                    hechos distintos y se escriben distinto.
                  */}
                  <Badge variant={VARIANTE_DEL_CAJON[f.cajon]} className="mt-1">
                    {f.enSiniestro ? 'En siniestro' : NOMBRE_DEL_CAJON[f.cajon]}
                  </Badge>
                  {f.cajon === 'CARTERA' && (
                    <p className="text-caption text-danger">
                      {f.diasDeMora} {f.diasDeMora === 1 ? 'día' : 'días'} de mora
                    </p>
                  )}
                  {f.cajon === 'VENCIDA_EN_PLAZO' && (
                    <p className="text-caption text-fg-muted">
                      plazo de {f.diasDePlazo} {f.diasDePlazo === 1 ? 'día' : 'días'}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3" data-testid="pagos-cuotas-pie">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}

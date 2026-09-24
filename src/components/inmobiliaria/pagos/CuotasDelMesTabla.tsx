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
 * ── 🔴 Y el 21-09: LA FILA ABRE UN CAJÓN, y las acciones van en un kebab ────
 *
 * Nico: «no le hiciste el detalle al dar clic en un drawer» y «¿por qué no usas
 * al lado derecho el kebab menu para agregar acciones?».
 *
 * Antes el único clic que hacía algo era el del nombre, y se iba de la
 * pantalla: para responder «¿por qué éste está en cartera?» había que
 * abandonar la lista —perdiendo el filtro y la página— y volver. Ahora:
 *
 *   · **la fila entera** abre `CuotaDelMesCajon` con todo su detalle;
 *   · **el kebab** de la última columna junta lo que se puede hacer con esa
 *     fila (ver el detalle, abrir el estado de cuenta). Un enlace azul suelto
 *     debajo del nombre no escala: la segunda acción no tiene dónde ponerse.
 *
 * El nombre deja de ser un enlace, y es a propósito: con la fila abriendo el
 * cajón, un enlace adentro de la fila es un segundo destino en el mismo clic —
 * el usuario no puede saber cuál le va a tocar.
 *
 * Sólo pinta. Cargando y fallo los resuelve `EstadoDeDatos` en el panel.
 */

import { useState } from 'react'
import Link from 'next/link'
import { CurrencyCircleDollar, DotsThreeVertical } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { cn } from '@/lib/utils'
import { CLAVE_DE_MORA, interesPendiente } from '@/components/cartera/interes-de-mora'
import { CuotaDelMesCajon } from './CuotaDelMesCajon'
import { NOMBRE_DEL_CAJON, VARIANTE_DEL_CAJON, fechaLocal } from './cajon-de-la-cuota'

const VOLVER_A = '/panel/inmobiliaria/pagos'

/**
 * ¿Se le puede abrir el estado de cuenta? Lo decide el `tenantRef`: la cuenta
 * del portal si la tiene, si no el documento. Sin ninguno de los dos, la acción
 * no se ofrece — mandar a `/estado-de-cuenta/inquilino/undefined` para que el
 * back conteste 404 es peor que no ofrecerla, y el cajón dice por qué falta.
 */
function hrefDelEstadoDeCuenta(fila: FilaDeLaCuotaDelMes): string | null {
  const ref = refDelInquilino(fila)
  if (!ref) return null
  return `${rutaDelEstadoDeCuenta('inquilino', ref)}?volver=${encodeURIComponent(VOLVER_A)}`
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

/** Las seis de datos más la del kebab. */
const COLUMNAS = 7

export function CuotasDelMesTabla({
  filas,
  mes,
  hayFiltros = false,
  onLimpiarFiltros,
  sinMarco = false,
}: CuotasDelMesTablaProps) {
  const { locale, t } = useI18n()
  const idioma = locale === 'es' ? 'es' : 'en'
  /** La fila abierta en el cajón. `null` = cerrado. */
  const [abierta, setAbierta] = useState<FilaDeLaCuotaDelMes | null>(null)

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
            {/* La del kebab. Sin rótulo: nombrar «Acciones» gasta ancho para
                decir lo que el icono ya dice. */}
            <TableHead className="w-10" />
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
              <TableRow
                key={f.cuotaId}
                data-testid="cuota-fila"
                onClick={() => setAbierta(f)}
                className="cursor-pointer"
                /* Con teclado también: una fila que sólo abre con el mouse deja
                   la pantalla sin su única salida al detalle. */
                tabIndex={0}
                role="button"
                aria-label={`Ver el detalle de la cuota de ${f.inquilino ?? 'este contrato'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setAbierta(f)
                  }
                }}
              >
                <TableCell>
                  <p className="truncate font-medium text-fg">
                    {f.inquilino ?? 'Sin nombre en el contrato'}
                  </p>
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

                {/* 🔴 El kebab de acciones (Nico, 21-09). `stopPropagation` en
                    la celda: sin eso, abrir el menú abre TAMBIÉN el cajón —el
                    clic sube a la fila— y el menú queda detrás. */}
                <TableCell
                  className="w-10 align-top"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownList>
                    <DropdownListTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        hideArrow
                        className="h-8 w-8"
                        aria-label={`Acciones de la cuota de ${f.inquilino ?? 'este contrato'}`}
                        data-testid="cuota-kebab"
                      >
                        <DotsThreeVertical className="h-4 w-4" weight="bold" aria-hidden="true" />
                      </Button>
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-52">
                      <DropdownListItem onClick={() => setAbierta(f)}>
                        Ver el detalle
                      </DropdownListItem>
                      {/* Sólo si se le puede identificar: una acción que lleva a
                          un 404 enseña que la pantalla no sirve. El cajón
                          explica por qué no está. */}
                      {/* Va como enlace y no como `router.push`: es
                          navegación, así que abrir en otra pestaña, copiar la
                          dirección y el clic con la rueda tienen que funcionar
                          — con un `onClick` no funciona ninguno de los tres. */}
                      {hrefDelEstadoDeCuenta(f) ? (
                        <DropdownListItem asChild>
                          <Link
                            href={hrefDelEstadoDeCuenta(f) as string}
                            data-testid="cuota-estado-de-cuenta"
                          >
                            Estado de cuenta del cliente
                          </Link>
                        </DropdownListItem>
                      ) : null}
                    </DropdownListContent>
                  </DropdownList>
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

      {/* El detalle de la fila. Lee la MISMA fila que la tabla: no pide nada al
          back y por eso no puede contradecirla. */}
      <CuotaDelMesCajon
        fila={abierta}
        onCerrar={() => setAbierta(null)}
        volverA={VOLVER_A}
      />
    </div>
  )
}

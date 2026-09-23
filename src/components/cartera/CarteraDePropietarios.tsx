'use client'

/**
 * Lo que la inmobiliaria le debe a cada propietario, mes por mes.
 *
 * ── El pedido, textual (Nico, 2026-09-12) ───────────────────────────────────
 *
 * «Y cuánto le debe la inmobiliaria al propietario, por mes. Para analizar
 * flujo de caja. Esos deben de ser módulos.»
 *
 * ── De dónde sale el número ─────────────────────────────────────────────────
 *
 * Del MISMO cálculo que hace la dispersión (`preview`/`generate` en el back):
 * canon CAUSADO a su nombre (sin dispersión generada el back liquida con esa
 * base: lo que el contrato causa en el mes, pagado o no) + conceptos a su
 * favor − comisión − conceptos a su cargo. No se rehace acá: tres cuentas distintas para la misma plata fue
 * exactamente lo que hubo que arreglar entre el extracto y la dispersión.
 *
 * Un mes que ya tiene dispersión generada muestra ESA, con su estado; un mes
 * que todavía no la tiene muestra el neto que se giraría hoy, marcado «sin
 * generar». Girado = ya no se debe.
 *
 * ── Los conceptos del contrato son de DOS tipos (Nico, 22:05) ───────────────
 *
 * «El que es para el PROPIETARIO va directo a una deducción en el egreso; el
 * que es para el INQUILINO se suma al recibo de caja.» Por eso los que se le
 * cobran al dueño viven acá, en la columna «A su cargo», restando del neto —y
 * no en la cartera del inquilino, que es la otra pestaña—. Una reparación no
 * se le factura a nadie: se le descuenta al propietario.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Deberle al propietario lo que el inquilino no pagó.** Una inmobiliaria
 *    que garantiza el canon lo giraría igual, pero eso es un acuerdo que el
 *    sistema no modela y no se inventa en una tabla de flujo de caja.
 * 2. **Callar un mes que no se pudo liquidar.** La liquidación se niega a
 *    repartir impuestos entre copropietarios; ese mes sale con su aviso y con
 *    lo que sí tiene dispersión, en vez de aparecer en cero.
 *
 * ── 🔴 De cada fila se sale al ESTADO DE CUENTA (Nico, 2026-09-16) ──────────
 *
 * Es la cara PROPIETARIOS del mismo documento: un propietario con 15 contratos
 * tiene UN estado de cuenta (CEO, 13-09). Acá siempre se puede abrir, porque
 * la fila trae `propietarioId` — a diferencia del inquilino, que muchas veces
 * sólo tiene documento.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CaretDown, CaretRight, MagnifyingGlass, Users, Warning } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { PropietariosQueDeben } from '@/components/cartera/PropietariosQueDeben'
import { SinDatos } from '@/components/estado/SinDatos'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraConPropietarios } from '@/lib/hooks/use-cartera'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import type { MesDelPropietario, PropietarioEnCartera } from '@/lib/api/cartera.types'
import { NOMBRE_DEL_ESTADO_DEL_GIRO, filtrarPropietarios } from '@/lib/cartera/conceptos'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

/** Columnas fijas: propietario · meses · neto · girado · pendiente. */
const COLUMNAS = 5

function Peso({ valor, className }: { valor: number; className?: string }) {
  if (valor === 0) {
    return (
      <span className="text-fg-subtle" aria-label="cero">
        —
      </span>
    )
  }
  return (
    <span className={cn('font-mono tabular-nums', className)}>{formatCurrency(valor)}</span>
  )
}

export function CarteraDePropietarios() {
  const { t } = useI18n()
  const { datos, cargando, error, recargar } = useCarteraConPropietarios()
  const [busqueda, setBusqueda] = useState('')
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())

  const propietarios = useMemo(
    () => filtrarPropietarios(datos?.propietarios ?? [], busqueda),
    [datos, busqueda],
  )
  const visibles = useMemo(
    () =>
      propietarios.reduce(
        (acumulado, p) => ({
          netoCop: acumulado.netoCop + p.totales.netoCop,
          giradoCop: acumulado.giradoCop + p.totales.giradoCop,
          pendienteCop: acumulado.pendienteCop + p.totales.pendienteCop,
        }),
        { netoCop: 0, giradoCop: 0, pendienteCop: 0 },
      ),
    [propietarios],
  )

  const hayFiltros = busqueda.trim().length > 0
  const paginado = useTablePagination(propietarios, { resetKey: busqueda })

  const alternar = (id: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      queEs="lo que le debemos a los propietarios"
      onReintentar={recargar}
      esqueleto={
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <div className="space-y-6">
        <div
          className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          data-testid="resumen-por-pagar"
        >
          <div className="p-4">
            <p className="text-xs text-fg-muted">Pendiente de girar</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(datos?.totales.pendienteCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {datos?.propietarios.length ?? 0}{' '}
              {datos?.propietarios.length === 1 ? 'propietario' : 'propietarios'} ·{' '}
              {datos?.meses.length ?? 0} {datos?.meses.length === 1 ? 'mes' : 'meses'}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-muted">Ya girado</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg-muted">
              {formatCurrency(datos?.totales.giradoCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">Dispersiones completadas</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-muted">Neto liquidado</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(datos?.totales.netoCop ?? 0)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">Girado más pendiente</p>
          </div>
        </div>

        {/* Los meses que no se pudieron liquidar, con su porqué. */}
        {datos?.avisos.length ? (
          <div
            className="rounded-lg border border-border bg-warning-soft p-4 text-sm text-fg"
            data-testid="avisos-de-liquidacion"
          >
            <p className="flex items-center gap-2 font-medium text-warning">
              <Warning className="h-4 w-4" aria-hidden="true" />
              Hay meses que no se pudieron liquidar completos
            </p>
            <ul className="mt-2 space-y-1">
              {datos.avisos.map((aviso) => (
                <li key={aviso.month}>
                  <span className="font-medium">{mesEnTitulo(aviso.month)}:</span> {aviso.mensaje}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Propietario"
                aria-label="Buscar un propietario"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-propietario"
              />
            </div>
          </div>

          <Table data-testid="tabla-por-pagar">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Propietario</TableHead>
                <TableHead className="whitespace-nowrap text-right">Meses</TableHead>
                <TableHead className="whitespace-nowrap text-right">Neto</TableHead>
                <TableHead className="whitespace-nowrap text-right">Girado</TableHead>
                <TableHead className="whitespace-nowrap text-right">Se le debe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginado.pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS} className="p-0">
                    <SinDatos
                      hayFiltros={hayFiltros}
                      queSon="propietarios por pagar"
                      icono={Users}
                      titulo="No le debes nada a nadie"
                      descripcion={t('cartera.porPagar.nadaQueRepartir')}
                      onLimpiarFiltros={hayFiltros ? () => setBusqueda('') : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginado.pageItems.map((propietario) => (
                  <FilasDelPropietario
                    key={propietario.propietarioId}
                    propietario={propietario}
                    abierto={abiertos.has(propietario.propietarioId)}
                    onAlternar={() => alternar(propietario.propietarioId)}
                  />
                ))
              )}
            </TableBody>
            {paginado.pageItems.length > 0 ? (
              <TableFooter>
                <TableRow data-testid="totales-por-pagar">
                  <TableCell className="font-medium text-fg">
                    {hayFiltros ? 'Total de lo filtrado' : 'Total'}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right text-fg-muted">
                    <Peso valor={visibles.netoCop} />
                  </TableCell>
                  <TableCell className="text-right text-fg-muted">
                    <Peso valor={visibles.giradoCop} />
                  </TableCell>
                  <TableCell className="text-right font-semibold text-fg">
                    <Peso valor={visibles.pendienteCop} />
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>

          {paginado.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginado.total}
                page={paginado.page}
                pageSize={paginado.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginado.setPage}
                onPageSizeChange={paginado.setPageSize}
              />
            </div>
          )}
        </section>

        {/* El otro sentido: los que le deben a la inmobiliaria (se les cobra). */}
        <PropietariosQueDeben />

        {/*
          🔴 El pie tiene que decir la base que de verdad se usa. Sin dispersión
          generada, el back liquida con base CAUSADO (`liquidacionDelMes`): lo
          que el contrato causa en el mes, lo haya pagado el inquilino o no. Decía
          «sólo se le debe lo que el inquilino efectivamente pagó», que es la base
          RECAUDADO. La base no se cambia acá —la decide Nico—; se dice la verdad.
          Convención compartida: «Canon causado» con CAUSADO, «Canon recaudado»
          sólo con RECAUDADO.
        */}
        <p className="text-xs text-fg-muted" data-testid="pie-de-la-base">
          {t('cartera.porPagar.pieCausado')}
        </p>
      </div>
    </EstadoDeDatos>
  )
}

/** A dónde vuelve el estado de cuenta que se abra desde esta tabla. */
const VOLVER_A = '/panel/inmobiliaria/pagos/cartera/por-pagar'

function FilasDelPropietario({
  propietario,
  abierto,
  onAlternar,
}: {
  propietario: PropietarioEnCartera
  abierto: boolean
  onAlternar: () => void
}) {
  const Caret = abierto ? CaretDown : CaretRight
  return (
    <>
      <TableRow data-testid="fila-propietario">
        <TableCell>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            className="flex items-center gap-2 text-left font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Caret className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
            {propietario.nombre || 'Sin nombre'}
          </button>
          {/* Fuera del `button`: un enlace no vive dentro de otro control.
              Alineado con el nombre (el caret ocupa ~24 px). */}
          <Link
            href={`${rutaDelEstadoDeCuenta('propietario', propietario.propietarioId)}?volver=${encodeURIComponent(VOLVER_A)}`}
            data-testid="propietario-estado-de-cuenta"
            title={`Ver el estado de cuenta de ${propietario.nombre || 'este propietario'}`}
            className="ml-6 mt-0.5 inline-block text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Estado de cuenta
          </Link>
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums text-fg-muted">
          {propietario.meses.length}
        </TableCell>
        <TableCell className="text-right text-fg-muted">
          <Peso valor={propietario.totales.netoCop} />
        </TableCell>
        <TableCell className="text-right text-fg-muted">
          <Peso valor={propietario.totales.giradoCop} />
        </TableCell>
        <TableCell className="text-right font-medium text-fg">
          <Peso valor={propietario.totales.pendienteCop} />
        </TableCell>
      </TableRow>

      {abierto ? (
        <TableRow className="bg-surface-muted/40">
          <TableCell colSpan={COLUMNAS} className="px-4 py-3">
            <DetalleDeMeses meses={propietario.meses} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

/**
 * El mes a mes de un propietario: de qué está hecho su neto.
 *
 * Va como tabla anidada y no como más columnas de la de arriba porque son
 * ocho cifras por mes; metidas en la tabla principal, el propietario —que es
 * lo que se busca— quedaría empujado fuera de la pantalla.
 */
function DetalleDeMeses({ meses }: { meses: readonly MesDelPropietario[] }) {
  const { t } = useI18n()
  return (
    <Table data-testid="detalle-de-meses">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Mes</TableHead>
          <TableHead className="whitespace-nowrap text-right">{t('cartera.porPagar.canonCausado')}</TableHead>
          <TableHead className="whitespace-nowrap text-right">Comisión</TableHead>
          <TableHead className="whitespace-nowrap text-right">IVA comisión</TableHead>
          <TableHead className="whitespace-nowrap text-right">A su favor</TableHead>
          <TableHead className="whitespace-nowrap text-right">A su cargo</TableHead>
          <TableHead className="whitespace-nowrap text-right">Neto</TableHead>
          <TableHead className="whitespace-nowrap">Estado</TableHead>
          <TableHead className="whitespace-nowrap text-right">Se le debe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meses.map((mes) => (
          <TableRow key={mes.month}>
            <TableCell className="whitespace-nowrap text-fg">{mesEnTitulo(mes.month)}</TableCell>
            <TableCell className="text-right text-fg">
              <Peso valor={mes.recaudadoCop} />
            </TableCell>
            {/* La comisión y lo que se le cobra al dueño RESTAN: van con signo. */}
            <TableCell className="text-right text-fg-muted">
              <Peso valor={-mes.comisionCop} />
            </TableCell>
            {/* 🔴 22-09: el IVA de la comisión en su columna; el back dejó de
                esconderlo en «a su cargo». */}
            <TableCell className="text-right text-fg-muted" data-testid="detalle-iva-comision">
              <Peso valor={-(mes.ivaComisionCop ?? 0)} />
            </TableCell>
            {/* Lo que el dueño le retuvo a la comisión le SUMA: va con lo que
                es a su favor, para que la fila siga cerrando contra el neto. */}
            <TableCell className="text-right text-fg-muted">
              <Peso valor={mes.conceptosAFavorCop + (mes.retencionesComisionCop ?? 0)} />
            </TableCell>
            <TableCell className="text-right text-fg-muted">
              <Peso valor={-mes.conceptosACargoCop} />
            </TableCell>
            <TableCell className="text-right font-medium text-fg">
              <Peso valor={mes.netoCop} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-fg-muted">
              {NOMBRE_DEL_ESTADO_DEL_GIRO[mes.estado]}
            </TableCell>
            <TableCell className="text-right text-fg">
              <Peso valor={mes.pendienteCop} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

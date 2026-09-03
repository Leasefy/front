'use client'

/**
 * La cartera entera en una pantalla, discriminada por edad de la deuda.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El dato ya se calculaba: `GET /inmobiliaria/reports/cartera` devuelve cada
 * deuda con sus días de mora. Pero en pantalla vivía dentro de Reportes → una
 * pestaña avanzada → una sub-pestaña, y ahí el adaptador la cortaba con
 * `.slice(0, 10)`. Con 1.200 contratos se veían diez.
 *
 * Una inmobiliaria que se pasa a Leasefy trae su cartera viva. Si no puede
 * verla completa el primer día, no se pasa.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Sumar «por vencer» dentro de la mora.** El back agrupa por
 *    `daysLate <= 30`, y lo que aún no vence tiene `daysLate = 0`. Acá van
 *    separados: plata que va a entrar no es plata que hay que ir a buscar.
 * 2. **Pintar un error como una cartera vacía.** «Nadie te debe nada» y «no
 *    pudimos preguntar» se ven idénticos si se muestra la misma pantalla.
 * 3. **Decir «sin resultados» cuando lo que hay es un filtro puesto.** Son dos
 *    vacíos distintos y se resuelven distinto.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CurrencyCircleDollar, MagnifyingGlass, Users } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { CarteraTable } from '@/components/cartera/CarteraTable'
import { EnSiniestro } from '@/components/cartera/EnSiniestro'
import { useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraReport } from '@/lib/hooks/useInmobiliaria'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  discriminar,
  edadDe,
  porPropietario,
  EDADES,
  NOMBRE_DE_EDAD,
  QUE_SIGNIFICA,
  type Edad,
} from '@/lib/cartera/edades'
import { cn } from '@/lib/utils'

const TONO: Record<Edad, string> = {
  por_vencer: 'text-muted-foreground',
  '1-30': 'text-foreground',
  '31-60': 'text-warning',
  '61-90': 'text-warning',
  '90+': 'text-destructive',
}

export function CarteraCompleta() {
  const { report, isLoading, error, errorCrudo, refetch } = useCarteraReport()
  const [edad, setEdad] = useState<Edad | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'deudas' | 'propietarios'>('deudas')
  const router = useRouter()

  const items = useMemo<CarteraItem[]>(() => report?.items ?? [], [report])
  const cartera = useMemo(() => discriminar(items), [items])
  const propietarios = useMemo(() => porPropietario(items), [items])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((i) => {
      if (edad && edadDe(i) !== edad) return false
      if (!q) return true
      return [i.tenantName, i.propertyTitle, i.propertyAddress, i.propietarioName]
        .filter(Boolean)
        .some((t) => t!.toLowerCase().includes(q))
    })
  }, [items, edad, busqueda])

  /*
   * Paginado en cliente, con el hook que ya usan Inquilinos y Habeas Data: el
   * reporte llega entero (una fila por cobro) y el recorte es de presentación.
   * `resetKey` la manda a la página 1 cuando cambia un filtro — sin eso,
   * elegir un tramo estando en la página 4 deja la tabla en blanco y se lee
   * como «no hay nada».
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(
    filtradas,
    { initialPageSize: 10, resetKey: `${edad ?? ''}|${busqueda}` },
  )

  /*
   * Los dos vacíos NO se distinguen por «la lista quedó corta», sino por si
   * hay algo puesto: un tramo elegido también es un filtro, no sólo la
   * búsqueda.
   */
  const hayFiltros = Boolean(edad) || busqueda.trim().length > 0

  /*
   * Cargando → falló → contenido, en ese orden y con el componente de la casa.
   *
   * Va por FUERA de los tramos a propósito: una cartera pintada en $0 mientras
   * todavía se está preguntando afirma «nadie te debe nada», que es lo
   * contrario de «no pudimos preguntar». `isLoading && !report` deja pasar el
   * refresco de fondo sin blanquear lo que ya se está viendo.
   */
  return (
    <EstadoDeDatos
      cargando={isLoading && !report}
      error={error ? (errorCrudo ?? new Error(error)) : null}
      queEs="la cartera"
      onReintentar={() => void refetch()}
    >
      <div className="space-y-6">
        {/* Los tramos. Cada uno es un filtro: la cifra y la lista son lo mismo. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cartera.tramos.map((t) => (
            <button
              key={t.edad}
              type="button"
              onClick={() => setEdad(edad === t.edad ? null : t.edad)}
              aria-pressed={edad === t.edad}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                edad === t.edad
                  ? 'border-primary bg-primary-soft/40'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <p className="text-xs text-muted-foreground">{NOMBRE_DE_EDAD[t.edad]}</p>
              <p className={cn('text-lg font-semibold tabular-nums', TONO[t.edad])}>
                {formatCurrency(t.monto)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.items.length} {t.items.length === 1 ? 'deuda' : 'deudas'}
              </p>
            </button>
          ))}
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">En mora</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(cartera.enMora)}
            </p>
            <p className="text-xs text-muted-foreground">
              {cartera.deudasEnMora}{' '}
              {cartera.deudasEnMora === 1 ? 'deuda vencida' : 'deudas vencidas'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Por vencer</p>
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(cartera.porVencer)}
            </p>
            {/* Se dice explícito: si no, se lee como mora y la infla. */}
            <p className="text-xs text-muted-foreground">Todavía no es mora</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={vista === 'deudas' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              onClick={() => setVista('deudas')}
            >
              Por deuda
            </Button>
            <Button
              variant={vista === 'propietarios' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              onClick={() => setVista('propietarios')}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Por propietario
            </Button>
          </div>
        </Card>

        {/* Los siniestros van aparte de la mora: ya no son cobranza. Sólo si
            el back los manda — uno anterior no tiene la sección. */}
        {report?.siniestros ? <EnSiniestro siniestros={report.siniestros} /> : null}

        {edad ? (
          <p className="text-sm text-muted-foreground">
            {QUE_SIGNIFICA[edad]}{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setEdad(null)}
            >
              Ver toda la cartera
            </button>
          </p>
        ) : null}

        {vista === 'propietarios' ? (
          <PorPropietario propietarios={propietarios} />
        ) : (
          <>
            <div className="relative max-w-sm">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Inquilino, inmueble o propietario"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {filtradas.length === 0 ? (
              /* Dos vacíos distintos: no deber nada es una buena noticia; no
                 encontrar nada con un filtro puesto se arregla quitándolo. Lo
                 decide `hayFiltros`, que sale del estado real de los filtros y
                 no de que la lista haya quedado corta. */
              <Card className="overflow-hidden">
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="cobros"
                  icono={CurrencyCircleDollar}
                  titulo="Nadie te debe nada"
                  descripcion="No hay cobros pendientes ni vencidos en toda la cartera."
                  onLimpiarFiltros={
                    hayFiltros
                      ? () => {
                          setEdad(null)
                          setBusqueda('')
                        }
                      : undefined
                  }
                />
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CarteraTable
                  items={pageItems}
                  onVerCobro={(i) =>
                    router.push(`/panel/inmobiliaria/cobros?cobro=${i.cobroId}`)
                  }
                />
                {/* El pie sólo aparece cuando hay más de una página: un paginador
                    sobre tres filas es ruido. */}
                {total > pageSize && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    <TablePagination
                      total={total}
                      page={page}
                      pageSize={pageSize}
                      pageSizeOptions={[10, 20, 50]}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </EstadoDeDatos>
  )
}

/**
 * La cartera por propietario.
 *
 * Es la pregunta que la inmobiliaria hace de verdad: no «cuánto se debe», sino
 * «a quién le estoy quedando mal». Un propietario con cuatro inmuebles en mora
 * se va — y eso no se ve en una lista ordenada por monto de cada deuda.
 */
function PorPropietario({
  propietarios,
}: {
  propietarios: ReturnType<typeof porPropietario>
}) {
  if (propietarios.length === 0) {
    return (
      <Card className="overflow-hidden">
        <SinDatos
          queSon="propietarios con deuda"
          icono={Users}
          titulo="Nadie te debe nada"
          descripcion="Ningún propietario tiene cobros pendientes."
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/30">
              <TableHead className="p-4 text-left">Propietario</TableHead>
              <TableHead className="p-4 text-right">Deudas</TableHead>
              <TableHead className="p-4 text-left">Lo peor</TableHead>
              <TableHead className="p-4 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propietarios.map((p) => (
              <TableRow
                key={p.propietarioId ?? 'sin'}
                className="border-b border-border/50"
              >
                <TableCell className="p-4 font-medium text-foreground">
                  {p.propietarioName}
                </TableCell>
                <TableCell className="p-4 text-right tabular-nums text-muted-foreground">
                  {p.deudas}
                </TableCell>
                <TableCell className="p-4">
                  <span className={cn('text-sm', TONO[p.peorEdad])}>
                    {NOMBRE_DE_EDAD[p.peorEdad]}
                  </span>
                </TableCell>
                <TableCell className="p-4 text-right font-medium tabular-nums text-foreground">
                  {formatCurrency(p.monto)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export { EDADES }

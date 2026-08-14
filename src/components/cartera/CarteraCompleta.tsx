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
import Link from 'next/link'
import {
  ArrowSquareOut,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Phone,
  Users,
  WhatsappLogo,
} from '@phosphor-icons/react'

import { Badge } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Spinner } from '@/components/ui'
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

const POR_PAGINA = 20

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
  const [pagina, setPagina] = useState(1)
  const [vista, setVista] = useState<'deudas' | 'propietarios'>('deudas')

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

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pagActual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice(
    (pagActual - 1) * POR_PAGINA,
    pagActual * POR_PAGINA,
  )

  // ── 1. Cargando ───────────────────────────────────────────────────────────
  if (isLoading && !report) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  /*
   * 2. Falló. NO se puede caer al estado vacío: una cartera vacía significa
   * «nadie te debe nada», que es justo lo contrario de «no pudimos preguntar».
   */
  if (error) {
    return (
      <FalloDeCarga
        error={errorCrudo ?? new Error(error)}
        queEs="la cartera"
        onReintentar={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Los tramos. Cada uno es un filtro: la cifra y la lista son lo mismo. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cartera.tramos.map((t) => (
          <button
            key={t.edad}
            type="button"
            onClick={() => {
              setEdad(edad === t.edad ? null : t.edad)
              setPagina(1)
            }}
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
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
            />
          </div>

          {filtradas.length === 0 ? (
            /* Dos vacíos distintos: no deber nada es una buena noticia; no
               encontrar nada con un filtro puesto se arregla quitándolo. */
            items.length === 0 ? (
              <EmptyState
                icon={CurrencyCircleDollar}
                title="Nadie te debe nada"
                description="No hay cobros pendientes ni vencidos en toda la cartera."
              />
            ) : (
              <EmptyState
                icon={MagnifyingGlass}
                title="Ninguna deuda coincide"
                description="Hay cartera, pero no con estos filtros."
                action={{
                  label: 'Quitar los filtros',
                  onClick: () => {
                    setEdad(null)
                    setBusqueda('')
                  },
                }}
              />
            )
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inquilino</TableHead>
                        <TableHead>Inmueble</TableHead>
                        <TableHead>Propietario</TableHead>
                        <TableHead>Mes</TableHead>
                        <TableHead className="text-right">Debe</TableHead>
                        <TableHead className="text-right">Mora</TableHead>
                        <TableHead className="text-right">Recordatorios</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibles.map((i) => (
                        <TableRow key={i.cobroId}>
                          <TableCell>
                            <span className="font-medium text-foreground">
                              {i.tenantName ?? 'Sin nombre'}
                            </span>
                            {i.tenantPhone ? (
                              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <a
                                  href={`tel:${i.tenantPhone}`}
                                  className="flex items-center gap-1 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {i.tenantPhone}
                                </a>
                                {/* En Colombia la cobranza pasa por WhatsApp
                                    antes que por una llamada. */}
                                <a
                                  href={`https://wa.me/57${i.tenantPhone.replace(/\D/g, '').slice(-10)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Escribir por WhatsApp"
                                  className="text-success hover:opacity-80"
                                >
                                  <WhatsappLogo className="h-3.5 w-3.5" weight="fill" />
                                  <span className="sr-only">WhatsApp</span>
                                </a>
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {i.propertyAddress ?? i.propertyTitle}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {i.propietarioName ?? (
                              <span className="text-warning">Sin consignar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {i.month}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-foreground">
                            {formatCurrency(i.pendingAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                i.daysLate > 60
                                  ? 'destructive'
                                  : i.daysLate > 0
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {i.daysLate > 0 ? `${i.daysLate} días` : 'Al día'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {i.remindersSent}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" hideArrow>
                              <Link href={`/panel/inmobiliaria/cobros?cobro=${i.cobroId}`}>
                                <ArrowSquareOut className="h-4 w-4" />
                                <span className="sr-only">Ver el cobro</span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {filtradas.length}{' '}
                  {filtradas.length === 1 ? 'deuda' : 'deudas'}
                  {filtradas.length !== items.length ? ` de ${items.length}` : ''}
                </p>
                {totalPaginas > 1 ? (
                  <Pagination
                    currentPage={pagActual}
                    totalPages={totalPaginas}
                    onPageChange={setPagina}
                  />
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
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
      <EmptyState
        icon={Users}
        title="Nadie te debe nada"
        description="Ningún propietario tiene cobros pendientes."
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propietario</TableHead>
              <TableHead className="text-right">Deudas</TableHead>
              <TableHead>Lo peor</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propietarios.map((p) => (
              <TableRow key={p.propietarioId ?? 'sin'}>
                <TableCell className="font-medium text-foreground">
                  {p.propietarioName}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {p.deudas}
                </TableCell>
                <TableCell>
                  <span className={cn('text-sm', TONO[p.peorEdad])}>
                    {NOMBRE_DE_EDAD[p.peorEdad]}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
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

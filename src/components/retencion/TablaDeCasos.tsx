'use client'

/**
 * La tabla de casos de Vinci — la misma en el tablero («Lo más urgente») y en
 * «Casos en riesgo». Patrón de tablas del panel (el de Contratos): `Table` del
 * DS, la fila entera abre el caso y el nombre es un enlace de verdad para el
 * teclado. En el teléfono quedan Quién y Riesgo; el porqué, el canon y el
 * plan aparecen a medida que hay ancho.
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaretRight } from '@phosphor-icons/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { PuntajeDeVinci, QUIEN } from '@/components/retencion/vinci'
import type { CasoDeVinci, PlanDelCaso } from '@/lib/types/retencion'

export const hrefDelCaso = (caseId: string) => `/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(caseId)}`

/** El estado del plan en palabras (el micro manda `activo` | `logrado` | `perdido` | `cancelado`). */
export const ESTADO_DEL_PLAN: Record<string, string> = {
  activo: 'Plan activo',
  logrado: 'Se quedó',
  perdido: 'Se fue',
  cancelado: 'Plan cancelado',
}

export function planEnPalabras(plan: PlanDelCaso | null): string {
  if (!plan) return 'Sin plan'
  const estado = ESTADO_DEL_PLAN[plan.estado] ?? plan.estado
  return plan.tareasAbiertas > 0
    ? `${estado} · ${plan.tareasAbiertas} ${plan.tareasAbiertas === 1 ? 'tarea abierta' : 'tareas abiertas'}`
    : estado
}

/** «Inquilino · contrato 123» o «Propietario · 3 inmuebles». */
export function quienEsElCaso(c: CasoDeVinci): string {
  if (c.poblacion === 'inquilino') {
    const numero = c.contratos[0]?.numero
    return numero ? `${QUIEN.inquilino} · contrato ${numero}` : QUIEN.inquilino
  }
  return `${QUIEN.propietario} · ${c.contratos.length} ${c.contratos.length === 1 ? 'inmueble' : 'inmuebles'}`
}

export function TablaDeCasos({
  casos,
  conPlan = false,
  vacio,
}: {
  casos: CasoDeVinci[]
  /** La columna del plan (la bandeja la trae; el tablero no). */
  conPlan?: boolean
  /** Lo que se ve sin filas (un `SinDatos`). */
  vacio: ReactNode
}) {
  const router = useRouter()
  if (casos.length === 0) return <>{vacio}</>
  return (
    <Table data-testid="vinci-casos">
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Quién</TableHead>
          <TableHead>Riesgo</TableHead>
          <TableHead className="hidden md:table-cell">Por qué</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Canon en juego</TableHead>
          {conPlan ? <TableHead className="hidden lg:table-cell">Plan</TableHead> : null}
          <TableHead className="w-10 pr-5">
            <span className="sr-only">Abrir</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {casos.map((c) => {
          const href = hrefDelCaso(c.caseId)
          return (
            <TableRow
              key={c.caseId}
              onClick={() => router.push(href)}
              className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
            >
              <TableCell className="py-4 pl-5">
                <Link
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-fg hover:underline"
                >
                  {c.nombre ?? 'Sin nombre registrado'}
                </Link>
                <p className="mt-0.5 text-caption text-fg-muted">{quienEsElCaso(c)}</p>
              </TableCell>
              <TableCell className="py-4">
                <PuntajeDeVinci puntaje={c.puntaje} enRiesgo={c.enRiesgo} enCobranza={c.enCobranza} />
              </TableCell>
              <TableCell className="hidden max-w-md py-4 text-sm text-fg-muted md:table-cell">
                <span className="line-clamp-2">
                  {c.senales.length > 0
                    ? c.senales
                        .slice(0, 2)
                        .map((s) => `${s.texto} (+${s.puntos})`)
                        .join(' · ')
                    : 'Sin señales'}
                </span>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap py-4 text-right font-mono tabular-nums text-fg sm:table-cell">
                {formatCurrency(c.canonEnJuegoCop)}
              </TableCell>
              {conPlan ? (
                <TableCell className="hidden whitespace-nowrap py-4 text-sm text-fg-muted lg:table-cell">
                  {planEnPalabras(c.plan)}
                </TableCell>
              ) : null}
              <TableCell className="py-4 pr-5">
                <CaretRight size={16} className="text-fg-subtle" aria-hidden="true" />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

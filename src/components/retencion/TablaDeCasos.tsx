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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { PuntajeDeVinci, QUIEN } from '@/components/retencion/vinci'
import type { CasoDeVinci, PlanDelCaso } from '@/lib/types/retencion'
import { casoDeRetencion } from '@/lib/nav/rutas-de-retencion'
import { traducir, useTr, type Tr } from '@/lib/i18n/use-tr'

export const hrefDelCaso = (caseId: string) => casoDeRetencion(caseId)

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
  // Las tareas abiertas sólo cuentan con el plan vivo: «Plan cancelado · 2
  // tareas abiertas» (visto en QA) se contradecía.
  return plan.estado === 'activo' && plan.tareasAbiertas > 0
    ? `${estado} · ${plan.tareasAbiertas} ${plan.tareasAbiertas === 1 ? 'tarea abierta' : 'tareas abiertas'}`
    : estado
}

/** «Inquilino · contrato 123» o «Propietario · 3 inmuebles». */
export function quienEsElCaso(c: CasoDeVinci, tr: Tr = (es, vars) => traducir(es, 'es', vars)): string {
  if (c.poblacion === 'inquilino') {
    const numero = c.contratos[0]?.numero
    return numero ? tr('Inquilino · contrato {numero}', { numero }) : tr(QUIEN.inquilino)
  }
  const n = c.contratos.length
  return tr(n === 1 ? 'Propietario · {n} inmueble' : 'Propietario · {n} inmuebles', { n })
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
  const tr = useTr();
  const router = useRouter()
  if (casos.length === 0) return <>{vacio}</>
  return (
    <Table data-testid="vinci-casos">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap pl-5">{tr("Quién")}</TableHead>
          <TableHead className="hidden whitespace-nowrap sm:table-cell">{tr("Riesgo")}</TableHead>
          <TableHead className="hidden whitespace-nowrap md:table-cell">{tr("Por qué")}</TableHead>
          <TableHead className={conPlan ? 'hidden whitespace-nowrap text-right sm:table-cell' : 'hidden whitespace-nowrap pr-5 text-right sm:table-cell'}>{tr("Canon en juego")}</TableHead>
          {conPlan ? <TableHead className="hidden whitespace-nowrap pr-5 lg:table-cell">{tr("Plan")}</TableHead> : null}
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
                  {c.nombre ?? tr('Sin nombre registrado')}
                </Link>
                <p className="mt-0.5 text-caption text-fg-muted">{quienEsElCaso(c, tr)}</p>
                {/* En el teléfono el riesgo va debajo del nombre: como columna
                    propia le dejaba al nombre una palabra por renglón. */}
                <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
                  <PuntajeDeVinci puntaje={c.puntaje} enRiesgo={c.enRiesgo} enCobranza={c.enCobranza} />
                  <span className="font-mono text-caption tabular-nums text-fg">{formatCurrency(c.canonEnJuegoCop)}</span>
                </div>
              </TableCell>
              <TableCell className="hidden py-4 sm:table-cell">
                <PuntajeDeVinci puntaje={c.puntaje} enRiesgo={c.enRiesgo} enCobranza={c.enCobranza} />
              </TableCell>
              <TableCell className="hidden max-w-md py-4 text-sm text-fg-muted md:table-cell">
                <span className="line-clamp-2">
                  {c.senales.length > 0
                    ? c.senales
                        .slice(0, 2)
                        .map((s) => `${s.texto} (+${s.puntos})`)
                        .join(' · ')
                    : tr('Sin señales')}
                </span>
              </TableCell>
              <TableCell className={conPlan ? 'hidden whitespace-nowrap py-4 text-right font-mono tabular-nums text-fg sm:table-cell' : 'hidden whitespace-nowrap py-4 pr-5 text-right font-mono tabular-nums text-fg sm:table-cell'}>
                {formatCurrency(c.canonEnJuegoCop)}
              </TableCell>
              {conPlan ? (
                <TableCell className="hidden whitespace-nowrap py-4 pr-5 text-sm text-fg-muted lg:table-cell">
                  {tr(planEnPalabras(c.plan))}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

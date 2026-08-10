'use client'

/**
 * Comparación de candidatos, lado a lado — paso 9 del recorrido.
 *
 * Antes de esto había una lista: para comparar dos personas había que abrir
 * una, memorizarla, cerrarla y abrir la otra. Eso no es comparar.
 *
 * Decisiones de la pantalla:
 * - La primera columna son las filas, no un candidato: la comparación se lee
 *   en horizontal.
 * - Se marca quién va mejor en cada fila. Sin esa marca hay que hacer el
 *   trabajo con el ojo, que es justamente lo que la pantalla debería ahorrar.
 * - Las filas donde todos empatan se atenúan: si no diferencia, no decide.
 * - El encabezado queda pegado arriba y la primera columna a la izquierda,
 *   porque con 4 candidatos y 12 filas se pierde el punto de referencia.
 */

import { useMemo } from 'react'
import { Trophy, Warning, Info } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { IconTooltip } from '@/components/ui/icon-tooltip'
import {
  construirComparacion,
  type CandidatoComparado,
} from '@/lib/inmobiliaria/comparacion'

const COLOR_NIVEL: Record<string, string> = {
  A: 'bg-success-soft text-success',
  B: 'bg-primary-soft text-primary',
  C: 'bg-warning-soft text-warning',
  D: 'bg-danger-soft text-danger',
}

function iniciales(nombre: string): string {
  return (
    nombre
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

export interface ComparadorCandidatosProps {
  entradas: CandidatoComparado[]
  /** Abre la ficha completa de uno. */
  onVerFicha?: (idCandidato: string) => void
  /** Elegir a uno cierra el paso 9 y abre el 10. */
  onElegir?: (idCandidato: string) => void
  className?: string
}

export function ComparadorCandidatos({
  entradas,
  onVerFicha,
  onElegir,
  className,
}: ComparadorCandidatosProps) {
  const filas = useMemo(() => construirComparacion(entradas), [entradas])

  return (
    <div className={cn('overflow-x-auto overscroll-contain', className)} data-lenis-prevent>
      <table
        className="w-full min-w-[640px] border-separate border-spacing-0"
        data-testid="comparador-candidatos"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 w-[200px] border-b border-border bg-card px-4 py-4 text-left align-bottom"
            >
              <span className="font-mono text-label uppercase tracking-mono-label text-fg-subtle">
                Comparación
              </span>
            </th>
            {entradas.map(({ candidato, evaluacion }) => {
              const nivel = evaluacion?.level ?? candidato.riskScore?.level
              return (
                <th
                  key={candidato.id}
                  scope="col"
                  className="sticky top-0 z-10 min-w-[180px] border-b border-l border-border bg-card px-4 py-4 text-left align-bottom"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-medium text-primary">
                      {iniciales(candidato.tenantName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {candidato.tenantName || '—'}
                      </p>
                      {nivel && (
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-5 items-center rounded-full px-2 font-mono text-[11px] font-semibold',
                            COLOR_NIVEL[nivel] ?? 'bg-surface-muted text-fg-muted',
                          )}
                        >
                          Nivel {nivel}
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {filas.map((f) => (
            <tr key={f.clave} className="group">
              <th
                scope="row"
                className={cn(
                  'sticky left-0 z-10 border-b border-border bg-card px-4 py-3 text-left align-top',
                  // Lo que no diferencia, no decide: se atenúa.
                  f.todosIguales && 'opacity-60',
                )}
              >
                <span className="flex items-start gap-1.5 text-sm font-medium text-fg-muted">
                  {f.etiqueta}
                  {f.ayuda && (
                    <IconTooltip label={f.ayuda}>
                      <Info
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle"
                        aria-label={f.ayuda}
                      />
                    </IconTooltip>
                  )}
                </span>
              </th>

              {f.celdas.map((celda, i) => {
                const esMejor = f.mejores.includes(i)
                return (
                  <td
                    key={`${f.clave}-${i}`}
                    className={cn(
                      'border-b border-l border-border px-4 py-3 align-top transition-colors',
                      esMejor && 'bg-success-soft',
                      f.todosIguales && 'opacity-60',
                    )}
                    data-mejor={esMejor || undefined}
                  >
                    {celda.texto === null ? (
                      // Guion en vez de un cero: no tenerlo no es tenerlo en cero.
                      <span className="text-sm text-fg-subtle" aria-label="sin dato">
                        —
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <p
                          className={cn(
                            'flex items-center gap-1.5 text-sm',
                            celda.esAlerta ? 'font-medium text-danger' : 'text-fg',
                          )}
                        >
                          {celda.esAlerta && (
                            <Warning className="h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
                          )}
                          {esMejor && !celda.esAlerta && (
                            <Trophy
                              className="h-3.5 w-3.5 shrink-0 text-success"
                              weight="fill"
                              aria-label="El mejor en esta fila"
                            />
                          )}
                          {celda.texto}
                        </p>
                        {celda.detalle && (
                          <p className="font-mono text-[11px] text-fg-subtle">{celda.detalle}</p>
                        )}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}

          {(onVerFicha || onElegir) && (
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-4 py-4 text-left align-top"
              >
                <span className="sr-only">Acciones</span>
              </th>
              {entradas.map(({ candidato }) => (
                <td key={`acc-${candidato.id}`} className="border-l border-border px-4 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    {onElegir && (
                      <Button
                        size="sm"
                        hideArrow
                        onClick={() => onElegir(candidato.id)}
                        data-testid={`elegir-${candidato.id}`}
                      >
                        Elegir a {candidato.tenantName.split(' ')[0] || 'este'}
                      </Button>
                    )}
                    {onVerFicha && (
                      <Button
                        size="sm"
                        variant="ghost"
                        hideArrow
                        onClick={() => onVerFicha(candidato.id)}
                      >
                        Ver ficha completa
                      </Button>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

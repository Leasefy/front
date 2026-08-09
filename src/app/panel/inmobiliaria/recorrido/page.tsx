'use client'

/**
 * /panel/inmobiliaria/recorrido — el paso 7 del recorrido del inquilino: las
 * postulaciones que le llegan a la inmobiliaria.
 *
 * Este paso no tenía pantalla. `funnel-applications.service.ts` estaba escrito,
 * con tipos y con tests, y ninguna vista lo consumía: la cadena se cortaba
 * justo donde la pelota pasa del inquilino a la agencia.
 *
 * Ojo con dos rutas que se le parecen y no lo son:
 *   · `/postulaciones` lee `GET /landlord/candidates` — postulaciones a
 *     propiedades, un embudo distinto que no sabe del recorrido.
 *   · `/ai/asegurabilidad/cola` es la cola del agente cotizador, un flujo que
 *     inicia la agencia. Acá el flujo lo inicia el inquilino.
 * Ninguna de las dos se toca: esta pantalla se suma.
 *
 * La página hace doble trabajo a propósito. Cuando hay postulaciones es una
 * cola de acción, con las más viejas arriba. Cuando no las hay, el mapa de los
 * 11 pasos ocupa el lugar del vacío: sin datos, lo único que se muestra es el
 * estado vacío, y acá el estado vacío útil es explicar qué va a llegar.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { ClipboardText, ArrowRight, WarningCircle } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { formatRelativeTime } from '@/lib/format'
import { Spinner } from '@/components/ui'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { VERDICT_CONFIG, shortApplicationRef } from '@/lib/api/funnel-applications.service'
import { useRecorridoPostulaciones } from '@/lib/hooks/use-recorrido-postulaciones'
import { RecorridoMapa } from '@/components/inmobiliaria/recorrido/RecorridoMapa'

const NS = 'inmobiliaria.recorrido'

/** Mismos colores de nivel que `/postulaciones` y `/propiedades/[id]/candidatos`. */
const NIVEL_COLORS: Record<string, string> = {
  A: 'text-success bg-success-soft',
  B: 'text-primary bg-primary-soft',
  C: 'text-warning bg-warning-soft',
  D: 'text-danger bg-danger-soft',
}

export default function RecorridoPage() {
  const { t, locale } = useI18n()
  const { items, isLoading, error, refetch } = useRecorridoPostulaciones()

  // Las más viejas primero: una cola de acción se ordena por lo que lleva
  // esperando, no por lo que acaba de entrar.
  const ordenadas = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.scoredAt).getTime() - new Date(b.scoredAt).getTime(),
      ),
    [items],
  )

  const porRevisar = ordenadas.filter((i) => i.requiresManualReview).length
  const hayPostulaciones = ordenadas.length > 0

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t(`${NS}.titulo`)}</h1>
        <p className="max-w-3xl text-sm text-fg-muted">{t(`${NS}.subtitulo`)}</p>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-fg">{t(`${NS}.bandeja.titulo`)}</h2>
          <p className="text-sm text-fg-muted">{t(`${NS}.bandeja.desc`)}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Spinner size="md" variant="muted" />
          </div>
        ) : error ? (
          // Un fallo se dice como fallo: "no pudimos cargar" nunca es "no hay".
          <ErrorState
            title={t(`${NS}.bandeja.errorTitulo`)}
            description={t(`${NS}.bandeja.errorDesc`)}
            onRetry={() => void refetch()}
          />
        ) : !hayPostulaciones ? (
          <EmptyState
            icon={ClipboardText}
            title={t(`${NS}.bandeja.vacioTitulo`)}
            description={t(`${NS}.bandeja.vacioDesc`)}
          />
        ) : (
          <>
            {porRevisar > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3">
                <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <p className="text-sm font-medium text-warning">
                  {t(`${NS}.bandeja.sinResolver`, { n: porRevisar })}
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(`${NS}.bandeja.colCandidato`)}</TableHead>
                    <TableHead>{t(`${NS}.bandeja.colNivel`)}</TableHead>
                    <TableHead>{t(`${NS}.bandeja.colPuntaje`)}</TableHead>
                    <TableHead>{t(`${NS}.bandeja.colEstado`)}</TableHead>
                    <TableHead>{t(`${NS}.bandeja.colLlego`)}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenadas.map((item) => {
                    const verdict = VERDICT_CONFIG[item.verdict]
                    return (
                      <TableRow key={item.applicationId}>
                        {/* Nombre real si el id cruzó con el back; si no, la
                            referencia corta. Nunca un nombre inventado. */}
                        <TableCell>
                          {item.candidato ? (
                            <div className="min-w-0">
                              <p className="truncate font-medium text-fg">
                                {item.candidato.nombre}
                              </p>
                              <p className="truncate text-xs text-fg-muted">
                                {item.candidato.propertyTitle}
                              </p>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="font-mono text-sm text-fg-muted">
                                {shortApplicationRef(item.applicationId)}
                              </p>
                              <p className="text-xs text-fg-subtle">
                                {t(`${NS}.bandeja.sinNombre`)}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.level ? (
                            <span
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                                NIVEL_COLORS[item.level] ?? 'bg-surface-muted text-fg-muted',
                              )}
                            >
                              {item.level}
                            </span>
                          ) : (
                            <span className="text-fg-subtle">—</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono tabular-nums text-fg">
                          {item.score ?? '—'}
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                verdict.className,
                              )}
                            >
                              {t(verdict.labelKey)}
                            </span>
                            {item.escalate && (
                              <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                                {t(`${NS}.bandeja.escalada`)}
                              </span>
                            )}
                          </span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                          {formatRelativeTime(item.scoredAt, locale)}
                        </TableCell>

                        <TableCell className="text-right">
                          {/* Solo enlaza cuando sabemos a dónde. Un enlace a una
                              ruta que no resuelve es peor que no tenerlo. */}
                          {item.candidato && (
                            <Link
                              href={`/panel/inmobiliaria/propiedades/${item.candidato.propertyId}/candidatos`}
                              className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary hover:underline"
                            >
                              {t(`${NS}.bandeja.verCandidatos`)}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-fg-muted">{t(`${NS}.bandeja.niveles`)}</p>
          </>
        )}
      </section>

      {/* El mapa: siempre visible cuando la bandeja está vacía (es la
          orientación que reemplaza al vacío), plegado cuando hay trabajo. */}
      <section className="space-y-4 border-t border-border pt-8">
        {hayPostulaciones ? (
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline">
              {t(`${NS}.bandeja.comoFunciona`)}
            </summary>
            <div className="pt-6">
              {/* Sin `pasoActual` a propósito: acá el mapa explica el recorrido,
                  no narra el de nadie. Pasarle "alerta" marcaba los seis
                  primeros pasos con ✓ de hecho sin que exista un candidato
                  que los hubiera hecho. */}
              <RecorridoMapa />
            </div>
          </details>
        ) : (
          <>
            <h2 className="text-lg font-medium text-fg">{t(`${NS}.bandeja.comoFunciona`)}</h2>
            <RecorridoMapa />
          </>
        )}
      </section>
    </div>
  )
}

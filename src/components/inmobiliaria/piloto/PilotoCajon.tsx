'use client'

/**
 * PilotoCajon — el detalle de un caso, sin salir de la torre de control.
 *
 * ── Por qué existe (pedido de Nico, 2026-08-31) ────────────────────────────
 * Las tres listas de la pantalla —bandeja, actividad y tablero— eran
 * callejones: cada fila era un `href` que sacaba al usuario del Piloto y lo
 * dejaba en otra sección, y para volver había que navegar de nuevo. Decidir
 * veinte casos costaba cuarenta viajes.
 *
 * Ahora las tres abren ESTE cajón, con lo mismo adentro:
 *   · el contexto agrupado (el deudor, la deuda, el documento, la factura),
 *   · la línea de tiempo real del caso,
 *   · las acciones que se ejecutan de un clic,
 *   · y los enlaces a la pantalla propia CON la razón por la que ese caso
 *     no se puede cerrar desde acá.
 *
 * ── Dos aperturas, un solo cajón ───────────────────────────────────────────
 * `{tipo:'item'}` pide el detalle al micro por su id con prefijo.
 * `{tipo:'alerta'}` NO pide nada: una alerta del tablero es una REGLA sobre
 * números, no una fila de una tabla, y pedirla daría 404. Se pinta con lo
 * que la alerta ya trae y se listan los casos que sostienen su número —
 * cada uno abre, a su vez, su propio cajón de tipo `item`.
 *
 * ── Dos reglas heredadas, que acá también mandan ───────────────────────────
 * 1. CERO BOTONES MUERTOS: solo se dibuja una acción si el micro la declaró
 *    (`acciones[]` viene vacío cuando la decisión exige inputs). Un VIEWER no
 *    ve botones de acción porque el micro le respondería 403.
 * 2. «No se pudo consultar» NO es «no hay información». Un 404 o un error
 *    se dicen con esas palabras; jamás con un cajón vacío que parezca que el
 *    caso no tiene nada adentro.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowSquareOut, CaretRight, Clock, Info, Warning, X } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { usePilotoDetalle } from '@/lib/hooks/piloto/use-piloto-detalle'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { formatCurrency } from '@/lib/format'
import { runInboxAccion, type InboxAccion, type PulsoAlerta } from '@/lib/api/piloto'

/** Qué está abierto en el cajón. `null` = cerrado. */
export type PilotoApertura =
  | { tipo: 'item'; id: string }
  | { tipo: 'alerta'; alerta: PulsoAlerta }

export interface PilotoCajonProps {
  apertura: PilotoApertura | null
  onClose: () => void
  /** Abre otro caso desde adentro (los ítems de una alerta). */
  onAbrirItem: (id: string) => void
  /** Se llama tras ejecutar una acción, para refrescar las listas de atrás. */
  onAccionEjecutada?: () => Promise<void> | void
}

/** Un enlace externo (http…) sale del panel; uno relativo navega adentro. */
function esExterno(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

const TONO_SEVERIDAD: Record<string, string> = {
  critica: 'text-danger',
  alta: 'text-warning',
  media: 'text-fg',
  info: 'text-fg-muted',
}

export function PilotoCajon({
  apertura,
  onClose,
  onAbrirItem,
  onAccionEjecutada,
}: PilotoCajonProps) {
  const { t } = useI18n()
  const { agencyRole } = usePermissionsContext()
  // Mientras el rol resuelve (`null`) no se asume nada; a un VIEWER el micro
  // le responde 403, así que no se le dibuja el botón.
  const puedeActuar = agencyRole === null || agencyRole !== 'VIEWER'

  const itemId = apertura?.tipo === 'item' ? apertura.id : null
  const alerta = apertura?.tipo === 'alerta' ? apertura.alerta : null

  const { data, isLoading, error, notAvailable, refetch } = usePilotoDetalle(itemId)
  const [enVuelo, setEnVuelo] = useState<string | null>(null)

  const ejecutar = useCallback(
    async (accion: InboxAccion) => {
      setEnVuelo(accion.label)
      try {
        const res = await runInboxAccion(accion)
        if (res.ok) {
          toast.success(t('inmobiliaria.piloto.bandeja.toastOk', { label: accion.label }))
          await Promise.allSettled([refetch(), onAccionEjecutada?.() ?? Promise.resolve()])
        } else {
          toast.error(
            t('inmobiliaria.piloto.bandeja.toastFail', { error: res.error ?? 'error' }),
          )
        }
      } finally {
        setEnVuelo(null)
      }
    },
    [onAccionEjecutada, refetch, t],
  )

  const titulo = alerta
    ? alerta.titulo
    : (data?.titulo ?? t('inmobiliaria.piloto.cajon.cargandoTitulo'))
  const subtitulo = alerta
    ? alerta.detalle
    : (data?.subtitulo ?? t('inmobiliaria.piloto.cajon.subtituloVacio'))

  return (
    <Sheet open={apertura !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        data-testid="piloto-cajon"
      >
        {/* Encabezado fijo — el título del caso siempre visible al scrollear */}
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle
                className={`text-base font-semibold ${alerta ? (TONO_SEVERIDAD[alerta.severidad] ?? 'text-fg') : 'text-fg'}`}
              >
                {titulo}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-fg-muted">
                {subtitulo}
              </SheetDescription>
              {data && !alerta && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-fg-subtle">
                  {data.desde && (
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock weight="duotone" className="h-3 w-3" aria-hidden="true" />
                      {t('inmobiliaria.piloto.cajon.esperando', {
                        tiempo: relativeTime(data.desde, t),
                      })}
                    </span>
                  )}
                  {typeof data.montoCop === 'number' && (
                    <span className="font-mono tabular-nums text-fg">
                      {formatCurrency(data.montoCop)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('inmobiliaria.piloto.cajon.cerrar')}
              className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X weight="bold" className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </SheetHeader>

        {/* Cuerpo — el único que scrollea */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* ── Modo alerta: sin red, con los casos que sostienen el número ── */}
          {alerta && (
            <div className="space-y-5" data-testid="piloto-cajon-alerta">
              {alerta.items && alerta.items.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {t('inmobiliaria.piloto.cajon.casos')}
                  </h3>
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {alerta.items.map((caso) => (
                      <li key={caso.id}>
                        <button
                          type="button"
                          onClick={() => onAbrirItem(caso.id)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs text-fg">
                            {caso.titulo}
                          </span>
                          {caso.desde && (
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-subtle">
                              {relativeTime(caso.desde, t)}
                            </span>
                          )}
                          <CaretRight
                            weight="bold"
                            className="h-3 w-3 shrink-0 text-fg-subtle"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                // Sin lista NO se afirma que no hay casos: el número del
                // título se midió aparte y sigue siendo verdadero.
                <Aviso tono="info" texto={t('inmobiliaria.piloto.cajon.sinCasos')} />
              )}

              {alerta.href && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {t('inmobiliaria.piloto.cajon.enlaces')}
                  </h3>
                  <Link
                    href={alerta.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-fg hover:underline"
                  >
                    {t('inmobiliaria.piloto.cajon.abrirPantalla')}
                    <ArrowSquareOut weight="bold" className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </section>
              )}
            </div>
          )}

          {/* ── Modo ítem ────────────────────────────────────────────────── */}
          {!alerta && isLoading && !data && (
            <div className="space-y-3" data-testid="piloto-cajon-cargando">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          )}

          {!alerta && !isLoading && error && (
            <Aviso
              tono="danger"
              titulo={t('inmobiliaria.piloto.cajon.errorTitulo')}
              texto={t('inmobiliaria.piloto.cajon.errorTexto', { error })}
              accion={
                <Button size="sm" variant="secondary" hideArrow onClick={() => void refetch()}>
                  {t('inmobiliaria.piloto.cajon.reintentar')}
                </Button>
              }
            />
          )}

          {!alerta && !isLoading && !error && notAvailable && (
            <Aviso
              tono="info"
              titulo={t('inmobiliaria.piloto.cajon.sinFuenteTitulo')}
              texto={t('inmobiliaria.piloto.cajon.sinFuenteTexto')}
            />
          )}

          {!alerta && data && (
            <div className="space-y-5">
              {data.nota && <Aviso tono="info" texto={data.nota} />}

              {data.contexto.map((grupo) => (
                <section key={grupo.titulo}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {grupo.titulo}
                  </h3>
                  <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {grupo.filas.map((fila, i) => (
                      <div key={`${fila.label}-${i}`} className="flex items-start gap-3 px-3 py-2">
                        <dt className="w-2/5 shrink-0 text-xs text-fg-muted">{fila.label}</dt>
                        <dd
                          className={`min-w-0 flex-1 break-words text-xs ${
                            fila.enfasis ? 'font-medium text-fg' : 'text-fg'
                          }`}
                        >
                          {fila.valor}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}

              {data.traza.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {t('inmobiliaria.piloto.cajon.traza')}
                  </h3>
                  <ol className="space-y-0">
                    {data.traza.map((hito, i) => (
                      <li key={`${hito.at}-${i}`} className="flex gap-3">
                        {/* El riel: punto + línea, salvo en el último hito */}
                        <div className="flex flex-col items-center pt-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle"
                            aria-hidden="true"
                          />
                          {i < data.traza.length - 1 && (
                            <span className="w-px flex-1 bg-border" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-3">
                          <p className="text-xs text-fg">{hito.titulo}</p>
                          {hito.detalle && (
                            <p className="text-[11px] text-fg-muted">{hito.detalle}</p>
                          )}
                          <p className="font-mono text-[10px] tabular-nums text-fg-subtle">
                            {new Date(hito.at).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {data.enlaces.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {t('inmobiliaria.piloto.cajon.enlaces')}
                  </h3>
                  <ul className="space-y-2">
                    {data.enlaces.map((enlace) => (
                      <li key={enlace.href + enlace.label}>
                        {esExterno(enlace.href) ? (
                          <a
                            href={enlace.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg hover:underline"
                          >
                            {enlace.label}
                            <ArrowSquareOut weight="bold" className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <Link
                            href={enlace.href}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg hover:underline"
                          >
                            {enlace.label}
                            <ArrowSquareOut weight="bold" className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                        {/* La razón por la que ese caso no se cierra acá. Es
                            la diferencia entre «falta un botón» y «esto
                            necesita algo que un botón no puede dar». */}
                        {enlace.razon && (
                          <p className="mt-0.5 text-[11px] text-fg-muted">{enlace.razon}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Pie fijo con las acciones — solo si el micro declaró alguna */}
        {!alerta && data && data.acciones.length > 0 && puedeActuar && (
          <footer className="shrink-0 border-t border-border bg-surface px-5 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              {data.acciones.map((accion, i) => (
                <Button
                  key={accion.label}
                  size="sm"
                  hideArrow
                  variant={i === 0 ? 'default' : 'secondary'}
                  isLoading={enVuelo === accion.label}
                  disabled={enVuelo !== null && enVuelo !== accion.label}
                  onClick={() => void ejecutar(accion)}
                  data-testid={`piloto-cajon-accion-${i}`}
                >
                  {accion.label}
                </Button>
              ))}
            </div>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Aviso corto dentro del cajón — sin dependencias de otra pantalla. */
function Aviso({
  tono,
  titulo,
  texto,
  accion,
}: {
  tono: 'info' | 'danger'
  titulo?: string
  texto: string
  accion?: React.ReactNode
}) {
  const Icono = tono === 'danger' ? Warning : Info
  const clases =
    tono === 'danger'
      ? 'border-danger/30 bg-danger/5 text-danger'
      : 'border-border bg-surface-muted text-fg-muted'
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${clases}`}>
      <Icono weight="duotone" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1.5">
        {titulo && <p className="text-xs font-medium">{titulo}</p>}
        <p className="text-xs leading-relaxed">{texto}</p>
        {accion}
      </div>
    </div>
  )
}

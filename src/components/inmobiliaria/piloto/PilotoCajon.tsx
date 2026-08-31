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
import {
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  Clock,
  Info,
  Warning,
  X,
} from '@phosphor-icons/react'
import {
  IconButton,
  KeyValueList,
  ListRow,
  MonoLabel,
  Timeline,
  type KeyValueItem,
} from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { PilotoAccionForm } from './PilotoAccionForm'
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
  /**
   * Vuelve a la vista anterior de la pila. Solo llega cuando hay algo atrás:
   * abrir un caso desde una alerta dejaba al usuario en el detalle sin saber
   * de dónde vino y sin camino de regreso.
   */
  onVolver?: () => void
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

/**
 * Una fila del contrato (`DetalleFila`) → un item del `KeyValueList` del DS.
 *
 * ── Por qué el DS y no un <dl> a mano (Nico, 2026-08-31) ──────────────────
 * El cajón pintaba sus tablas con un `<dl>` propio: etiqueta al 40 % del
 * ancho, valor a la izquierda, divisores gruesos. El DS ya tiene la pieza
 * —`KeyValueList`— y su gramática es otra y mejor: etiqueta a la izquierda en
 * `text-body-sm`, valor a la DERECHA en mono tabular, divisores hairline y
 * ninguno después del último. Los números de dos filas seguidas quedan
 * alineados por la derecha, que es la única forma de poder compararlos.
 *
 * El 95 % de las 218 filas del cajón son valores cortos (medido contra la
 * agencia de QA): montos, fechas, estados, conteos — justo para lo que el DS
 * diseñó esta pieza. El 5 % restante es prosa («cerrada — solo se puede
 * responder con una plantilla aprobada»), y ahí el mono del DS estorbaría:
 * esas van en la tipografía de texto y se les permite envolver.
 */
const LARGO_QUE_YA_ES_PROSA = 34

/** La marca de tiempo de un hito, como la espera el `Timeline` del DS. */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function aItemDS(fila: { label: string; valor: string; enfasis?: boolean }): KeyValueItem {
  const prosa = fila.valor.length > LARGO_QUE_YA_ES_PROSA
  if (prosa) {
    return {
      label: fila.label,
      // `.prosa` es el gancho que usa WRAP_VALORES para apilar SÓLO esta fila.
      value: <span className="prosa font-sans font-normal">{fila.valor}</span>,
    }
  }
  return {
    label: fila.label,
    value: fila.enfasis ? <strong className="font-semibold">{fila.valor}</strong> : fila.valor,
  }
}

/**
 * El `KeyValueList` fija el valor en `shrink-0` (nunca se encoge) porque
 * espera figuras cortas. Una frase con eso, en un cajón de 576 px, le come el
 * ancho a la etiqueta — y la etiqueta lleva `truncate`, así que lo que se
 * pierde es el NOMBRE del dato: se veía «Ventana de 2…» en vez de «Ventana de
 * 24 h» (medido en pantalla, 2026-08-31).
 *
 * Por eso la fila de prosa no se encoge: se APILA. Etiqueta arriba, frase
 * abajo a todo el ancho y alineada a la izquierda, que es como se lee una
 * oración. El `:has(.prosa)` deja intactas las filas cortas, que siguen con
 * la gramática del DS (valor a la derecha, mono, tabular).
 */
const WRAP_VALORES = [
  '[&>div:has(.prosa)]:flex-col',
  '[&>div:has(.prosa)]:items-start',
  '[&>div:has(.prosa)]:gap-1',
  '[&>div:has(.prosa)>span:first-child]:whitespace-normal',
  '[&>div:has(.prosa)>span:first-child]:overflow-visible',
  '[&>div:has(.prosa)>span:last-child]:shrink',
  '[&>div:has(.prosa)>span:last-child]:whitespace-normal',
  '[&>div:has(.prosa)>span:last-child]:text-left',
].join(' ')

export function PilotoCajon({
  apertura,
  onClose,
  onVolver,
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
  /**
   * La acción cuyo formulario está abierto. Una sola a la vez: el pie del
   * cajón es angosto y dos formularios abiertos se pisan.
   */
  const [abierta, setAbierta] = useState<InboxAccion | null>(null)

  const ejecutar = useCallback(
    async (accion: InboxAccion, valores?: Record<string, unknown>) => {
      setEnVuelo(accion.label)
      try {
        const res = await runInboxAccion(accion, valores)
        if (res.ok) {
          toast.success(t('inmobiliaria.piloto.bandeja.toastOk', { label: accion.label }))
          setAbierta(null)
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
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            {onVolver && (
              <IconButton
                variant="ghost"
                onClick={onVolver}
                aria-label={t('inmobiliaria.piloto.cajon.volver')}
                className="-ml-2 mt-0.5 h-8 w-8 shrink-0 rounded-md hover:bg-surface-muted"
                icon={<CaretLeft weight="bold" className="h-4 w-4" aria-hidden="true" />}
              />
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle
                className={`text-lg font-semibold ${alerta ? (TONO_SEVERIDAD[alerta.severidad] ?? 'text-fg') : 'text-fg'}`}
              >
                {titulo}
              </SheetTitle>
              <SheetDescription className="mt-1 text-caption text-fg-muted">
                {subtitulo}
              </SheetDescription>
              {data && !alerta && (
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-caption text-fg-subtle">
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
            <IconButton
              variant="ghost"
              onClick={onClose}
              aria-label={t('inmobiliaria.piloto.cajon.cerrar')}
              className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-md hover:bg-surface-muted"
              icon={<X weight="bold" className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </SheetHeader>

        {/* Cuerpo — el único que scrollea */}
        {/* Cuerpo — el único que scrollea. `data-lenis-prevent` +
            `overscrollBehavior:'contain'` son OBLIGATORIOS: el panel corre con
            Lenis (scroll suave) y sin esto la rueda dentro del cajón la
            intercepta la página de atrás. Mismo patrón que ScoreDetailSheet. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-5"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {/* ── Modo alerta: sin red, con los casos que sostienen el número ── */}
          {alerta && (
            <div className="space-y-5" data-testid="piloto-cajon-alerta">
              {alerta.items && alerta.items.length > 0 ? (
                <section>
                  <h3 className="mb-2.5"><MonoLabel>
                    {t('inmobiliaria.piloto.cajon.casos')}
                  </MonoLabel></h3>
                  <ul className="overflow-hidden rounded-lg border border-border">
                    {alerta.items.map((caso, i, arr) => (
                      <li key={caso.id}>
                        <ListRow
                          title={caso.titulo}
                          trailing={
                            <span className="flex items-center gap-2">
                              {caso.desde && (
                                <span className="font-mono text-caption tabular-nums text-fg-subtle">
                                  {relativeTime(caso.desde, t)}
                                </span>
                              )}
                              <CaretRight weight="bold" aria-hidden="true" />
                            </span>
                          }
                          noDivider={i === arr.length - 1}
                          onClick={() => onAbrirItem(caso.id)}
                        />
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
                  <h3 className="mb-2.5"><MonoLabel>
                    {t('inmobiliaria.piloto.cajon.enlaces')}
                  </MonoLabel></h3>
                  <Link
                    href={alerta.href}
                    className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg hover:underline"
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
                <section
                  key={grupo.titulo}
                  className="rounded-lg border border-border px-4 pb-2 pt-4"
                >
                  <h3 className="mb-1">
                    <MonoLabel>{grupo.titulo}</MonoLabel>
                  </h3>
                  <KeyValueList items={grupo.filas.map(aItemDS)} className={WRAP_VALORES} />
                </section>
              ))}

              {data.traza.length > 0 && (
                <section>
                  <h3 className="mb-2.5"><MonoLabel>
                    {t('inmobiliaria.piloto.cajon.traza')}
                  </MonoLabel></h3>
                  {/* El riel, los puntos y el hover los pone el DS. Antes se
                      dibujaban a mano con un <span> de 1 px por hito. */}
                  <Timeline
                    entries={data.traza.map((hito, i) => ({
                      id: `${hito.at}-${i}`,
                      label: hito.titulo,
                      timestamp: fechaCorta(hito.at),
                      ...(hito.detalle ? { description: hito.detalle } : {}),
                    }))}
                  />
                </section>
              )}

              {data.enlaces.length > 0 && (
                <section>
                  <h3 className="mb-2.5"><MonoLabel>
                    {t('inmobiliaria.piloto.cajon.enlaces')}
                  </MonoLabel></h3>
                  <ul className="space-y-2">
                    {data.enlaces.map((enlace) => (
                      <li key={enlace.href + enlace.label}>
                        {esExterno(enlace.href) ? (
                          <a
                            href={enlace.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg hover:underline"
                          >
                            {enlace.label}
                            <ArrowSquareOut weight="bold" className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <Link
                            href={enlace.href}
                            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg hover:underline"
                          >
                            {enlace.label}
                            <ArrowSquareOut weight="bold" className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                        {/* La razón por la que ese caso no se cierra acá. Es
                            la diferencia entre «falta un botón» y «esto
                            necesita algo que un botón no puede dar». */}
                        {enlace.razon && (
                          <p className="mt-1 text-caption text-fg-muted">{enlace.razon}</p>
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
          <footer className="shrink-0 border-t border-border bg-surface px-6 py-4">
            {abierta ? (
              /* Una acción que pide datos toma el pie entero: el formulario
                 vive acá y no en otro diálogo encima del cajón. */
              <PilotoAccionForm
                accion={abierta}
                enVuelo={enVuelo === abierta.label}
                onCancelar={() => setAbierta(null)}
                onEnviar={(valores: Record<string, unknown>) => void ejecutar(abierta, valores)}
              />
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                {data.acciones.map((accion, i) => (
                  <Button
                    key={accion.label}
                    size="sm"
                    hideArrow
                    variant={
                      accion.tono === 'peligro'
                        ? 'outline'
                        : i === 0
                          ? 'default'
                          : 'secondary'
                    }
                    isLoading={enVuelo === accion.label}
                    disabled={enVuelo !== null && enVuelo !== accion.label}
                    onClick={() => {
                      // Con campos o con advertencia, primero se pregunta.
                      // Sin nada de eso, sigue siendo un clic y se ejecuta.
                      if ((accion.campos && accion.campos.length > 0) || accion.confirmacion) {
                        setAbierta(accion)
                        return
                      }
                      void ejecutar(accion)
                    }}
                    data-testid={`piloto-cajon-accion-${i}`}
                  >
                    {accion.label}
                  </Button>
                ))}
              </div>
            )}
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
        {titulo && <p className="text-body-sm font-medium">{titulo}</p>}
        <p className="text-caption leading-relaxed">{texto}</p>
        {accion}
      </div>
    </div>
  )
}

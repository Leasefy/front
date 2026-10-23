'use client'

/**
 * CobranzaTeTocaATi — lo único de la pantalla que pide que una persona haga
 * algo. Va primero y es la sección con más peso visual; todo lo demás es
 * información.
 *
 * ── Un tablero LITERAL, no un filtro ────────────────────────────────────────
 * Primer intento (2026-08-25 mañana): celdas-resumen que filtraban una lista
 * de abajo. Nico lo devolvió el mismo día: «cuando yo te decía tablero era
 * literal un tablero encerradito más bonito, con tooodas las alertas». La
 * celda seleccionada escondía el resto y las piezas sueltas (celdas, alerta
 * de umbral, leyenda, lista) flotaban sin marco.
 *
 * Ahora es UN recuadro con columnas por urgencia —estilo tablero de trabajo—
 * y TODO visible a la vez: nada se esconde detrás de un clic. Una columna
 * larga scrollea dentro de sí misma (con `data-lenis-prevent`, porque Lenis
 * se roba el scroll de los contenedores anidados).
 *
 * ── El orden de las columnas no es estético ─────────────────────────────────
 * 1. Siniestros: los únicos que bloquean plata. La base no deja radicar sin
 *    firma humana; mientras nadie apruebe, la reclamación no se presenta ante
 *    la aseguradora. Por eso tienen columna propia y van primero.
 * 2. Urgente (alta) → 3. Puede esperar (media) → 4. Sin afán (baja).
 *
 * Dentro de cada columna, el que MÁS lleva esperando va arriba: es una cola
 * de trabajo, no un feed de novedades.
 *
 * Las alertas de umbral del reporte diario (morosidad sobre el límite, etc.)
 * son información, no trabajo: van al pie del tablero, en una línea.
 *
 * ── El título vive DENTRO del recuadro ──────────────────────────────────────
 * «Te toca a ti» y la frase de cuántas decisiones esperan flotaban ENCIMA del
 * tablero, como un título de sección más. Nico (2026-09-03): «lo de te toca a
 * ti debería estar dentro del tablero». Ahora son la primera fila del mismo
 * recuadro — y el recuadro está siempre, también cargando o vacío, para que
 * el título nunca vuelva a quedar suelto sobre otra tarjeta.
 */

import { useEffect } from 'react'
import { formatRelativeTime } from '@/lib/format'
import Link from 'next/link'
import { CheckCircle, Clock, Siren, Warning } from '@phosphor-icons/react'
import { AnimatedNumber, CrossFade, Presence, Stagger, StaggerItem } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { usePendientes, type PendienteItem } from '@/lib/hooks/cobranza/use-pendientes'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { errorLegible } from '@/lib/cobranza/error-legible'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr'
import { textoDelAviso } from '@/lib/cobranza/aviso-del-reporte'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

const NS = 'inmobiliaria.ai.cobranza.pendientes'
const PENDIENTES_HREF = '/panel/inmobiliaria/pagos/cobranza/pendientes'

// ── Columnas del tablero ─────────────────────────────────────────────────────

type ColumnaId = 'siniestros' | 'alta' | 'media' | 'baja'

const COLUMNAS: Array<{ id: ColumnaId; label: string; tinte: string; punto: string }> = [
  { id: 'siniestros', label: 'Bloquean plata', tinte: 'text-danger', punto: 'bg-danger' },
  { id: 'alta', label: 'Urgente', tinte: 'text-danger', punto: 'bg-danger' },
  { id: 'media', label: 'Puede esperar', tinte: 'text-warning', punto: 'bg-warning' },
  { id: 'baja', label: 'Sin afán', tinte: 'text-success', punto: 'bg-success' },
]

/** Qué trámite es cada ficha — la columna mezcla tipos y hay que distinguirlos. */
const TIPO_FICHA: Record<string, string> = {
  escalaciones: 'Escalación',
  cartas: 'Carta prejurídica',
  siniestros: 'Siniestro',
  planes: 'Plan de pago',
  promesas: 'Promesa de pago',
  conversaciones: 'WhatsApp',
}

// ── Utilidades ───────────────────────────────────────────────────────────────

// C7 (r25): «hace 3 horas», no «hace 3h» (VOZ §4).
function haceCuanto(iso: string, en = false): string {
  return formatRelativeTime(iso, en ? 'en' : 'es')
}

const COP = plataEnPantalla(localeDeLasCifras, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// ── Fichas del tablero ───────────────────────────────────────────────────────

function Ficha({ item }: { item: PendienteItem }) {
  const tr = useTr()
  const en = useLocaleDelPanel() === 'en'
  const tipo = tr(TIPO_FICHA[item.grupo] ?? item.grupo)
  // El título es la persona. Cuando el dato no trae nombre —un deudor
  // borrado, una escalación sin masked id— el motivo o el tipo suben al
  // título y no se repiten abajo.
  const titulo = item.titulo || item.reason || tipo
  const meta = [
    tipo,
    item.montoCop != null ? COP.format(item.montoCop) : null,
  ].filter(Boolean)

  // Cada ficha es un `StaggerItem`: `usePendientes` junta seis fuentes y las
  // fichas llegan a medida que cada una responde; entran a su columna en vez
  // de aparecer de golpe, y la que se resuelve sale.
  return (
    <StaggerItem as="li">
      <Link
        href={item.href}
        data-testid={`te-toca-${item.key}`}
        className="group block rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-surface-muted"
      >
        <p className="text-sm font-medium text-fg truncate">{titulo}</p>
        <p className="flex items-center gap-1 text-caption text-fg-muted truncate">
          <span className="truncate">{meta.join(' · ')}</span>
          <span className="ml-auto inline-flex items-center gap-1 tabular-nums shrink-0">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {haceCuanto(item.fecha, en)}
          </span>
        </p>
        {/* El motivo textual (lo último que escribió el deudor, la razón de la
            escalación) — solo cuando no es ya el título. */}
        {item.titulo && item.reason && (
          <p className="text-caption text-fg-muted truncate mt-0.5">{item.reason}</p>
        )}
      </Link>
    </StaggerItem>
  )
}

/** El número tal cual se escribía antes: sin separador de miles. */
const enteroTalCual = (n: number) => String(Math.round(n))

// ── Componente ───────────────────────────────────────────────────────────────

export interface CobranzaTeTocaATiProps {
  /** Casos en mora (S1..SX) del overview. */
  enMora: number
  /** Casos que el agente trabajó hoy. */
  gestionados: number
  /** Cuántas decisiones esperan, para la acción principal del encabezado («Atender N»). */
  onTotalQueEspera?: (n: number | null) => void
}

export function CobranzaTeTocaATi({ enMora, gestionados, onTotalQueEspera }: CobranzaTeTocaATiProps) {
  const tr = useTr();
  const { t } = useI18n()
  const { items, isLoading, error } = usePendientes()
  const { data: reporte } = useDailyReport()

  const alertas = reporte?.alerts ?? []

  // Los siniestros salen de `usePendientes`, NO de un `useInsuranceClaims`
  // propio. Con dos llamadas al mismo endpoint las respuestas llegaban
  // distintas: el tablero decía una cifra y la lista otra. Una pantalla, una
  // fuente.
  const porColumna: Record<ColumnaId, PendienteItem[]> = {
    siniestros: [],
    alta: [],
    media: [],
    baja: [],
  }
  for (const i of items) {
    if (i.grupo === 'siniestros') porColumna.siniestros.push(i)
    else porColumna[i.prioridad].push(i)
  }
  // Cola de trabajo: el que MÁS lleva esperando, arriba.
  for (const col of Object.values(porColumna)) {
    col.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  const totalQueEspera = items.length
  useEffect(() => {
    onTotalQueEspera?.(isLoading ? null : totalQueEspera)
  }, [onTotalQueEspera, isLoading, totalQueEspera])

  // Mientras todavía se está contando NO se afirma nada. «Nada espera tu
  // aprobación» sobre una lista que aún no llegó es una afirmación falsa
  // durante los segundos que tarda —y en frío tarda varios—: quien la lee
  // cierra la pantalla creyendo que está al día.
  const contando = isLoading && items.length === 0 && !error
  const en = useLocaleDelPanel() === 'en'
  const frase = contando
    ? tr('Contando lo que espera tu aprobación…')
    : totalQueEspera === 0
      ? tr('Nada espera tu aprobación.')
      : en
        ? `${totalQueEspera} ${totalQueEspera === 1 ? 'decision is' : 'decisions are'} waiting for your approval.`
        : `${totalQueEspera} ${totalQueEspera === 1 ? 'decisión espera' : 'decisiones esperan'} tu aprobación.`

  return (
    <section data-testid="cobranza-te-toca" aria-labelledby="cobranza-te-toca-titulo">
      {/* UN recuadro: título arriba, columnas debajo, alertas y pie al final. */}
      <div
        data-testid="te-toca-tablero"
        className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3"
      >
        <div className="space-y-0.5">
          <h2 id="cobranza-te-toca-titulo" className="text-base font-medium text-fg">
            {tr("Te toca a ti")}
          </h2>
          <p className="text-sm text-fg-muted max-w-2xl">
            <span className="text-fg font-medium">{frase}</span>{' '}
            {en ? (
              <>
                The agent handled{' '}
                <span className="font-mono tabular-nums text-fg">{gestionados}</span> of your{' '}
                <span className="font-mono tabular-nums text-fg">{enMora}</span> overdue {enMora === 1 ? 'case' : 'cases'} today.
              </>
            ) : (
              <>
            El agente gestionó{' '}
            <span className="font-mono tabular-nums text-fg">{gestionados}</span> de {enMora === 1 ? 'tu' : 'tus'}{' '}
            <span className="font-mono tabular-nums text-fg">{enMora}</span> {enMora === 1 ? 'caso' : 'casos'} en mora hoy.
              </>
            )}
          </p>
        </div>

        {/* Un fallo PARCIAL no es un fallo total: `usePendientes` junta seis
            fuentes y sigue rindiendo las que sí respondieron. Decir «no pudimos
            cargar tus pendientes» encima de un tablero con fichas es falso de
            las dos maneras — ni cargó todo, ni falló todo.
            Entra y sale con su animación (`Presence`). */}
        <Presence
          show={Boolean(error && !isLoading)}
          role="alert"
          className={[
            'rounded-lg border p-3 text-sm',
            totalQueEspera > 0
              ? 'border-warning/30 bg-warning-soft text-warning'
              : 'border-danger/30 bg-danger-soft text-danger',
          ].join(' ')}
        >
          {tr(
            totalQueEspera > 0
              ? 'Puede que falte algo en este tablero: una de las fuentes no respondió.'
              : 'No pudimos cargar tus pendientes.',
          )}{' '}
          <span className="opacity-80">{error ? errorLegible(error) : null}</span>
        </Presence>

        {/* Contando → tablero (o → «nada pendiente»): cada estado entra con
            su fundido. */}
        <CrossFade
          swapKey={contando ? 'contando' : totalQueEspera > 0 ? 'tablero' : 'vacio'}
          className="space-y-3"
        >
        {contando && (
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-surface-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && !error && totalQueEspera === 0 && (
          <div className="px-4 py-6 text-center space-y-1">
            <CheckCircle
              className="w-6 h-6 text-success mx-auto"
              weight="duotone"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-fg">{t(`${NS}.vacio`)}</p>
            <p className="text-caption text-fg-muted">{t(`${NS}.vacioHint`)}</p>
          </div>
        )}

        {/* Las columnas: cuatro, todo visible. */}
        {totalQueEspera > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              {COLUMNAS.map((col) => {
                const fichas = porColumna[col.id]
                const vacia = fichas.length === 0
                return (
                  <div
                    key={col.id}
                    data-testid={`te-toca-col-${col.id}`}
                    className="rounded-lg bg-surface-muted p-2.5 space-y-2 min-w-0"
                  >
                    <p className="flex items-center gap-1.5 px-0.5 text-caption font-medium uppercase tracking-wide text-fg-muted">
                      {col.id === 'siniestros' ? (
                        <Siren
                          className={`w-3.5 h-3.5 ${vacia ? '' : col.tinte}`}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${vacia ? 'bg-border-strong' : col.punto}`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{tr(col.label)}</span>
                      <span
                        className={`ml-auto font-mono tabular-nums text-sm ${vacia ? 'text-fg-muted' : col.tinte}`}
                      >
                        <AnimatedNumber value={fichas.length} format={enteroTalCual} />
                      </span>
                    </p>

                    {col.id === 'siniestros' && !vacia && (
                      <p className="px-0.5 text-caption text-fg-muted">
                        {tr("Sin tu firma no se radican ante la aseguradora.")}
                      </p>
                    )}

                    {vacia ? (
                      <p className="px-0.5 py-6 text-center text-caption text-fg-muted">
                        {tr("Nada pendiente")}
                      </p>
                    ) : (
                      <Stagger
                        as="ul"
                        data-lenis-prevent
                        className="space-y-1.5 max-h-96 overflow-y-auto pr-0.5"
                        style={{ overscrollBehavior: 'contain' }}
                      >
                        {fichas.map((item) => (
                          <Ficha key={item.key} item={item} />
                        ))}
                      </Stagger>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Alertas de umbral del reporte diario: información, no trabajo —
                una línea al pie, no un banner. `message_es` viene redactado del
                agente. */}
            {alertas.length > 0 && (
              <div className="space-y-1 border-t border-border pt-2.5">
                {alertas.map((a, i) => (
                  <p
                    key={`${a.code}-${i}`}
                    role="alert"
                    className={[
                      'flex items-center gap-2 text-caption px-1',
                      a.level === 'CRITICAL' ? 'text-danger' : 'text-warning',
                    ].join(' ')}
                  >
                    <Warning className="w-3.5 h-3.5 shrink-0" weight="fill" aria-hidden="true" />
                    {textoDelAviso(a, en ? 'en' : 'es')}
                  </p>
                ))}
              </div>
            )}

            <Button asChild variant="outline" size="sm" hideArrow className="w-full sm:w-auto">
              <Link href={PENDIENTES_HREF}>
                {en ? `See the ${totalQueEspera} pending` : <>{tr("Ver los")} {totalQueEspera} {tr("pendientes")}</>}
              </Link>
            </Button>
          </>
        )}
        </CrossFade>
      </div>
    </section>
  )
}

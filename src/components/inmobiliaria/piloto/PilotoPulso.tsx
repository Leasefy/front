'use client'

/**
 * PilotoPulso — el tablero vivo: qué está pasando ahora, qué puede explotar.
 *
 * La torre ya respondía «qué necesita de mí» (la bandeja) y «qué pasó» (el
 * feed). Faltaba el presente: si el piloto está trabajando en este momento,
 * y si algo se está saliendo de cauce ANTES de que se convierta en una fila
 * más de la bandeja.
 *
 * Cuatro piezas, en orden de lectura:
 *
 *   1. El ESTADO como eyebrow — encima del titular, que es a quien encabeza.
 *      El punto late cuando hay trabajo en curso: la señal de que esto vive.
 *   2. El TITULAR — la frase que resume el momento. Es lo más importante de
 *      la pantalla, así que se compone como tal (`text-h2`), no como un
 *      renglón de 14 px debajo de números de 30.
 *   3. Los NÚMEROS DEL DÍA en un `StatStrip` del DS — una banda propia. Antes
 *      vivían apretados en la esquina superior derecha con etiquetas de 10 px
 *      compitiendo contra el titular; ahí no se leían ni dejaban leer.
 *   4. AHORA MISMO · ALERTAS — dos columnas de `ListRow`.
 *
 * ── Por qué el titular NO se repite abajo (2026-08-31) ────────────────────
 * El micro deriva el titular DE las alertas (`titularDe(senales, alertas)` en
 * `src/piloto/pulso.ts`), así que la alerta ganadora llegaba dos veces: como
 * titular y como primera fila de ALERTAS, la misma frase a 150 px de
 * distancia. Verificado contra la API real: titular `'23 promesas de pago
 * vencidas.'` vs alerta `'23 promesas de pago vencidas'` — sólo cambia el
 * punto final. Acá se descarta la alerta que YA es el titular; si por lo que
 * sea el titular no vino de ninguna alerta, no se descarta nada.
 *
 * Nada de esto se inventa en el front: el micro calcula estado, titular,
 * alertas y conteos (`GET /ai-hub/pulso`). Acá solo se pinta.
 *
 * Si el endpoint todavía no existe (404 → `notAvailable`) el panel no se
 * dibuja: la torre sigue funcionando sin él.
 */

import {
  ArrowUpRight,
  CheckCircle,
  ChatCircleDots,
  Info,
  PhoneCall,
  Pulse,
  Timer,
  WarningCircle,
  WarningOctagon,
  type Icon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { ListRow, MonoLabel, Stat, StatStrip } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import type { PulsoAlerta, PulsoEnCurso, PulsoEstado, PulsoResponse } from '@/lib/api/piloto'

/**
 * El estado tiñe SOLO el punto. El borde de la tarjeta se quedó neutro
 * (Nico, 2026-08-31): un contorno naranja de 1.400 px de ancho grita más que
 * el titular que envuelve, y compite con el único acento de la marca. La
 * señal de estado la lleva el punto —que además late cuando hay trabajo—, y
 * eso basta: el titular ya dice qué pasa con palabras.
 */
const ESTADO_META: Record<PulsoEstado, { punto: string; icono: Icon }> = {
  ok: { punto: 'bg-success', icono: CheckCircle },
  atencion: { punto: 'bg-warning', icono: WarningCircle },
  critico: { punto: 'bg-danger', icono: WarningOctagon },
}

/** Para un estado fuera del contrato: neutro, nunca verde. */
const ESTADO_META_DESCONOCIDO = {
  punto: 'bg-fg-subtle',
  icono: Info as Icon,
}

const SEVERIDAD_META: Record<
  PulsoAlerta['severidad'],
  { icono: Icon; texto: string; fondo: string }
> = {
  critica: { icono: WarningOctagon, texto: 'text-danger', fondo: 'bg-danger-soft' },
  alta: { icono: WarningCircle, texto: 'text-danger', fondo: 'bg-danger-soft' },
  media: { icono: WarningCircle, texto: 'text-warning', fondo: 'bg-warning-soft' },
  info: { icono: Info, texto: 'text-info', fondo: 'bg-info-soft' },
}

const EN_CURSO_ICON: Array<{ match: RegExp; icon: Icon }> = [
  { match: /llamada/i, icon: PhoneCall },
  { match: /conversacion|conversación|whatsapp|chat/i, icon: ChatCircleDots },
  { match: /espera|decision|decisión/i, icon: Timer },
]

function iconoEnCurso(tipo: string): Icon {
  return EN_CURSO_ICON.find((e) => e.match.test(tipo))?.icon ?? Pulse
}

/**
 * Dos frases son «la misma» ignorando puntuación final, mayúsculas y espacios
 * de más. El titular llega con punto y la alerta sin él; comparar crudo no
 * habría detectado nunca el duplicado que se ve en pantalla.
 */
function mismaFrase(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const norm = (s: string) =>
    s
      .trim()
      .replace(/[.·:;,!¡?¿\s]+$/u, '')
      .replace(/\s+/gu, ' ')
      .toLocaleLowerCase('es')
  return norm(a) === norm(b)
}

export interface PilotoPulsoProps {
  data: PulsoResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  /**
   * La lectura del Gerente (del briefing). Va acá y no en una banda aparte:
   * dos textos que resumen el mismo momento, uno encima del otro, se leen
   * como repetición. Una sola voz arriba.
   */
  lectura?: string[]
  /**
   * Plata recuperada en el mes (del briefing). Entra a la banda de números
   * con su período EN LA ETIQUETA: mezclar un dato del mes entre los de hoy
   * sin decirlo sería mentir con el encabezado.
   */
  recuperadoMesCop?: number
  /** Abre el cajón con el detalle de un caso en curso. */
  onAbrirItem?: (itemId: string) => void
  /** Abre el cajón de una alerta (regla, no fila: no se pide al micro). */
  onAbrirAlerta?: (alerta: PulsoAlerta) => void
}

export function PilotoPulso({
  data,
  isLoading,
  error,
  notAvailable,
  lectura,
  recuperadoMesCop,
  onAbrirItem,
  onAbrirAlerta,
}: PilotoPulsoProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div
        className="h-52 animate-pulse rounded-lg border border-border bg-surface-muted"
        role="status"
        aria-label={t('common.loading')}
      />
    )
  }

  // Sin endpoint o con la fuente caída, la torre sigue: este panel no se pinta.
  if (notAvailable || error || !data) return null

  // Un estado que no conocemos NO se pinta como éxito: se muestra neutro.
  // Degradar lo desconocido a verde es la forma más silenciosa de mentir.
  const meta = ESTADO_META[data.estado] ?? ESTADO_META_DESCONOCIDO
  const estadoLabel = ESTADO_META[data.estado]
    ? t(`inmobiliaria.piloto.pulso.estado.${data.estado}`)
    : t('inmobiliaria.piloto.pulso.estado.desconocido')
  const hayTrabajo = data.enCurso.length > 0

  // Se descarta la alerta que ya se está leyendo como titular (ver cabecera).
  const alertas = [...data.alertas]
    .filter((a) => !mismaFrase(a.titulo, data.titular))
    .sort((a, b) => orden(a.severidad) - orden(b.severidad))

  const enCurso = data.enCurso.slice(0, 4)
  const alertasVisibles = alertas.slice(0, 4)

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-label={t('inmobiliaria.piloto.pulso.titulo')}
    >
      {/* ── Eyebrow + titular + lectura ────────────────────────────────── */}
      <div className="px-6 pb-5 pt-6">
        {/* El estado ENCABEZA el titular. Antes colgaba debajo del párrafo,
            donde un eyebrow no rotula nada. El punto conserva el color
            semántico del estado, así que no se usa el `Eyebrow` del DS (que
            trae su cuadrito cobalto fijo): mismo tipo, punto propio. */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            {hayTrabajo && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.punto}`}
              />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.punto}`} />
          </span>
          <MonoLabel>{estadoLabel}</MonoLabel>
        </div>

        <h2 className="mt-3 max-w-3xl text-balance text-h2 font-semibold text-fg">
          {data.titular}
        </h2>

        {lectura && lectura.length > 0 && (
          <p className="mt-2 max-w-3xl text-body text-fg-muted">{lectura.join(' ')}</p>
        )}
      </div>

      {/* ── Los números del día ────────────────────────────────────────────
          `overflow-x-auto` en vez del `hidden sm:flex` de antes: en el
          teléfono la banda se desliza, que es mejor que desaparecer. */}
      {/* La banda NO dibuja sus propios bordes. El `StatStrip` trae
          `border-t border-b border-border` horneado, y apagarlo con
          `border-b-0` compite en la MISMA especificidad: si pierde el orden
          del cascade quedan dos líneas apiladas —la suya fuerte y la del
          bloque de abajo, hairline— y eso es el trazo grueso que se ve al
          hacer zoom. Con `!border-0` no hay sorteo, y la única línea la pone
          este contenedor con el mismo token que todo lo demás. */}
      <div className="border-t border-border-faint">
        <StatStrip className="!border-0 overflow-x-auto [&>*]:min-w-[124px] [&>*:first-child]:!pl-6 [&>*:last-child]:!pr-6">
        <Stat
          compact
          label={t('inmobiliaria.piloto.pulso.hoyLlamadas')}
          value={String(data.hoy.llamadas)}
        />
        <Stat
          compact
          label={t('inmobiliaria.piloto.pulso.hoyChats')}
          value={String(data.hoy.conversacionesActivas)}
        />
        <Stat
          compact
          label={t('inmobiliaria.piloto.pulso.hoyResueltas')}
          value={String(data.hoy.decisionesResueltas)}
        />
        {typeof data.hoy.contactosPlaneados === 'number' && (
          <Stat
            compact
            label={t('inmobiliaria.piloto.pulso.hoyPlaneados')}
            value={String(data.hoy.contactosPlaneados)}
          />
        )}
        {typeof recuperadoMesCop === 'number' && (
          <Stat
            compact
            label={t('inmobiliaria.piloto.kpis.recuperadoMes')}
            value={formatCurrency(recuperadoMesCop)}
            className="min-w-[168px]"
          />
        )}
        </StatStrip>
      </div>

      {/* ── Ahora mismo · Alertas ────────────────────────────────────────
          Un solo peso de trazo adentro. El separador vertical usaba `border` y
          las filas `border-faint`: la misma tarjeta con dos grosores, que es lo
          que se ve al hacer zoom. Ahora todo lo interno es hairline y
          `border-border` queda sólo para el borde exterior. */}
      {(enCurso.length > 0 || alertasVisibles.length > 0) && (
        <div className="grid gap-px border-t border-border-faint bg-border-faint sm:grid-cols-2">
          <div className="bg-surface pb-2 pt-5">
            <h3 className="mb-1 px-6"><MonoLabel>
              {t('inmobiliaria.piloto.pulso.ahora')}</MonoLabel>
            </h3>
            {enCurso.length === 0 ? (
              <p className="px-6 py-2 text-caption text-fg-subtle">
                {t('inmobiliaria.piloto.pulso.ahoraVacio')}
              </p>
            ) : (
              <ul role="list">
                {enCurso.map((item, i) => (
                  <li key={item.id}>
                    <FilaEnCurso
                      item={item}
                      onAbrir={onAbrirItem}
                      ultima={i === enCurso.length - 1}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface pb-2 pt-5">
            <h3 className="mb-1 px-6"><MonoLabel>
              {t('inmobiliaria.piloto.pulso.alertas')}</MonoLabel>
            </h3>
            {alertasVisibles.length === 0 ? (
              <p className="px-6 py-2 text-caption text-fg-subtle">
                {t('inmobiliaria.piloto.pulso.alertasVacio')}
              </p>
            ) : (
              <ul role="list">
                {alertasVisibles.map((a, i) => (
                  <li key={a.id}>
                    <FilaAlerta
                      alerta={a}
                      onAbrir={onAbrirAlerta}
                      ultima={i === alertasVisibles.length - 1}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function orden(s: PulsoAlerta['severidad']): number {
  // Lo desconocido se ordena junto a «alta» (coherente con cómo se pinta),
  // no al final donde el `slice(0, 4)` podría ocultarlo.
  return { critica: 0, alta: 1, media: 2, info: 3 }[s] ?? 1
}

function FilaEnCurso({
  item,
  onAbrir,
  ultima,
}: {
  item: PulsoEnCurso
  onAbrir?: (itemId: string) => void
  ultima: boolean
}) {
  const { t } = useI18n()
  const ItemIcon = iconoEnCurso(item.tipo)

  const fila = (
    <ListRow
      leading={<ItemIcon weight="duotone" aria-hidden="true" />}
      title={item.titulo}
      {...(item.detalle ? { meta: item.detalle } : {})}
      {...(item.desde
        ? {
            trailing: (
              <span className="font-mono text-caption tabular-nums text-fg-subtle">
                {relativeTime(item.desde, t)}
              </span>
            ),
          }
        : {})}
      noDivider={ultima}
      className="px-6"
      {...(onAbrir ? { onClick: () => onAbrir(item.id) } : {})}
      data-testid={`piloto-pulso-encurso-${item.id}`}
    />
  )

  // Sin handler pero con destino, la fila entera es el link.
  if (!onAbrir && item.href) {
    return (
      <Link href={item.href} className="block">
        {fila}
      </Link>
    )
  }
  return fila
}

function FilaAlerta({
  alerta,
  onAbrir,
  ultima,
}: {
  alerta: PulsoAlerta
  onAbrir?: (alerta: PulsoAlerta) => void
  ultima: boolean
}) {
  // Una severidad desconocida se trata como ALTA, no como info: ante la duda,
  // que la vea un humano en vez de esconderse al final de la lista.
  const meta = SEVERIDAD_META[alerta.severidad] ?? SEVERIDAD_META.alta
  const AlertaIcon = meta.icono

  const fila = (
    <ListRow
      leading={
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.fondo}`}
          aria-hidden="true"
        >
          <AlertaIcon weight="fill" className={`h-3.5 w-3.5 ${meta.texto}`} />
        </span>
      }
      title={alerta.titulo}
      meta={alerta.detalle}
      {...(alerta.href
        ? { trailing: <ArrowUpRight weight="bold" aria-hidden="true" /> }
        : {})}
      noDivider={ultima}
      className="px-6"
      {...(onAbrir ? { onClick: () => onAbrir(alerta) } : {})}
      data-testid={`piloto-pulso-alerta-${alerta.id}`}
    />
  )

  if (!onAbrir && alerta.href) {
    return (
      <Link href={alerta.href} className="block">
        {fila}
      </Link>
    )
  }
  return fila
}

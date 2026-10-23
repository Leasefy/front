'use client'

/**
 * /inquilino/aprobacion — "Mi tope de arriendo".
 *
 * La pantalla del premio: es acá donde el inquilino ve **hasta cuánto** lo
 * respaldan las aseguradoras, y desde acá salta al catálogo ya filtrado.
 *
 * Seis estados, cada uno con un trabajo distinto:
 *  · sin_estudio → enseñar el camino ANTES de pedir el primer dato
 *  · en_proceso  → tranquilizar y liberar, o pedir la autorización que falta
 *  · aprobado    → el número como héroe + quién respalda, con su prima
 *  · rechazado   → no es un callejón: por qué, qué hacer, y la salida real
 *  · expirado    → la ventana venció; se puede volver a intentar
 *  · error       → el estudio falló; reintentar es legítimo
 *
 * Slice 2 (2026-08-12): la fuente pasó de `useAprobacion` (`/api/tenant/
 * aprobacion`, del agente) a `usePreScoringCurrent` (`GET /pre-scoring/
 * current`, del back principal — contrato firme). `useAprobacion` sigue
 * viva para el banner del home (`TopeAprobadoBanner`) y el catálogo: esta
 * página no la toca, así que ese recorrido no se ve afectado.
 *
 * Vocabulario en `docs/VOCABULARIO.md` — acá nunca se dice "asegurabilidad"
 * ni "estudio": se dice **aprobación** y **tope aprobado**.
 */

import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { StatusBadge } from '@leasefy/cadence';
import { Skeleton } from '@/components/ui/skeleton';
import { useCallback } from 'react'

import { usePreScoringCurrent } from '@/lib/hooks/use-prescoring-current'
import { AseguradorasConPrima } from '@/components/tenant/AseguradorasConPrima'
import { RespuestaDelArriendo } from '@/components/aprobacion/RespuestaDelArriendo'
import { ValidacionPorWhatsapp } from '@/components/aprobacion/ValidacionPorWhatsapp'
import Link from 'next/link'
import {
  ArrowsClockwise,
  Clock,
  EnvelopeSimple,
  Hourglass,
  Info,
  WarningOctagon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { diasParaVencer, estadoVigencia, type EstadoVigencia } from '@/lib/api/aprobacion.service'
import type { PreScoringEvaluation } from '@/lib/api/prescoring.types'

const NS = 'inquilino.aprobacion'

export default function AprobacionPage() {
  const { t, locale } = useI18n()
  /** Traduce con respaldo: si falta la clave, se lee el texto igual. */
  const tf = useCallback(
    (key: string, fallback: string): string => {
      const v = t(key)
      return !v || v === key ? fallback : v
    },
    [t],
  )

  const { current, estado, isLoading, error, refetch } = usePreScoringCurrent()

  if (isLoading) {
    // Glow up 22-10: el esqueleto con la forma de la pantalla (encabezado y la cifra), no un spinner centrado.
    return (
      <div className="space-y-6 p-6 lg:p-8" aria-busy="true" data-testid="aprobacion-cargando">
        <span className="sr-only">{tf(`${NS}.cargando`, 'Cargando tu aprobación...')}</span>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-surface p-8">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
    )
  }

  // Un fallo de red es distinto de "todavía no hay nada" (sin_estudio): las
  // dos cosas llevan a acciones distintas, y `usePreScoringCurrent` ya las
  // separa (un 404 no llega acá — se resuelve como `sin_estudio`).
  if (error) {
    return (
      <div className="py-12">
        <FalloDeCarga error={error} queEs="tu aprobación" onReintentar={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion={tf('nav.buscarArriendo', 'Buscar arriendo')}
        titulo={tf(`${NS}.titulo`, 'Mi tope de arriendo')}
        descripcion={tf(`${NS}.subtitulo`, 'Hasta cuánto te respaldan las aseguradoras.')}
      />

      {/* Paso 3 de 3 cuando llegó desde «¿Te podemos arrendar este inmueble?». */}
      <RespuestaDelArriendo
        estado={estado}
        tope={current?.evaluation?.result?.fianly.maxEntrenchmentValue ?? null}
      />

      {estado === 'aprobado' && (
        <AprobadoView evaluation={current?.evaluation ?? null} tf={tf} locale={locale} />
      )}
      {estado === 'rechazado' && <RechazadoView evaluation={current?.evaluation ?? null} tf={tf} />}
      {estado === 'en_proceso' && (
        <EnProcesoView
          tf={tf}
          evaluation={current?.evaluation ?? null}
          expiresAt={current?.order?.expiresAt ?? null}
          onActualizar={refetch}
        />
      )}
      {estado === 'sin_estudio' && <SinEstudioView tf={tf} />}
      {estado === 'expirado' && <ExpiradoView tf={tf} />}
      {estado === 'error' && <ErrorEstudioView tf={tf} onReintentar={refetch} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Aprobado — el número manda
// ─────────────────────────────────────────────────────────────────────────────

function AprobadoView({
  evaluation,
  tf,
  locale,
}: {
  evaluation: PreScoringEvaluation | null
  tf: (k: string, f: string) => string
  locale: 'es' | 'en'
}) {
  const result = evaluation?.result ?? null
  const tope = result?.fianly.maxEntrenchmentValue ?? null
  const tieneTope = tope !== null
  const carriers = result?.carriers ?? []
  const bureau = result?.bureau ?? null
  const tieneDatosDeBuro = bureau !== null && (bureau.minimumScore !== null || bureau.monthlyCapacity !== null)

  return (
    <div className="space-y-6">
      {/* GLOW UP (22-10): LA RESPUESTA en una CifraHeroe con su estado (punto y palabra) y los datos del buró en
          una línea al pie, en vez de dos tarjetas con borde dentro de la tarjeta. */}
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-6">
        <StatusBadge tone="success">{tf(`${NS}.aprobado.badge`, 'Aprobado')}</StatusBadge>

        {tieneTope ? (
          <CifraHeroe
            rotulo={tf(`${NS}.aprobado.label`, 'Estás aprobado hasta')}
            cifra={formatCurrency(tope, locale)}
            contexto={locale === 'es' ? 'de canon al mes' : 'monthly rent'}
            pie={
              <span className="block space-y-2">
                <span className="block max-w-lg leading-relaxed">
                  {tf(
                    `${NS}.aprobado.ayuda`,
                    'Puedes postularte a cualquier inmueble con un canon hasta ese valor. Y a todos los que quieras: con esta aprobación no vuelves a pagar.',
                  )}
                </span>
                {tieneDatosDeBuro && (
                  <span className="flex flex-wrap gap-x-4 gap-y-1" data-testid="datos-del-buro">
                    {bureau!.minimumScore !== null && (
                      <span>
                        {tf(`${NS}.aprobado.scoreBuro`, 'Puntaje del buró')}{' '}
                        <span className="font-mono tabular-nums text-fg">{bureau!.minimumScore}</span>
                      </span>
                    )}
                    {bureau!.monthlyCapacity !== null && (
                      <span>
                        {tf(`${NS}.aprobado.capacidadMensual`, 'Capacidad de pago mensual')}{' '}
                        <span className="font-mono tabular-nums text-fg">{formatCurrency(bureau!.monthlyCapacity, locale)}</span>
                      </span>
                    )}
                  </span>
                )}
              </span>
            }
          />
        ) : (
          /* Aprobado pero sin el número: se dice que falta. Nunca se inventa. */
          <div className="space-y-2">
            <p className="text-h3 font-light text-fg">
              {tf(`${NS}.aprobado.sinTope.title`, 'Estás aprobado')}
            </p>
            <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
              {tf(
                `${NS}.aprobado.sinTope.ayuda`,
                'Estamos terminando de calcular hasta cuánto podemos respaldarte. Te avisamos apenas esté listo.',
              )}
            </p>
            {tieneDatosDeBuro && (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted" data-testid="datos-del-buro">
                {bureau!.minimumScore !== null && (
                  <span>
                    {tf(`${NS}.aprobado.scoreBuro`, 'Puntaje del buró')}{' '}
                    <span className="font-mono tabular-nums text-fg">{bureau!.minimumScore}</span>
                  </span>
                )}
                {bureau!.monthlyCapacity !== null && (
                  <span>
                    {tf(`${NS}.aprobado.capacidadMensual`, 'Capacidad de pago mensual')}{' '}
                    <span className="font-mono tabular-nums text-fg">{formatCurrency(bureau!.monthlyCapacity, locale)}</span>
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/inquilino/para-ti">
              {tf(`${NS}.aprobado.cta`, 'Ver mis inmuebles')}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/inquilino/aplicaciones">
              {tf(`${NS}.aprobado.ctaSecundaria`, 'Mis postulaciones')}
            </Link>
          </Button>
        </div>
      </section>

      <AseguradorasConPrima carriers={carriers} locale={locale} />
    </div>
  )
}

/** La vigencia corriendo — reusada tanto para el tope como para la ventana de pago. */
function VigenciaPill({
  vigenteHasta,
  tf,
}: {
  vigenteHasta: string | null
  tf: (k: string, f: string) => string
}) {
  const dias = diasParaVencer(vigenteHasta)
  const estado: EstadoVigencia | null = estadoVigencia(dias)
  if (dias === null || estado === null) return null

  const tono: Record<EstadoVigencia, string> = {
    vigente: 'bg-surface-muted text-fg-muted',
    por_vencer: 'bg-warning-soft text-warning',
    vencida: 'bg-danger-soft text-danger',
  }

  let texto: string
  if (dias > 1) texto = tf(`${NS}.vigencia.dias`, `Vence en ${dias} días`).replace('{n}', String(dias))
  else if (dias === 1) texto = tf(`${NS}.vigencia.manana`, 'Vence mañana')
  else if (dias === 0) texto = tf(`${NS}.vigencia.hoy`, 'Vence hoy')
  else if (dias === -1) texto = tf(`${NS}.vigencia.ayer`, 'Venció ayer')
  else
    texto = tf(`${NS}.vigencia.vencida`, `Venció hace ${Math.abs(dias)} días`).replace(
      '{n}',
      String(Math.abs(dias)),
    )

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium',
        tono[estado],
      )}
    >
      <Hourglass className="w-3.5 h-3.5" aria-hidden="true" />
      {texto}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rechazado — una pantalla con trabajo, no un callejón
// ─────────────────────────────────────────────────────────────────────────────

function RechazadoView({
  evaluation,
  tf,
}: {
  evaluation: PreScoringEvaluation | null
  tf: (k: string, f: string) => string
}) {
  const carriers = evaluation?.result?.carriers ?? []

  const salidas = [
    {
      id: 'perfil',
      title: tf(`${NS}.rechazado.perfil.title`, 'Mejora tu perfil crediticio'),
      desc: tf(
        `${NS}.rechazado.perfil.desc`,
        'Ponerte al día con tus obligaciones y bajar tu nivel de endeudamiento cambia el resultado más rápido de lo que parece.',
      ),
    },
    {
      id: 'reintentar',
      title: tf(`${NS}.rechazado.reintentar.title`, 'Vuelve a intentarlo más adelante'),
      desc: tf(
        `${NS}.rechazado.reintentar.desc`,
        'Esto no es definitivo. Las aseguradoras vuelven a mirar tu situación cada vez que te estudias.',
      ),
    },
    {
      id: 'tercero',
      title: tf(`${NS}.rechazado.tercero.title`, 'Alguien puede postularse por ti'),
      desc: tf(
        `${NS}.rechazado.tercero.desc`,
        'Quien firma no tiene que ser quien vive en el inmueble. Un familiar o un amigo puede postularse y tú vives ahí: es legal y es como funciona más de la mitad de los arriendos en Colombia.',
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-3">
        {/* Informativo, no error (Nico, 02-10): es un «no», pero el texto dice
            que no es definitivo y que hay salidas; un medallón rojo con una ✕
            lo contradecía. El mismo tono que el modal de `PostularButton`. */}
        <div
          className="w-12 h-12 rounded-full bg-info-soft flex items-center justify-center"
          data-testid="rechazado-medallon"
          data-tono="info"
        >
          <Info className="w-6 h-6 text-info" weight="bold" aria-hidden="true" />
        </div>
        <h2 className="text-h2 text-fg">
          {tf(`${NS}.rechazado.title`, 'Por ahora no podemos aprobarte')}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
          {carriers.length > 0
            ? `Ninguna de las ${carriers.length} aseguradoras que consultamos respaldó tu solicitud esta vez.`
            : tf(
                `${NS}.rechazado.desc`,
                'Las aseguradoras que consultamos no respaldaron tu solicitud esta vez.',
              )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg">
          {tf(`${NS}.rechazado.salidas`, 'Qué puedes hacer')}
        </h2>
        <ul className="space-y-3">
          {salidas.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm font-medium text-fg">{s.title}</p>
              <p className="text-sm text-fg-muted mt-1 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// En proceso — tranquilizar y liberar, o pedir la autorización que falta
// ─────────────────────────────────────────────────────────────────────────────

function EnProcesoView({
  tf,
  evaluation,
  expiresAt,
  onActualizar,
}: {
  tf: (k: string, f: string) => string
  evaluation: PreScoringEvaluation | null
  expiresAt: string | null
  onActualizar: () => void
}) {
  // Pagó y el estudio espera: o todavía no sale el WhatsApp de Fianly, o salió
  // y falta que valide su identidad. Es la MISMA espera que vio al pagar, con
  // «Ya la validé» y el reenvío (Nico, 15-09): quien cerró la página y vuelve
  // desde un recordatorio sigue exactamente donde quedó.
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm space-y-4 md:p-8">
      <ValidacionPorWhatsapp evaluationStatus={evaluation?.status ?? null} onActualizar={onActualizar} />
      {expiresAt && (
        <div className="pt-1">
          <VigenciaPill vigenteHasta={expiresAt} tf={tf} />
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sin estudio — mostrar el camino antes de pedir el primer dato
// ─────────────────────────────────────────────────────────────────────────────

function SinEstudioView({ tf }: { tf: (k: string, f: string) => string }) {
  const pasos = [
    {
      n: '01',
      title: tf(`${NS}.pasos.uno.title`, 'Te estudiamos'),
      desc: tf(
        `${NS}.pasos.uno.desc`,
        'Consultamos a todas las aseguradoras con las que trabajamos, no solo a una. Así tienes más chances de salir aprobado.',
      ),
    },
    {
      n: '02',
      title: tf(`${NS}.pasos.dos.title`, 'Eliges'),
      desc: tf(
        `${NS}.pasos.dos.desc`,
        'Te mostramos los inmuebles que van con tu tope aprobado, para que no pierdas tiempo con los que no aplican.',
      ),
    },
    {
      n: '03',
      title: tf(`${NS}.pasos.tres.title`, 'Te postulas'),
      desc: tf(
        `${NS}.pasos.tres.desc`,
        'Te postulas a los que quieras con el mismo estudio, sin volver a pagar.',
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-3">
        {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
        <h2 className="text-h3 text-fg">
          {tf(`${NS}.vacio.title`, 'Todavía no conoces tu tope')}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
          {tf(
            `${NS}.vacio.desc`,
            'Con tu tope sabes hasta cuánto puedes arrendar, y te postulas a todos los inmuebles que quieras con el mismo estudio.',
          )}
        </p>
        <div className="pt-2">
          {/* `/aprobacion` es la entrada del flujo vigente (Wompi, Slice 1). */}
          {/* A 390 el botón va a lo ancho y parte el texto: no se sale de la
              tarjeta (revisora r25, R1). */}
          <Button asChild size="lg" className="w-full sm:w-auto whitespace-normal h-auto min-h-12 py-3 text-center">
            <Link href="/aprobacion">
              {tf(`${NS}.vacio.cta`, 'Conocer mi tope')}
            </Link>
          </Button>
        </div>
      </section>

      {/* El camino completo ANTES de pedir el primer dato: así "postular" deja
          de parecer un compromiso ciego. */}
      {/* Revisora r27 (Mi tope, UI): a 390 las tres tarjetas medían ≈550 px de consulta: ahí van plegadas. */}
      <section className="hidden space-y-3 sm:block">
        <h2 className="text-body-sm font-medium text-fg">
          {tf(`${NS}.vacio.comoFunciona`, 'Cómo funciona')}
        </h2>
        <PasosDeMiTope pasos={pasos} />
      </section>
      <MasDetalles className="sm:hidden" etiqueta={tf(`${NS}.vacio.comoFunciona`, 'Cómo funciona')} montadoSiempre>
        <PasosDeMiTope pasos={pasos} />
      </MasDetalles>
    </div>
  )
}

function PasosDeMiTope({ pasos }: { pasos: ReadonlyArray<{ n: string; title: string; desc: string }> }) {
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {pasos.map((p) => (
        <li key={p.n} className="space-y-2 rounded-lg border border-border bg-surface p-5">
          <span className="font-mono text-caption leading-none tabular-nums text-fg-subtle">{p.n}</span>
          <p className="text-body-sm font-medium text-fg">{p.title}</p>
          <p className="text-body-sm leading-relaxed text-fg-muted">{p.desc}</p>
        </li>
      ))}
    </ol>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expirado — la ventana venció, pero se puede volver a intentar
// ─────────────────────────────────────────────────────────────────────────────

function ExpiradoView({ tf }: { tf: (k: string, f: string) => string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-3">
      <Clock className="w-6 h-6 text-warning" aria-hidden="true" />
      <h2 className="text-h3 text-fg">
        {tf(`${NS}.expirado.title`, 'Tu tiempo para completar la aprobación venció')}
      </h2>
      <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
        {tf(
          `${NS}.expirado.desc`,
          'Tenías una ventana de tiempo para terminar el estudio y ya pasó. Puedes volver a intentarlo cuando quieras.',
        )}
      </p>
      <div className="pt-2">
        <Button asChild size="lg">
          <Link href="/aprobacion">{tf(`${NS}.expirado.cta`, 'Volver a intentarlo')}</Link>
        </Button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Error — el estudio falló, reintentar es legítimo
// ─────────────────────────────────────────────────────────────────────────────

function ErrorEstudioView({
  tf,
  onReintentar,
}: {
  tf: (k: string, f: string) => string
  onReintentar: () => void
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 sm:p-8 shadow-sm space-y-3">
      <WarningOctagon className="w-6 h-6 text-danger" aria-hidden="true" />
      <h2 className="text-h3 text-fg">
        {tf(`${NS}.error.title`, 'Algo falló al hacer tu estudio')}
      </h2>
      <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
        {tf(
          `${NS}.error.desc`,
          'No pudimos completar la consulta a las aseguradoras. Puedes revisar si ya se resolvió o volver a intentarlo desde cero.',
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={onReintentar} data-testid="reintentar-estudio">
          {tf(`${NS}.error.reintentar`, 'Revisar de nuevo')}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/aprobacion">{tf(`${NS}.error.reintentarDeCero`, 'Empezar de nuevo')}</Link>
        </Button>
      </div>
    </section>
  )
}

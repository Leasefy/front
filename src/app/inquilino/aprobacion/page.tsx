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

import { useCallback } from 'react'

import { usePreScoringCurrent } from '@/lib/hooks/use-prescoring-current'
import { AseguradorasConPrima } from '@/components/tenant/AseguradorasConPrima'
import Link from 'next/link'
import {
  ArrowsClockwise,
  Clock,
  EnvelopeSimple,
  Hourglass,
  SealCheck,
  WarningOctagon,
  XCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
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
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-fg-muted">{tf(`${NS}.cargando`, 'Cargando tu aprobación...')}</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-medium text-fg tracking-tight">
          {tf(`${NS}.titulo`, 'Mi tope de arriendo')}
        </h1>
        <p className="mt-1 text-fg-muted">
          {tf(`${NS}.subtitulo`, 'Hasta cuánto te respaldan las aseguradoras')}
        </p>
      </header>

      {estado === 'aprobado' && (
        <AprobadoView evaluation={current?.evaluation ?? null} tf={tf} locale={locale} />
      )}
      {estado === 'rechazado' && <RechazadoView evaluation={current?.evaluation ?? null} tf={tf} />}
      {estado === 'en_proceso' && (
        <EnProcesoView
          tf={tf}
          evaluation={current?.evaluation ?? null}
          expiresAt={current?.order?.expiresAt ?? null}
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
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-success">
          <SealCheck className="w-5 h-5" weight="fill" aria-hidden="true" />
          <span className="text-sm font-medium">{tf(`${NS}.aprobado.badge`, 'Aprobado')}</span>
        </div>

        {tieneTope ? (
          <div className="space-y-2">
            <p className="text-sm text-fg-muted">
              {tf(`${NS}.aprobado.label`, 'Estás aprobado hasta')}
            </p>
            <p className="font-mono tabular-nums text-4xl sm:text-5xl font-semibold text-fg leading-none">
              {formatCurrency(tope, locale)}
            </p>
            <p className="text-sm text-fg-muted leading-relaxed max-w-lg pt-1">
              {tf(
                `${NS}.aprobado.ayuda`,
                'Puedes postularte a cualquier propiedad con un canon hasta ese valor. Y a todas las que quieras: con esta aprobación no vuelves a pagar.',
              )}
            </p>
          </div>
        ) : (
          /* Aprobado pero sin el número: se dice que falta. Nunca se inventa. */
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-fg">
              {tf(`${NS}.aprobado.sinTope.title`, 'Estás aprobado')}
            </p>
            <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
              {tf(
                `${NS}.aprobado.sinTope.ayuda`,
                'Estamos terminando de calcular hasta cuánto podemos respaldarte. Te avisamos apenas esté listo.',
              )}
            </p>
          </div>
        )}

        {tieneDatosDeBuro && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {bureau!.minimumScore !== null && (
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <p className="font-mono text-caption uppercase tracking-[0.08em] text-fg-subtle">
                  {tf(`${NS}.aprobado.scoreBuro`, 'Score de buró')}
                </p>
                <p className="font-mono text-xl font-semibold tabular-nums text-fg">
                  {bureau!.minimumScore}
                </p>
              </div>
            )}
            {bureau!.monthlyCapacity !== null && (
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <p className="font-mono text-caption uppercase tracking-[0.08em] text-fg-subtle">
                  {tf(`${NS}.aprobado.capacidadMensual`, 'Capacidad de pago mensual')}
                </p>
                <p className="font-mono text-xl font-semibold tabular-nums text-fg">
                  {formatCurrency(bureau!.monthlyCapacity, locale)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button asChild>
            <Link href="/inquilino/para-ti">
              {tf(`${NS}.aprobado.cta`, 'Ver mis propiedades')}
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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
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
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center">
          <XCircle className="w-6 h-6 text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-fg">
          {tf(`${NS}.rechazado.title`, 'Por ahora no podemos aprobarte')}
        </h1>
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
}: {
  tf: (k: string, f: string) => string
  evaluation: PreScoringEvaluation | null
  expiresAt: string | null
}) {
  // Dos motivos bien distintos de "en proceso": todavía se está consultando
  // a las aseguradoras, o el correo con la autorización sigue sin abrirse.
  // Decirle "estamos consultando" a alguien que no ha dado permiso es falso.
  const esperandoAutorizacion = evaluation?.status === 'awaiting_authorization'

  return (
    <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
        {esperandoAutorizacion ? (
          <EnvelopeSimple className="w-6 h-6 text-primary" aria-hidden="true" />
        ) : (
          <ArrowsClockwise className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
        )}
      </div>
      {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
      <h2 className="text-2xl font-semibold text-fg">
        {esperandoAutorizacion
          ? tf(`${NS}.proceso.autorizacion.title`, 'Esperamos tu autorización')
          : tf(`${NS}.proceso.title`, 'Estamos consultando a las aseguradoras')}
      </h2>
      <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
        {esperandoAutorizacion
          ? tf(
              `${NS}.proceso.autorizacion.desc`,
              'Te mandamos un correo para que autorices la consulta a las aseguradoras. Apenas confirmes, seguimos solos.',
            )
          : tf(
              `${NS}.proceso.desc`,
              'Le preguntamos a todas con las que trabajamos, no solo a una. Es cuestión de segundos.',
            )}
      </p>

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
        'Te mostramos las propiedades que van con tu tope aprobado, para que no pierdas tiempo con las que no aplican.',
      ),
    },
    {
      n: '03',
      title: tf(`${NS}.pasos.tres.title`, 'El propietario decide'),
      desc: tf(
        `${NS}.pasos.tres.desc`,
        'Te postulas a las que quieras con el mismo estudio, sin volver a pagar.',
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
        {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
        <h2 className="text-2xl font-semibold text-fg">
          {tf(`${NS}.vacio.title`, 'Todavía no tienes una aprobación')}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
          {tf(
            `${NS}.vacio.desc`,
            'Con una aprobación sabes hasta cuánto puedes arrendar, y te postulas a todas las propiedades que quieras con el mismo estudio.',
          )}
        </p>
        <div className="pt-2">
          {/* `/aprobacion` es la entrada del flujo vigente (Wompi, Slice 1). */}
          <Button asChild size="lg">
            <Link href="/aprobacion">
              {tf(`${NS}.vacio.cta`, 'Conoce hasta cuánto te arrendamos')}
            </Link>
          </Button>
        </div>
      </section>

      {/* El camino completo ANTES de pedir el primer dato: así "postular" deja
          de parecer un compromiso ciego. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg">
          {tf(`${NS}.vacio.comoFunciona`, 'Cómo funciona')}
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pasos.map((p) => (
            <li key={p.n} className="rounded-lg border border-border bg-surface p-5 space-y-2">
              <span className="font-mono tabular-nums text-2xl font-light text-primary/40 leading-none">
                {p.n}
              </span>
              <p className="text-sm font-medium text-fg">{p.title}</p>
              <p className="text-sm text-fg-muted leading-relaxed">{p.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expirado — la ventana venció, pero se puede volver a intentar
// ─────────────────────────────────────────────────────────────────────────────

function ExpiradoView({ tf }: { tf: (k: string, f: string) => string }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
      <div className="w-12 h-12 rounded-full bg-warning-soft flex items-center justify-center">
        <Clock className="w-6 h-6 text-warning" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold text-fg">
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
    <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
      <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center">
        <WarningOctagon className="w-6 h-6 text-danger" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold text-fg">
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

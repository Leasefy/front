'use client'

/**
 * /inquilino/aprobacion — "Mi tope de arriendo".
 *
 * T-0193: the answer to "¿hasta cuánto me arriendan?" is the free document
 * study (`GET /calificacion-leasefy/estudio/actual`), scored by Leasefy's
 * bureau. The figure is `resultado.canonMaximoCop`, shown verbatim as "the rent
 * range where you have better chances of being accepted" — a guide, never a
 * promise, never a guarantee. No insurers, no payment, no deposit (Ley 820
 * art. 16: a deposit condition is filtered out defensively).
 *
 * States, each with its own job:
 *  · sin estudio   → show the path BEFORE asking for anything
 *  · borrador      → an unfinished study: continue it
 *  · en proceso    → reassure; the hook polls every 3 s and this updates itself
 *  · listo         → the number as hero + letter, conditions, how it was computed
 *  · sin ingreso   → the study finished but no income could be verified: never $0
 *  · vencido       → past `venceEl`; repeat the study
 *  · fallido       → the back's user-facing message + retry
 *
 * Vocabulary in `docs/VOCABULARIO.md`: "aprobación" / "tope", never
 * "asegurabilidad".
 */

import Link from 'next/link'
import { useCallback } from 'react'
import { Clock, Hourglass, WarningOctagon } from '@phosphor-icons/react'
import { StatusBadge } from '@leasefy/cadence'

import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { RespuestaDelArriendo } from '@/components/aprobacion/RespuestaDelArriendo'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { mapEstudioToAprobacion } from '@/lib/api/aprobacion-from-estudio'
import { diasParaVencer, estadoVigencia, type EstadoVigencia } from '@/lib/api/aprobacion.service'
import type { EstudioDeCanon, ResultadoDelEstudio } from '@/lib/api/estudio-de-canon.types'
import { formatCurrency } from '@/lib/format'
import { useEstudioDeCanon } from '@/lib/hooks/use-estudio-de-canon'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const NS = 'inquilino.aprobacion'

type Tf = (key: string, fallback: string) => string

/** Starts a NEW study (a finished one is not re-opened by `/aprobacion`). */
const REPETIR = '/aprobacion?repetir=1'

export default function AprobacionPage() {
  const { t, locale } = useI18n()
  /** Translates with a fallback: if the key is missing, the Spanish text is read anyway. */
  const tf: Tf = useCallback(
    (key, fallback) => {
      const v = t(key)
      return !v || v === key ? fallback : v
    },
    [t],
  )

  const { estudio, isLoading, error, refetch } = useEstudioDeCanon()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 lg:p-8" aria-busy="true" data-testid="aprobacion-cargando">
        <span className="sr-only">{tf(`${NS}.cargando`, 'Cargando tu tope...')}</span>
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

  // A network failure is different from "no study yet": different actions.
  if (error) {
    return (
      <div className="py-12">
        <FalloDeCarga error={error} queEs="tu tope" onReintentar={refetch} />
      </div>
    )
  }

  const vencido = estadoVigencia(diasParaVencer(estudio?.venceEl ?? null)) === 'vencida'
  const aprobacion = mapEstudioToAprobacion(estudio)
  const tope = aprobacion.topeAprobadoCop

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion={tf('nav.buscarArriendo', 'Buscar arriendo')}
        titulo={tf(`${NS}.titulo`, 'Mi tope de arriendo')}
        descripcion={tf(`${NS}.subtitulo`, 'El rango de arriendo donde tienes mejores posibilidades de que te acepten.')}
      />

      {/* Paso 3 de 3 cuando llegó desde «¿Te podemos arrendar este inmueble?». */}
      <RespuestaDelArriendo estado={vencido ? 'sin_estudio' : aprobacion.estado} tope={vencido ? null : tope} />

      {!estudio && <SinEstudioView tf={tf} />}
      {estudio?.status === 'DRAFT' && <BorradorView tf={tf} />}
      {estudio?.status === 'PROCESSING' && <ProcesoView tf={tf} />}
      {estudio?.status === 'FAILED' && <FalloView tf={tf} estudio={estudio} />}
      {estudio?.status === 'COMPLETED' && vencido && <VencidoView tf={tf} />}
      {estudio?.status === 'COMPLETED' && !vencido && estudio.resultado && estudio.resultado.canonMaximoCop !== null && (
        <ResultadoView tf={tf} locale={locale} estudio={estudio} resultado={estudio.resultado} tope={estudio.resultado.canonMaximoCop} />
      )}
      {estudio?.status === 'COMPLETED' && !vencido && (!estudio.resultado || estudio.resultado.canonMaximoCop === null) && (
        <SinIngresoView tf={tf} resultado={estudio.resultado} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Listo — el número manda
// ─────────────────────────────────────────────────────────────────────────────

function ResultadoView({
  tf,
  locale,
  estudio,
  resultado,
  tope,
}: {
  tf: Tf
  locale: 'es' | 'en'
  estudio: EstudioDeCanon
  resultado: ResultadoDelEstudio
  tope: number
}) {
  // Ley 820 art. 16: a deposit is never a condition the UI shows. The back never
  // sends one; this is the last line of defence.
  const condiciones = resultado.condiciones.filter((c) => !/dep[oó]sito/i.test(c))

  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface p-5 sm:p-8" data-testid="resultado-del-estudio">
      <StatusBadge tone="success">{tf(`${NS}.resultado.badge`, 'Estudio listo')}</StatusBadge>

      <CifraHeroe
        rotulo={tf(`${NS}.resultado.label`, 'El rango donde tienes mejores posibilidades de que te acepten')}
        cifra={`${tf(`${NS}.resultado.hasta`, 'Hasta')} ${formatCurrency(tope, locale)}`}
        contexto={tf(`${NS}.resultado.contexto`, 'de canon al mes')}
        pie={
          <span className="block space-y-2">
            <span className="block max-w-lg leading-relaxed">
              {tf(
                `${NS}.resultado.ayuda`,
                'Es una guía, no una promesa: la inmobiliaria decide con cada postulación. Te mostramos primero los inmuebles que caben en este rango.',
              )}
            </span>
            {resultado.letra && (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="calificacion-del-estudio">
                <span>
                  {tf(`${NS}.resultado.calificacion`, 'Tu Calificación Leasefy')}{' '}
                  <span className="font-mono tabular-nums text-fg">
                    {resultado.letra}
                    {resultado.puntaje !== null ? ` · ${resultado.puntaje}/100` : ''}
                  </span>
                </span>
                <Link href="/inquilino/calificacion" className="underline hover:no-underline">
                  {tf(`${NS}.resultado.verCalificacion`, 'Ver el detalle')}
                </Link>
              </span>
            )}
          </span>
        }
      />

      <VigenciaPill tf={tf} locale={locale} venceEl={estudio.venceEl} />

      {condiciones.length > 0 && (
        <div className="space-y-2" data-testid="condiciones-del-estudio">
          <h2 className="text-sm font-medium text-fg">
            {tf(`${NS}.resultado.condiciones`, 'Para arrendar en este rango podrían pedirte')}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
            {condiciones.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {resultado.revisiones.length > 0 && (
        <div className="space-y-2" data-testid="revisiones-del-estudio">
          <h2 className="text-sm font-medium text-fg">{tf(`${NS}.resultado.revisiones`, 'Lo que estamos revisando')}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
            {resultado.revisiones.map((r) => (
              <li key={r.codigo}>{r.texto}</li>
            ))}
          </ul>
        </div>
      )}

      {resultado.explicacion.length > 0 && (
        <MasDetalles etiqueta={tf(`${NS}.resultado.explicacion`, 'Cómo lo calculamos')} montadoSiempre>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted" data-testid="explicacion-del-estudio">
            {resultado.explicacion.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </MasDetalles>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/inquilino/para-ti">{tf(`${NS}.resultado.cta`, 'Ver mis inmuebles')}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/inquilino/aplicaciones">{tf(`${NS}.resultado.ctaSecundaria`, 'Mis postulaciones')}</Link>
        </Button>
      </div>
    </section>
  )
}

/** The validity line. `venceEl` null → nothing rendered (contract §3.2). */
function VigenciaPill({ tf, locale, venceEl }: { tf: Tf; locale: 'es' | 'en'; venceEl: string | null }) {
  const dias = diasParaVencer(venceEl)
  const estado: EstadoVigencia | null = estadoVigencia(dias)
  if (dias === null || estado === null || !venceEl) return null

  const tono: Record<EstadoVigencia, string> = {
    vigente: 'bg-surface-muted text-fg-muted',
    por_vencer: 'bg-warning-soft text-warning',
    vencida: 'bg-danger-soft text-danger',
  }

  let texto: string
  if (dias > 3) {
    const fecha = new Date(venceEl).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    texto = tf(`${NS}.vigencia.hasta`, 'Vigente hasta {fecha}').replace('{fecha}', fecha)
  } else if (dias > 1) texto = tf(`${NS}.vigencia.dias`, 'Vence en {n} días').replace('{n}', String(dias))
  else if (dias === 1) texto = tf(`${NS}.vigencia.manana`, 'Vence mañana')
  else if (dias === 0) texto = tf(`${NS}.vigencia.hoy`, 'Vence hoy')
  else if (dias === -1) texto = tf(`${NS}.vigencia.ayer`, 'Venció ayer')
  else texto = tf(`${NS}.vigencia.vencida`, 'Venció hace {n} días').replace('{n}', String(Math.abs(dias)))

  return (
    <p>
      <span
        className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium', tono[estado])}
        data-testid="vigencia-del-estudio"
      >
        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
        {texto}
      </span>
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminó sin ingreso verificado — nunca $0, nunca un número inventado
// ─────────────────────────────────────────────────────────────────────────────

function SinIngresoView({ tf, resultado }: { tf: Tf; resultado: ResultadoDelEstudio | null }) {
  const revisiones = resultado?.revisiones ?? []
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8" data-testid="estudio-sin-ingreso">
      <WarningOctagon className="h-6 w-6 text-warning" aria-hidden="true" />
      <h2 className="text-h3 text-fg">{tf(`${NS}.sinIngreso.title`, 'No pudimos verificar tu ingreso')}</h2>
      <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
        {tf(
          `${NS}.sinIngreso.desc`,
          'Con los documentos que subiste no alcanzamos a confirmar cuánto ganas, así que no podemos mostrarte un rango. Puedes subir otros documentos, como un extracto más reciente, un desprendible de nómina o una certificación laboral.',
        )}
      </p>
      {revisiones.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {revisiones.map((r) => (
            <li key={r.codigo}>{r.texto}</li>
          ))}
        </ul>
      )}
      <div className="pt-2">
        <Button asChild size="lg">
          <Link href={REPETIR}>{tf(`${NS}.sinIngreso.cta`, 'Subir otros documentos')}</Link>
        </Button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vencido — la vigencia pasó, se puede repetir
// ─────────────────────────────────────────────────────────────────────────────

function VencidoView({ tf }: { tf: Tf }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8" data-testid="estudio-vencido">
      <Clock className="h-6 w-6 text-warning" aria-hidden="true" />
      <h2 className="text-h3 text-fg">{tf(`${NS}.vencido.title`, 'Tu estudio venció')}</h2>
      <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
        {tf(
          `${NS}.vencido.desc`,
          'Tu situación cambia con el tiempo, así que el estudio vale por seis meses. Vuelve a subir tus documentos y recalculamos tu rango, gratis.',
        )}
      </p>
      <div className="pt-2">
        <Button asChild size="lg">
          <Link href={REPETIR}>{tf(`${NS}.vencido.cta`, 'Hacer un estudio nuevo')}</Link>
        </Button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// En proceso, borrador, fallido
// ─────────────────────────────────────────────────────────────────────────────

function ProcesoView({ tf }: { tf: Tf }) {
  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8"
      data-testid="estudio-en-proceso"
      aria-live="polite"
    >
      <Hourglass className="h-6 w-6 text-primary" aria-hidden="true" />
      <h2 className="text-h3 text-fg">{tf(`${NS}.proceso.title`, 'Estamos leyendo tus documentos')}</h2>
      <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
        {tf(
          `${NS}.proceso.desc`,
          'Puede tardar unos minutos. Puedes cerrar esta pantalla y volver más tarde, o recargar la página para ver si ya terminó. Revisamos el avance cada dos minutos.',
        )}
      </p>
    </section>
  )
}

function BorradorView({ tf }: { tf: Tf }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8" data-testid="estudio-borrador">
      <h2 className="text-h3 text-fg">{tf(`${NS}.borrador.title`, 'Tienes un estudio sin terminar')}</h2>
      <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
        {tf(`${NS}.borrador.desc`, 'Sube tu cédula y tu extracto bancario para conocer tu tope.')}
      </p>
      <div className="pt-2">
        <Button asChild size="lg">
          <Link href="/aprobacion">{tf(`${NS}.borrador.cta`, 'Continuar mi estudio')}</Link>
        </Button>
      </div>
    </section>
  )
}

function FalloView({ tf, estudio }: { tf: Tf; estudio: EstudioDeCanon }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8" data-testid="estudio-fallido">
      <WarningOctagon className="h-6 w-6 text-danger" aria-hidden="true" />
      <h2 className="text-h3 text-fg">{tf(`${NS}.fallo.title`, 'No pudimos terminar tu estudio')}</h2>
      <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
        {estudio.error?.mensaje || tf(`${NS}.fallo.desc`, 'No pudimos leer tus documentos.')}
      </p>
      <div className="pt-2">
        <Button asChild size="lg">
          <Link href="/aprobacion">{tf(`${NS}.fallo.cta`, 'Revisar y reintentar')}</Link>
        </Button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sin estudio — mostrar el camino antes de pedir el primer dato
// ─────────────────────────────────────────────────────────────────────────────

function SinEstudioView({ tf }: { tf: Tf }) {
  const pasos = [
    {
      n: '01',
      title: tf(`${NS}.pasos.uno.title`, 'Subes tus documentos'),
      desc: tf(
        `${NS}.pasos.uno.desc`,
        'Tu cédula y tu extracto bancario. Si tienes desprendible de nómina o certificación laboral, mejor. Es gratis.',
      ),
    },
    {
      n: '02',
      title: tf(`${NS}.pasos.dos.title`, 'Calculamos tu rango'),
      desc: tf(
        `${NS}.pasos.dos.desc`,
        'Leemos tus documentos y te decimos hasta cuánto arriendo tienes mejores posibilidades de que te acepten.',
      ),
    },
    {
      n: '03',
      title: tf(`${NS}.pasos.tres.title`, 'Te postulas'),
      desc: tf(
        `${NS}.pasos.tres.desc`,
        'Te postulas a los inmuebles que quieras con el mismo estudio, sin volver a subir nada.',
      ),
    },
  ]

  return (
    <div className="space-y-6" data-testid="estudio-vacio">
      <section className="space-y-3 rounded-lg border border-border bg-surface p-5 sm:p-8">
        {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
        <h2 className="text-h3 text-fg">{tf(`${NS}.vacio.title`, 'Todavía no conoces tu tope')}</h2>
        <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
          {tf(
            `${NS}.vacio.desc`,
            'Con tu tope sabes en qué rango de arriendo tienes mejores posibilidades de que te acepten, y te postulas a todos los inmuebles que quieras con el mismo estudio.',
          )}
        </p>
        <div className="pt-2">
          {/* A 390 el botón va a lo ancho y parte el texto: no se sale de la tarjeta. */}
          <Button asChild size="lg" className="h-auto min-h-12 w-full whitespace-normal py-3 text-center sm:w-auto">
            <Link href="/aprobacion">{tf(`${NS}.vacio.cta`, 'Conocer mi tope')}</Link>
          </Button>
        </div>
      </section>

      {/* El camino completo ANTES de pedir el primer dato. A 390 las tres tarjetas van plegadas. */}
      <section className="hidden space-y-3 sm:block">
        <h2 className="text-body-sm font-medium text-fg">{tf(`${NS}.vacio.comoFunciona`, 'Cómo funciona')}</h2>
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

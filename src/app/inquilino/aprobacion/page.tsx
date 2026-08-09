'use client'

/**
 * /inquilino/aprobacion — "Mi tope de arriendo".
 *
 * La pantalla del premio: es acá donde el inquilino ve **hasta cuánto** lo
 * respaldan las aseguradoras, y desde acá salta al catálogo ya filtrado.
 *
 * Cuatro estados, cada uno con un trabajo distinto:
 *  · sin_estudio → enseñar el camino ANTES de pedir el primer dato
 *  · en_proceso  → tranquilizar y liberar (puede cerrar la página)
 *  · aprobado    → el número como héroe + la vigencia corriendo
 *  · rechazado   → no es un callejón: por qué, qué hacer, y la salida real
 *
 * Aditiva: no reemplaza ninguna pantalla existente.
 * Vocabulario en `docs/VOCABULARIO.md` — acá nunca se dice "asegurabilidad"
 * ni "estudio": se dice **aprobación** y **tope aprobado**.
 */

import { useCallback } from 'react'

import { useAprobacion } from '@/lib/hooks/use-aprobacion'
import { useCobroAprobacion } from '@/lib/hooks/use-cobro-aprobacion'
import Link from 'next/link'
import {
  ArrowsClockwise,
  CheckCircle,
  Hourglass,
  SealCheck,
  UsersThree,
  XCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui'
import { ErrorState } from '@/components/ui/error-state'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  diasParaVencer,
  estadoVigencia,
  type Aprobacion,
  type EstadoVigencia,
} from '@/lib/api/aprobacion.service'

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

  /*
   * MISMA fuente que el resto del recorrido (`useAprobacion`), no un fetch
   * propio.
   *
   * Esta página llamaba a `fetchAprobacion()` directo, así que era la única que
   * NO veía el respaldo local — y por lo tanto la única que le decía "todavía
   * no tienes una aprobación" a alguien que acababa de aprobarse. Justo la
   * pantalla que lleva su nombre.
   */
  const { aprobacion: data, cargando: loading, error, recargar: load } = useAprobacion()

  /*
   * La pantalla de pago no tenía **entrada**: nada en la app enlazaba a ella.
   * Ésta es su entrada natural, pero el enlace sólo puede aparecer cuando hay
   * algo que pagar de verdad — hoy el backend no tiene la ruta de cobro, y un
   * botón que lleva a "todavía no se puede" es peor que ningún botón.
   */
  const { hayQuePagar } = useCobroAprobacion()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="md" variant="muted" />
        <p className="text-sm text-fg-muted">{tf(`${NS}.cargando`, 'Cargando tu aprobación...')}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <ErrorState
          title={tf(`${NS}.error.title`, 'No pudimos cargar tu aprobación')}
          description={error ?? undefined}
          onRetry={load}
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/*
        Era solo una etiqueta mono en versalitas: la única pantalla del panel
        **sin `h1`**, y sin subtítulo. Un lector de pantalla no encontraba
        encabezado, y visualmente tampoco se parecía a las otras nueve, que
        abren con título grande + una línea que dice qué hace la pantalla.
      */}
      <header>
        <h1 className="text-3xl font-medium text-fg tracking-tight">
          {tf(`${NS}.titulo`, 'Mi tope de arriendo')}
        </h1>
        <p className="mt-1 text-fg-muted">
          {tf(`${NS}.subtitulo`, 'Hasta cuánto te respaldan las aseguradoras')}
        </p>
      </header>

      {data.estado === 'aprobado' && <AprobadoView data={data} tf={tf} locale={locale} />}
      {data.estado === 'rechazado' && <RechazadoView data={data} tf={tf} />}
      {data.estado === 'en_proceso' && <EnProcesoView tf={tf} hayQuePagar={hayQuePagar} />}
      {data.estado === 'sin_estudio' && <SinEstudioView tf={tf} hayQuePagar={hayQuePagar} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Aprobado — el número manda
// ─────────────────────────────────────────────────────────────────────────────

function AprobadoView({
  data,
  tf,
  locale,
}: {
  data: Aprobacion
  tf: (k: string, f: string) => string
  locale: 'es' | 'en'
}) {
  const aprobadas = data.aseguradoras.filter((a) => a.aprobada).length
  const tieneTope = data.topeAprobadoCop !== null

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-success">
          <SealCheck className="w-5 h-5" weight="fill" aria-hidden="true" />
          <span className="text-sm font-medium">{tf('inquilino.aprobacion.aprobado.badge', 'Aprobado')}</span>
        </div>

        {tieneTope ? (
          <div className="space-y-2">
            <p className="text-sm text-fg-muted">
              {tf('inquilino.aprobacion.aprobado.label', 'Estás aprobado hasta')}
            </p>
            <p className="font-mono tabular-nums text-4xl sm:text-5xl font-semibold text-fg leading-none">
              {formatCurrency(data.topeAprobadoCop, locale)}
            </p>
            <p className="text-sm text-fg-muted leading-relaxed max-w-lg pt-1">
              {tf(
                'inquilino.aprobacion.aprobado.ayuda',
                'Puedes postularte a cualquier propiedad con un canon hasta ese valor. Y a todas las que quieras: con esta aprobación no vuelves a pagar.',
              )}
            </p>
          </div>
        ) : (
          /* Aprobado pero sin el número: se dice que falta. Nunca se inventa. */
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-fg">
              {tf('inquilino.aprobacion.aprobado.sinTope.title', 'Estás aprobado')}
            </p>
            <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
              {tf(
                'inquilino.aprobacion.aprobado.sinTope.ayuda',
                'Estamos terminando de calcular hasta cuánto podemos respaldarte. Te avisamos apenas esté listo.',
              )}
            </p>
          </div>
        )}

        <VigenciaPill vigenteHasta={data.vigenteHasta} tf={tf} />

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* El Button ya trae su propia flecha — no se le suma otra. */}
          <Button asChild>
            <Link href="/inquilino/para-ti">
              {tf('inquilino.aprobacion.aprobado.cta', 'Ver mis propiedades')}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/inquilino/aplicaciones">
              {tf('inquilino.aprobacion.aprobado.ctaSecundaria', 'Mis postulaciones')}
            </Link>
          </Button>
        </div>
      </section>

      {data.aseguradoras.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center flex-shrink-0">
              <UsersThree className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-fg">
                {/* Con una sola aseguradora "Consultamos varias" es falso. */}
                {data.aseguradoras.length === 1
                  ? tf('inquilino.aprobacion.aseguradoras.titleUna', 'Consultamos a la aseguradora')
                  : tf('inquilino.aprobacion.aseguradoras.title', 'Consultamos varias aseguradoras')}
              </p>
              <p className="text-sm text-fg-muted mt-0.5">
                {data.aseguradoras.length === 1
                  ? `1 consultada · ${aprobadas === 1 ? 'te aprobó' : 'no te aprobó'}`
                  : `${data.aseguradoras.length} consultadas · ${aprobadas} te ${aprobadas === 1 ? 'aprobó' : 'aprobaron'}`}
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.aseguradoras.map((a) => (
              <li
                key={a.nombre}
                className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2"
              >
                {a.aprobada ? (
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" weight="fill" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-fg-muted flex-shrink-0" aria-hidden="true" />
                )}
                <span className={cn('text-sm', a.aprobada ? 'text-fg' : 'text-fg-muted')}>{a.nombre}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** La vigencia corriendo — es el motor del cierre, por eso va siempre visible. */
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
  if (dias > 1) texto = tf('inquilino.aprobacion.vigencia.dias', `Vence en ${dias} días`).replace('{n}', String(dias))
  else if (dias === 1) texto = tf('inquilino.aprobacion.vigencia.manana', 'Vence mañana')
  else if (dias === 0) texto = tf('inquilino.aprobacion.vigencia.hoy', 'Vence hoy')
  else if (dias === -1) texto = tf('inquilino.aprobacion.vigencia.ayer', 'Venció ayer')
  else
    texto = tf('inquilino.aprobacion.vigencia.vencida', `Venció hace ${Math.abs(dias)} días`).replace(
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

function RechazadoView({ data, tf }: { data: Aprobacion; tf: (k: string, f: string) => string }) {
  const salidas = [
    {
      id: 'perfil',
      title: tf('inquilino.aprobacion.rechazado.perfil.title', 'Mejora tu perfil crediticio'),
      desc: tf(
        'inquilino.aprobacion.rechazado.perfil.desc',
        'Ponerte al día con tus obligaciones y bajar tu nivel de endeudamiento cambia el resultado más rápido de lo que parece.',
      ),
    },
    {
      id: 'reintentar',
      title: tf('inquilino.aprobacion.rechazado.reintentar.title', 'Vuelve a intentarlo más adelante'),
      desc: tf(
        'inquilino.aprobacion.rechazado.reintentar.desc',
        'Esto no es definitivo. Las aseguradoras vuelven a mirar tu situación cada vez que te estudias.',
      ),
    },
    {
      id: 'tercero',
      title: tf('inquilino.aprobacion.rechazado.tercero.title', 'Alguien puede postularse por ti'),
      desc: tf(
        'inquilino.aprobacion.rechazado.tercero.desc',
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
          {tf('inquilino.aprobacion.rechazado.title', 'Por ahora no podemos aprobarte')}
        </h1>
        <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
          {data.aseguradoras.length > 0
            ? `Ninguna de las ${data.aseguradoras.length} aseguradoras que consultamos respaldó tu solicitud esta vez.`
            : tf(
                'inquilino.aprobacion.rechazado.desc',
                'Las aseguradoras que consultamos no respaldaron tu solicitud esta vez.',
              )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg">
          {tf('inquilino.aprobacion.rechazado.salidas', 'Qué puedes hacer')}
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
// En proceso — tranquilizar y liberar
// ─────────────────────────────────────────────────────────────────────────────

function EnProcesoView({
  tf,
  hayQuePagar,
}: {
  tf: (k: string, f: string) => string
  hayQuePagar: boolean
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center">
        <ArrowsClockwise className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
      </div>
      {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
      <h2 className="text-2xl font-semibold text-fg">
        {tf('inquilino.aprobacion.proceso.title', 'Estamos consultando a las aseguradoras')}
      </h2>
      <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
        {tf(
          'inquilino.aprobacion.proceso.desc',
          'Le preguntamos a todas con las que trabajamos, no solo a una. Puede tomar unos minutos.',
        )}
      </p>
      {/* El punto clave: que sepa que puede irse sin perder nada. */}
      <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
        {tf(
          'inquilino.aprobacion.proceso.liberar',
          'Te avisamos por correo apenas tengamos respuesta — puedes cerrar esta página tranquilo.',
        )}
      </p>

      {/* Si quedó un pago pendiente, la consulta no avanza hasta que se haga.
          Decirlo acá es la diferencia entre esperar y esperar en vano. */}
      {hayQuePagar && (
        <div className="pt-2">
          <p className="text-sm text-fg mb-3">
            {tf(
              'inquilino.aprobacion.proceso.faltaPagar',
              'Nos falta tu pago para poder consultarlas.',
            )}
          </p>
          <Button asChild>
            <Link href="/inquilino/aprobacion/pago">
              {tf('inquilino.aprobacion.proceso.pagar', 'Pagar y conocer mi tope')}
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sin estudio — mostrar el camino antes de pedir el primer dato
// ─────────────────────────────────────────────────────────────────────────────

function SinEstudioView({
  tf,
  hayQuePagar,
}: {
  tf: (k: string, f: string) => string
  hayQuePagar: boolean
}) {
  const pasos = [
    {
      n: '01',
      title: tf('inquilino.aprobacion.pasos.uno.title', 'Te estudiamos'),
      desc: tf(
        'inquilino.aprobacion.pasos.uno.desc',
        'Consultamos a todas las aseguradoras con las que trabajamos, no solo a una. Así tienes más chances de salir aprobado.',
      ),
    },
    {
      n: '02',
      title: tf('inquilino.aprobacion.pasos.dos.title', 'Eliges'),
      desc: tf(
        'inquilino.aprobacion.pasos.dos.desc',
        'Te mostramos las propiedades que van con tu tope aprobado, para que no pierdas tiempo con las que no aplican.',
      ),
    },
    {
      n: '03',
      title: tf('inquilino.aprobacion.pasos.tres.title', 'El propietario decide'),
      desc: tf(
        'inquilino.aprobacion.pasos.tres.desc',
        'Te postulas a las que quieras con el mismo estudio, sin volver a pagar.',
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm space-y-3">
        {/* h2 y no h1: el h1 de la página es "Mi tope de arriendo". */}
        <h2 className="text-2xl font-semibold text-fg">
          {tf('inquilino.aprobacion.vacio.title', 'Todavía no tienes una aprobación')}
        </h2>
        <p className="text-sm text-fg-muted leading-relaxed max-w-lg">
          {tf(
            'inquilino.aprobacion.vacio.desc',
            'Con una aprobación sabes hasta cuánto puedes arrendar, y te postulas a todas las propiedades que quieras con el mismo estudio.',
          )}
        </p>
        <div className="pt-2">
          {/* Con un cobro pendiente, el siguiente paso es pagar y no volver a
              empezar el formulario: mandarlo al wizard le haría repetir todo. */}
          <Button asChild size="lg">
            <Link href={hayQuePagar ? '/inquilino/aprobacion/pago' : '/aprobacion'}>
              {hayQuePagar
                ? tf('inquilino.aprobacion.vacio.ctaPagar', 'Pagar y conocer mi tope')
                : tf('inquilino.aprobacion.vacio.cta', 'Conoce hasta cuánto te arrendamos')}
            </Link>
          </Button>
        </div>
      </section>

      {/* El camino completo ANTES de pedir el primer dato: así "postular" deja
          de parecer un compromiso ciego. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg">
          {tf('inquilino.aprobacion.vacio.comoFunciona', 'Cómo funciona')}
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

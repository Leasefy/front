'use client'

/**
 * RecorridoMapa — los 11 pasos del recorrido, en dos tramos: lo que hace el
 * inquilino (1–6) y lo que te toca a ti (7–11), con el corte donde cambia de
 * manos dibujado entre los dos.
 *
 * ── Dos rediseños, y lo que enseñó cada uno ───────────────────────────────
 *
 * Nació como una lista vertical de once filas con riel: correcta, pero larga y
 * fea («esto está horrible… mejora muchísimo eso a nivel UI», Nico,
 * 2026-09-03). Pasó a ser una grilla de once cards chicas.
 *
 * 🔴 Y la grilla resultó peor, visto dentro del modal el 21-09: «qué cosa tan
 * fea, organiza mejor la información ¿para qué en cards? acá se puede mostrar
 * mejor toda esa información». Tenía razón, y los defectos eran del FORMATO,
 * no del contenido:
 *
 *   · once cards en una fila dejan columnas de ~180 px: los títulos se parten
 *     en dos renglones y las descripciones caen en columnitas de tres palabras;
 *   · `h-full` iguala la altura de la card, no la del texto, así que el paso
 *     más largo se CORTABA a media frase («…y puedes volver a correrla»);
 *   · cada card repetía la etiqueta del actor —«INQUILINO» seis veces seguidas—
 *     cuando el título del tramo ya dice de quién es.
 *
 * Ahora son DOS COLUMNAS, una por tramo, con un riel numerado adentro. El
 * ancho del modal se usa para lo que sirve —que los dos tramos se vean a la
 * vez y el cambio de manos sea espacial— y cada paso ocupa el alto que
 * necesita, así que no hay nada que cortar. Sin cards, sin etiquetas repetidas.
 *
 * Por qué no usa el `Stepper` de Cadence: el de Cadence es de solo lectura
 * (`Step` no acepta `href` ni `onClick`). Los pasos de la inmobiliaria son
 * navegables — el mapa sirve para meterse en el recorrido, no sólo para
 * entenderlo.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ArrowsLeftRight, Check } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { PASOS_RECORRIDO, type PasoKey, type PasoRecorrido } from '@/lib/recorrido/pasos'

export interface RecorridoMapaProps {
  /**
   * Paso en el que está el candidato que se está mirando. Sin esto el mapa es
   * puramente explicativo: no marca nada como hecho ni como pendiente.
   */
  pasoActual?: PasoKey
  /** Rutas de los pasos que dependen del contexto (comparar, decidir). */
  hrefs?: Partial<Record<PasoKey, string>>
  className?: string
}

type Estado = 'hecho' | 'actual' | 'pendiente' | 'neutro'

function estadoDe(paso: PasoRecorrido, actual: PasoRecorrido | undefined): Estado {
  if (!actual) return 'neutro'
  if (paso.numero < actual.numero) return 'hecho'
  if (paso.numero === actual.numero) return 'actual'
  return 'pendiente'
}

const MARCA: Record<Estado, string> = {
  hecho: 'bg-primary/15 text-primary border-primary/30',
  actual: 'bg-primary text-white border-primary',
  pendiente: 'border-border bg-bg text-fg-subtle',
  neutro: 'border-border bg-surface-muted text-fg-muted',
}

const CARD: Record<Estado, string> = {
  hecho: 'border-border bg-surface-muted/50',
  actual: 'border-primary bg-surface shadow-sm ring-1 ring-primary/20',
  pendiente: 'border-border bg-surface',
  neutro: 'border-border bg-surface',
}

export function RecorridoMapa({ pasoActual, hrefs, className }: RecorridoMapaProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const actual = pasoActual ? PASOS_RECORRIDO.find((p) => p.key === pasoActual) : undefined

  const delInquilino = PASOS_RECORRIDO.filter((p) => p.actor === 'inquilino')
  const delaInmobiliaria = PASOS_RECORRIDO.filter((p) => p.actor === 'inmobiliaria')

  const paso = (p: PasoRecorrido) => {
    const estado = estadoDe(p, actual)
    const declarado = hrefs?.[p.key] ?? p.href
    // Un «Ver →» que lleva a la pantalla en la que ya estás es ruido; se
    // oculta. Pero ese paso SÍ tiene pantalla —estás en ella—, así que no
    // debe caer en el «todavía sin pantalla» de abajo.
    const esLaPantallaActual = declarado != null && declarado === pathname
    // Un paso del inquilino no se enlaza NUNCA: sus pantallas están cerradas
    // con `allowedRoles={['tenant']}` y el guard devuelve al agente al mismo
    // lugar. Un link que parpadea y no lleva a ningún lado es peor que ninguno.
    const href = esLaPantallaActual || p.actor === 'inquilino' ? null : declarado
    const esDeLaInmobiliaria = p.actor === 'inmobiliaria'

    return (
      <li key={p.key} className="relative pl-10" data-estado={estado}>
        {/* El número, montado sobre el riel. */}
        <span
          data-paso={p.numero}
          className={cn(
            'absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs tabular-nums',
            MARCA[estado],
          )}
        >
          {estado === 'hecho' ? <Check className="h-3.5 w-3.5" weight="bold" /> : p.numero}
        </span>

        <p
          className={cn(
            'text-sm font-semibold leading-snug',
            estado === 'pendiente' ? 'text-fg-muted' : 'text-fg',
            estado === 'actual' && 'text-primary',
          )}
        >
          {t(p.labelKey)}
        </p>
        {/* Sin alto forzado: el paso ocupa lo que su texto necesita. Eso es lo
            que hacía que el más largo se cortara a media frase. */}
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t(p.descKey)}</p>

        {href ? (
          <Link
            href={href}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t('inmobiliaria.recorrido.verPaso')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          esDeLaInmobiliaria &&
          !esLaPantallaActual && (
            // Honestidad: es un paso suyo y todavía no tiene pantalla propia.
            <p className="mt-1.5 text-xs text-fg-subtle">{t('inmobiliaria.recorrido.sinPantalla')}</p>
          )
        )}
      </li>
    )
  }

  const tramo = (
    titulo: string,
    rango: string,
    pasos: PasoRecorrido[],
    tono: string,
    cambioDeManos: boolean,
  ) => (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', tono)} aria-hidden="true" />
        <h3 className="text-sm font-medium text-fg">{titulo}</h3>
        <span className="font-mono text-xs tabular-nums text-fg-subtle">{rango}</span>
        {/* El cambio de manos ya no es una banda entre dos grillas: con los
            tramos lado a lado, vive donde de verdad pasa — al entrar en el
            segundo. Es lo más importante del mapa, por eso se dibuja. */}
        {cambioDeManos && (
          <span
            data-corte
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary"
          >
            <ArrowsLeftRight className="h-3 w-3" weight="bold" aria-hidden="true" />
            {t('inmobiliaria.recorrido.cambioDeManos')}
          </span>
        )}
      </div>
      {/* El riel: una línea y los números encima. Sin marco por paso. */}
      <ol className="space-y-5 border-l border-border pl-3.5">{pasos.map(paso)}</ol>
    </section>
  )

  return (
    <div
      className={cn('grid gap-8 md:grid-cols-2 md:gap-10', className)}
      data-testid="recorrido-mapa"
    >
      {tramo(
        t('inmobiliaria.recorrido.esperandoAlInquilino'),
        `${delInquilino[0]?.numero}–${delInquilino[delInquilino.length - 1]?.numero}`,
        delInquilino,
        'bg-fg-subtle',
        false,
      )}
      {tramo(
        t('inmobiliaria.recorrido.teToca'),
        `${delaInmobiliaria[0]?.numero}–${delaInmobiliaria[delaInmobiliaria.length - 1]?.numero}`,
        delaInmobiliaria,
        'bg-primary',
        true,
      )}
    </div>
  )
}

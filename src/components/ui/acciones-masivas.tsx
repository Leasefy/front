'use client'

/**
 * BarraDeAccionesMasivas — el pie de una tabla en la que se marcan filas.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Nico, 2026-09-19, mirando «Nueva factura»:
 *
 *   «Este tipo de tablas que tienen acciones masivas deben de verse las
 *    acciones masivas muy bien y que sí estén juntas; por ejemplo veo arriba
 *    la acción masiva y ya vienen seleccionadas sin que el usuario seleccione
 *    algo, es raro eso, quizás ya eso es una sugerencia y debe verse de otra
 *    forma. […] Revisa también el resto de tablas que tienen acciones masivas
 *    para que tengan consistencia.»
 *
 * Tres defectos distintos, y los tres los arregla esta pieza:
 *
 * 1. **La acción estaba lejos de lo que actúa.** En Facturación el botón vivía
 *    arriba de todo porque hay DOS tablas (Inquilinos y Propietarios) que
 *    comparten una sola selección, así que no cabía dentro de ninguna. El
 *    resultado era que marcabas en la tabla de abajo y el botón que ejecuta
 *    estaba fuera de la pantalla. Acá la barra queda **pegada al borde de
 *    abajo** mientras se recorren las filas: se marca y se ejecuta sin
 *    perderse de vista, y puede cubrir varias tablas a la vez.
 *
 * 2. **Una preselección no se leía como sugerencia.** Marcar filas por la
 *    persona es legítimo —«el pedido es facturar el mes, no ir marcando 800
 *    casillas»— pero callarlo hace creer que uno mismo las marcó. Con
 *    `sugerida` la barra lo DICE («Preseleccionamos…») y ofrece la salida en
 *    el mismo renglón. Si la persona toca una casilla, deja de ser sugerencia
 *    y el texto cambia solo: a partir de ahí la selección es suya.
 *
 * 3. **Cada tabla lo resolvía distinto.** Vencimientos tenía un renglón que
 *    aparecía y desaparecía con animación; la cola de conciliación, una franja
 *    gris arriba; Egresos, una tarjeta propia. Mismo problema, tres formas.
 *
 * ── Reglas ─────────────────────────────────────────────────────────────────
 *
 * · **La barra no se esconde cuando no hay nada marcado.** Esconder un control
 *   se lee como «falta la función»: queda a la vista, apagada y diciendo qué
 *   hay que hacer para prenderla. Lo que sí se esconde es «Quitar la
 *   selección», porque sin selección no tiene nada que quitar.
 * · **Un acento por barra** (DESIGN §1): el botón que ejecuta. Todo lo demás
 *   —quitar, cancelar— va en `ghost` o `secondary`.
 * · **El número va en palabras, no sólo en el botón**: «Marcaste 208
 *   facturas» se entiende sin tener que leer el rótulo del botón.
 * · **Ni un participio ni un «ninguna» en el texto de la barra.** El primer
 *   intento decía «1 factura marcada», y la primera tabla que no fuera de
 *   facturas escupió «1 cruce marcada». Un componente compartido no puede
 *   fijar el género del sustantivo de otro, y pedirle el género al que lo usa
 *   es empujarle una trampa: «Marcaste 1 cruce» y «Todavía no has marcado
 *   nada» no concuerdan con nada, así que no se pueden equivocar.
 */

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface BarraDeAccionesMasivasProps {
  /** Cuántas filas están marcadas ahora mismo. */
  marcadas: number
  /** Cómo se llama una fila: `['factura', 'facturas']`, en minúscula. */
  queSon: readonly [string, string]
  /**
   * Lo que suman las marcadas, ya formateado: un string, o la pieza de plata
   * que use esa pantalla (`<Monto>` en contabilidad). La barra no formatea
   * nada — no tiene por qué saber en qué moneda cuenta cada módulo.
   */
  monto?: ReactNode
  /**
   * La selección la puso el sistema y la persona todavía no la ha tocado.
   * Cambia «marcaste» por «preseleccionamos» y explica de dónde salió.
   */
  sugerida?: boolean
  /**
   * Qué preseleccionamos, para terminar la frase: «las facturas de septiembre
   * de 2026». Sólo se usa con `sugerida`.
   */
  deDonde?: string
  /** Quitar la selección de un clic. */
  onQuitar: () => void
  /** Deshabilita «Quitar la selección» mientras corre el trabajo. */
  ocupado?: boolean
  /** Las acciones. El botón que ejecuta va ÚLTIMO, que es donde se busca. */
  children: ReactNode
  /** Debajo del renglón: por qué un botón está apagado, avisos, salidas. */
  nota?: ReactNode
  /** Qué hacer para prender la barra, cuando no hay nada marcado. */
  cuandoNoHayNada?: ReactNode
  /**
   * `pie` la mete DENTRO de la tabla, como su último renglón: sin marco ni
   * esquinas propias, con una línea arriba y la sombra hacia arriba.
   *
   * 🔴 Nico, 19-09, viendo la barra suelta debajo de la tarjeta: «mira que
   * dejaste separado lo de acciones masivas con donde se seleccionan, y sabes
   * que cuando hay acciones masivas deben quedar también en la tabla». Una
   * barra con su propio borde debajo de otra caja con borde se lee como dos
   * objetos, y el que actúa sobre las casillas tiene que ser el mismo objeto
   * que las casillas.
   */
  variant?: 'suelta' | 'pie'
  testid: string
  className?: string
}

export function BarraDeAccionesMasivas({
  marcadas,
  queSon,
  monto,
  sugerida = false,
  deDonde,
  onQuitar,
  ocupado = false,
  children,
  nota,
  cuandoNoHayNada,
  variant = 'suelta',
  testid,
  className,
}: BarraDeAccionesMasivasProps) {
  const [singular, plural] = queSon
  const cuantas = marcadas.toLocaleString('es-CO')
  const nombre = marcadas === 1 ? singular : plural

  return (
    <div
      data-testid={testid}
      className={cn(
        // Pegada al borde de abajo mientras se recorren las filas. El `z-30`
        // la deja por encima de las columnas ancladas de la tabla, que van en
        // z-20, y por debajo de los modales.
        'sticky bottom-0 z-30 flex flex-col gap-3 bg-surface px-4 py-3',
        'sm:flex-row sm:items-center sm:justify-between',
        variant === 'pie'
          ? 'border-t border-border shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.25)]'
          : 'rounded-lg border border-border shadow-lg',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-body-sm text-fg" data-testid={`${testid}-resumen`}>
          {marcadas === 0 ? (
            <span className="text-fg-muted">
              {cuandoNoHayNada ?? 'Todavía no has marcado nada.'}
            </span>
          ) : sugerida ? (
            <>
              <span className="font-medium">Preseleccionamos</span> {cuantas} {nombre}
              {deDonde ? ` ${deDonde}` : ''}
              {monto ? <span className="tabular-nums"> · {monto}</span> : null}
            </>
          ) : (
            <>
              <span className="font-medium">Marcaste</span>{' '}
              <span className="tabular-nums">{cuantas}</span> {nombre}
              {monto ? <span className="tabular-nums"> · {monto}</span> : null}
            </>
          )}
        </p>
        {/* La sugerencia dice que es sugerencia. Sin este renglón, una
            selección que nadie hizo se lee como una que uno hizo y olvidó. */}
        {marcadas > 0 && sugerida && (
          <p className="text-caption text-fg-muted" data-testid={`${testid}-es-sugerencia`}>
            Es una sugerencia: desmarca lo que no va, o quita la selección.
          </p>
        )}
        {nota}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {marcadas > 0 && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            disabled={ocupado}
            onClick={onQuitar}
            data-testid={`${testid}-quitar`}
          >
            Quitar la selección
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}

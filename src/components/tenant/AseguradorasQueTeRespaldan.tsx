'use client'

/**
 * Quién respalda tu arriendo.
 *
 * Antes era una lista de píldoras grises con un ✓ o una ✗ — la misma forma que
 * tiene un checklist de tareas. Pero esto no es una lista de pendientes: es **la
 * prueba detrás del número**. Son las compañías que dijeron que sí, y es lo
 * único de esta pantalla que un inquilino podría querer mostrarle a alguien.
 *
 * Tres decisiones:
 *
 *  1. **Las que te respaldan van primero.** Nadie entra acá a ver quién lo dejó
 *     pasar.
 *  2. **Cada una es una tarjeta con su monograma**, no una fila. Un cuadro con
 *     dos letras bien tipografiadas se lee como marca; una fila con un ícono se
 *     lee como tarea cumplida.
 *  3. **El color dice una sola cosa.** `docs/DESIGN.md` §1 manda un solo acento:
 *     cobalto para las que respaldan, neutro para las que no. Sin nueve azules
 *     de nueve marcas distintas compitiendo (ver `lib/aseguradoras/marca.ts`).
 *
 * El titular es el dato, no la actividad: «2 de 3 te respaldan» y no
 * «consultamos varias aseguradoras». Lo segundo cuenta lo que hicimos nosotros.
 */

import { CheckCircle, ShieldCheck } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { marcaDe, respaldanPrimero } from '@/lib/aseguradoras/marca'

export interface AseguradoraConsultada {
  nombre: string
  aprobada: boolean
}

export interface AseguradorasQueTeRespaldanProps {
  aseguradoras: readonly AseguradoraConsultada[]
  className?: string
}

export function AseguradorasQueTeRespaldan({
  aseguradoras,
  className,
}: AseguradorasQueTeRespaldanProps) {
  if (aseguradoras.length === 0) return null

  const ordenadas = respaldanPrimero(aseguradoras)
  const respaldan = aseguradoras.filter((a) => a.aprobada).length
  const total = aseguradoras.length

  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-6 sm:p-8', className)}
      data-testid="aseguradoras"
    >
      <header className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">
          Tu respaldo
        </p>
        {/* El dato, no la actividad. Los números en mono tabular (DESIGN.md §3). */}
        <h2 className="text-h3 font-semibold tracking-tight text-fg">
          {respaldan === 0 ? (
            <>Ninguna te respalda todavía</>
          ) : total === 1 ? (
            <>Una aseguradora te respalda</>
          ) : (
            <>
              <span className="font-mono tabular-nums">{respaldan}</span> de{' '}
              <span className="font-mono tabular-nums">{total}</span> aseguradoras te respaldan
            </>
          )}
        </h2>
        <p className="text-body-sm leading-relaxed text-fg-muted">
          {/* Con una sola consultada, «a todas» sería falso. */}
          {total === 1
            ? 'Con que una diga que sí, ya te puedes postular.'
            : 'Le preguntamos a todas con las que trabajamos, no solo a una. Con que una diga que sí, ya te puedes postular.'}
        </p>
      </header>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ordenadas.map((a) => (
          <TarjetaAseguradora key={a.nombre} aseguradora={a} />
        ))}
      </ul>

      {/* Quién responde de verdad. Va al pie y no al frente: es una precisión,
          no la noticia. */}
      <p className="mt-5 flex items-center gap-2 border-t border-faint pt-4 text-caption text-fg-subtle">
        <ShieldCheck className="h-4 w-4 shrink-0" weight="duotone" aria-hidden="true" />
        El respaldo lo emite la aseguradora, no Leasefy.
      </p>
    </section>
  )
}

function TarjetaAseguradora({ aseguradora }: { aseguradora: AseguradoraConsultada }) {
  const { nombre, iniciales, logo } = marcaDe(aseguradora.nombre)
  const respalda = aseguradora.aprobada

  return (
    <li
      className={cn(
        'group relative flex items-center gap-3.5 rounded-md border p-3.5',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        respalda
          ? // Sube al pasar por encima (DESIGN.md §2 Motion). Las que no
            // respaldan no se levantan: no hay nada que ir a ver ahí.
            'border-border bg-surface hover:-translate-y-0.5 hover:shadow-md'
          : 'border-faint bg-surface-muted',
      )}
      data-testid={respalda ? 'aseguradora-respalda' : 'aseguradora-no'}
    >
      {/*
        El mismo recuadro para todas, tengan logo o no.

        Cuatro traen su SVG oficial y las otras cinco llevan monograma; si cada
        tipo tuviera su propia forma, la grilla quedaría despareja. Acá todas
        miden 72×44 y el contenido se acomoda adentro: un logotipo horizontal
        como el de Mapfre (3.6:1) entra a lo ancho, uno casi cuadrado como el de
        La Equidad entra a lo alto.

        Fondo claro SIEMPRE, también en oscuro: los logos son tinta oscura sobre
        blanco y sobre una superficie oscura desaparecen. Por eso `bg-white` y
        no un token de tema — es un chip de marca, no una superficie del
        producto.
      */}
      <div
        className={cn(
          'flex h-11 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden',
          'rounded-md border border-faint bg-white p-1.5',
        )}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG de marca; next/image no aporta acá
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className={cn(
              'max-h-full max-w-full object-contain',
              // La que no respalda no se recolorea: se apaga. Teñir el logo de
              // una marca sería inventarle un color que no tiene.
              !respalda && 'opacity-45 grayscale',
            )}
          />
        ) : (
          <span
            className={cn(
              'font-mono text-body-sm font-semibold tracking-[0.06em]',
              respalda ? 'text-primary' : 'text-fg-subtle',
            )}
            aria-hidden="true"
          >
            {iniciales}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-body-sm font-medium',
            respalda ? 'text-fg' : 'text-fg-muted',
          )}
        >
          {nombre}
        </p>
        {/* El estado nunca viaja solo en el color: siempre hay palabra. */}
        <p className={cn('text-caption', respalda ? 'text-success' : 'text-fg-subtle')}>
          {respalda ? 'Te respalda' : 'Esta vez no'}
        </p>
      </div>

      {respalda && (
        <CheckCircle
          className="h-5 w-5 shrink-0 text-success"
          weight="fill"
          aria-hidden="true"
        />
      )}
    </li>
  )
}

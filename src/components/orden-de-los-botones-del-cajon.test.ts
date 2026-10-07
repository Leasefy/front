/**
 * En el pie de un cajón, la acción principal va a la DERECHA.
 *
 * Regla de Nico (2026-09-06), y la misma anatomía que DESIGN.md §17 ya
 * describe para diálogos: «Cancelar  Confirmar». Se rompía en dos lugares —
 * el cajón del Piloto y el detalle de un cobro— porque la fila se alineaba a
 * la derecha pero pintaba los botones en el orden en que llegaban, y el
 * primero era el principal.
 *
 * 🔴 Se corrige con `flex-row-reverse`, no reordenando el JSX: así el orden
 * del DOM no cambia y el tabulador sigue llegando primero a la acción
 * principal, que es la que la persona vino a hacer. Invertir el JSX arreglaría
 * la vista y empeoraría el teclado.
 *
 * Este archivo fija los dos lugares donde la regla aplica hoy. El resto de los
 * cajones no entra porque apilan el principal a lo ancho (no hay izquierda ni
 * derecha), tienen un solo botón, o su fila es navegación entre pasos.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function fuente(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'src/components', rel), 'utf-8')
}

describe('la acción principal del cajón va a la derecha', () => {
  it('el cajón del Piloto invierte la fila, no el JSX', () => {
    const s = fuente('inmobiliaria/piloto/PilotoCajon.tsx')
    const fila = /<div className="flex flex-wrap-reverse flex-row-reverse justify-start gap-2">/
    expect(fila.test(s)).toBe(true)
    // El micro manda la principal PRIMERA; si eso deja de ser cierto, la
    // inversión de acá pinta al revés y este test ya no alcanza.
    expect(s).toContain("? 'default'")
  })

  it('el detalle de un cobro invierte la fila, no el JSX', () => {
    const s = fuente('inmobiliaria/CobroDetail.tsx')
    expect(s).toContain('<div className="flex flex-row-reverse gap-3">')
    // La principal («hacer el recibo») sigue declarada primero.
    const fila = s.indexOf('flex flex-row-reverse gap-3')
    expect(s.indexOf('onRegisterPayment(cobro)', fila)).toBeLessThan(
      s.indexOf('handleSendReminder', fila),
    )
  })

  /*
   * Desde el 02-10 el pie es el `SheetFooter` de Cadence: lo de `start` va a la
   * izquierda y los hijos a la derecha. Ya no hay una fila `justify-end` que
   * mirar: lo que se fija es que la secundaria («Volver al caso») va en
   * `start` y la principal («Ver la carta completa») es hija del pie.
   */
  it('el sub-cajón del documento ya nace con la principal a la derecha', () => {
    const s = fuente('inmobiliaria/piloto/PilotoDocumento.tsx')
    const pie = s.indexOf('<SheetFooter')
    expect(pie).toBeGreaterThan(-1)
    const inicio = s.indexOf('start={', pie)
    // La llave que cierra `start={…}`, contando llaves.
    let finDelInicio = -1
    for (let i = inicio + 'start='.length, prof = 0; i < s.length; i++) {
      if (s[i] === '{') prof++
      else if (s[i] === '}' && --prof === 0) {
        finDelInicio = i
        break
      }
    }
    const cierre = s.indexOf('</SheetFooter>', pie)
    expect(inicio).toBeGreaterThan(pie)
    expect(finDelInicio).toBeGreaterThan(inicio)
    const volver = s.indexOf('Volver al caso', pie)
    const principal = s.indexOf('Ver la carta completa', pie)
    // La secundaria, adentro de `start` (izquierda)…
    expect(volver).toBeGreaterThan(inicio)
    expect(volver).toBeLessThan(finDelInicio)
    // …y la principal, hija del pie (derecha).
    expect(principal).toBeGreaterThan(finDelInicio)
    expect(principal).toBeLessThan(cierre)
  })

  it('el SheetFooter de Cadence pone `start` a la izquierda y los hijos a la derecha', () => {
    const sheet = fs.readFileSync(
      path.join(process.cwd(), 'node_modules/@leasefy/cadence/src/components/ui/sheet.tsx'),
      'utf-8',
    )
    const pie = sheet.slice(sheet.indexOf('export const SheetFooter'))
    expect(pie).toMatch(/\{start \? <div className="mr-auto[^"]*">\{start\}<\/div>/)
    expect(pie).toMatch(/<div className="ml-auto[^"]*justify-end[^"]*">\{children\}<\/div>/)
  })
})

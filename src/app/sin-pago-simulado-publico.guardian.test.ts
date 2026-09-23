/**
 * 🔴 NO HAY UNA PÁGINA PÚBLICA QUE SIMULE UN PAGO CON NUESTRA MARCA.
 *
 * Auditoría de seguridad del 23-09: `/pse-mock` era una página pública —sin
 * sesión— que pintaba un formulario de pago PSE con el logo de Leasefy y
 * tomaba el plan y el MONTO de la URL (`/pse-mock?planName=…&amount=…`).
 * Cualquiera podía mandar un enlace a leasefy.co que pidiera «pagar» lo que
 * quisiera: una plantilla de suplantación servida desde nuestro dominio. Y ya
 * no le servía a nadie: el único que la usaba (el checkout del plan del
 * propietario) ahora paga por el PSE real de Wompi.
 *
 * Esta prueba impide que vuelva: ni la ruta, ni un enlace/navegación a ella.
 * (Las llamadas al back `/pse-mock/banks` son otra cosa —una API, no una
 * pantalla— y no se miran acá.)
 */

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) archivos(p, out)
    else if (/\.(ts|tsx|mjs)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

describe('pago simulado público', () => {
  it('la ruta /pse-mock no existe en el app router', () => {
    expect(existsSync('src/app/pse-mock')).toBe(false)
  })

  it('ninguna pantalla navega ni enlaza a /pse-mock', () => {
    // `/pse-mock?` o `/pse-mock'`/`"`/`` ` `` como destino de navegación; la API
    // del back va como `/pse-mock/<algo>` y no calza.
    const NAVEGA = /['"`]\/pse-mock(?:[?'"`])/
    const culpables = ['src/app', 'src/components', 'src/lib']
      .flatMap((r) => archivos(r))
      .filter((p) =>
        readFileSync(p, 'utf8')
          .split('\n')
          // Los comentarios que cuentan la historia (« `/pse-mock` se borró… »)
          // no navegan a ningún lado.
          .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
          .some((l) => NAVEGA.test(l)),
      )
    expect(culpables).toEqual([])
  })
})

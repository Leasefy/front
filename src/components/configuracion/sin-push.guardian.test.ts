/**
 * Guardián de jerga: «push» no se le dice a nadie (revisora r25, R2).
 *
 * La configuración del inquilino decía «Notificaciones push · Avisos en tu
 * dispositivo». Lo que la persona ve es un aviso en su celular, así que eso se
 * dice: «Avisos en el celular». Este guardián mira el español de la app (es.json)
 * y las filas de notificaciones de las cuentas de persona, que llevan su texto
 * en el código.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(__dirname, '..', '..', '..')

function textos(nodo: unknown, ruta = ''): Array<[string, string]> {
  if (typeof nodo === 'string') return [[ruta, nodo]]
  if (nodo && typeof nodo === 'object') {
    return Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) => textos(v, ruta ? `${ruta}.${k}` : k))
  }
  return []
}

describe('sin «push» a la vista', () => {
  it('ningún texto en español de es.json dice «push»', () => {
    const es = JSON.parse(readFileSync(join(RAIZ, 'src/lib/i18n/locales/es.json'), 'utf8'))
    const conPush = textos(es).filter(([, v]) => /\bpush\b/i.test(v))
    expect(conPush).toEqual([])
  })

  it('las filas de notificaciones de las cuentas de persona no dicen «push» en español', () => {
    for (const archivo of [
      'src/app/inquilino/configuracion/contenido.tsx',
      'src/app/panel/(landlord)/configuracion/contenido.tsx',
    ]) {
      const fuente = readFileSync(join(RAIZ, archivo), 'utf8')
      // El español va en el primer brazo de `es ? '…' : '…'`.
      const espanol = [...fuente.matchAll(/es \? '([^']*)'/g)].map((m) => m[1])
      expect(espanol.filter((t) => /\bpush\b/i.test(t)), archivo).toEqual([])
    }
  })
})

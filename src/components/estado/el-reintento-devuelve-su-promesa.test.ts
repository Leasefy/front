/**
 * «Intentar de nuevo» tiene que devolver su promesa.
 *
 * ── Qué se rompe si no ─────────────────────────────────────────────────────
 *
 * `<FalloDeCarga onReintentar>` espera lo que le devuelvan: mientras la
 * promesa esté en vuelo el botón queda deshabilitado y dice «Intentando…».
 * Eso hace dos cosas, y las dos importan:
 *
 *   1. Le muestra a la persona que el clic hizo algo. Si el reintento vuelve a
 *      fallar, el cartel NO se desmonta y el único indicio de que se intentó
 *      es ese estado ocupado.
 *   2. Impide el doble clic. Hay carteles cuyo `onReintentar` inicia un cobro:
 *      dos clics rápidos son dos intentos de cobro.
 *
 * Escrito `onReintentar={() => void refetch()}`, el operador `void` tira la
 * promesa a la basura: el botón parpadea los 400 ms del piso visible y vuelve
 * a «Intentar de nuevo» pase lo que pase. Nico lo vio en producción, en el
 * Piloto automático, donde las dos tarjetas fallan y el cartel se queda
 * montado: clic, parpadeo, mismo error, ninguna señal. Parecía un botón roto.
 *
 * Estaba así en 35 lugares. La forma correcta —`onReintentar={refetch}`— ya
 * era la mayoritaria en el código nuevo; este test es para que la otra no
 * vuelva a entrar.
 *
 * Es estático a propósito: montar 35 pantallas para comprobar la forma de un
 * callback cuesta muchísimo más y falla por motivos que no son éste.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = join(process.cwd(), 'src')

/**
 * `void X()` con la llamada VACÍA. Con argumentos no aplica: ahí la flecha es
 * necesaria para pasarlos y lo que sobra es sólo el `void`, otro arreglo.
 */
const PROMESA_DESCARTADA = /onReintentar(=\{|:\s*)\(\)\s*=>\s*void\s+[A-Za-z_$][\w$.]*\(\)/

function archivosDeCodigo(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      archivosDeCodigo(ruta, encontrados)
    } else if (
      /\.tsx?$/.test(entrada.name) &&
      !entrada.name.includes('.test.') &&
      !entrada.name.endsWith('.d.ts')
    ) {
      encontrados.push(ruta)
    }
  }
  return encontrados
}

const rel = (p: string) => relative(RAIZ, p).replace(/\\/g, '/')
const TODOS = archivosDeCodigo(RAIZ)

describe('el botón de reintentar espera a lo que disparó', () => {
  it('encuentra el código (si no, el recorrido se rompió y el test no prueba nada)', () => {
    expect(TODOS.length).toBeGreaterThan(500)
  })

  it('nadie tira la promesa del reintento con `void`', () => {
    const infractores: string[] = []
    for (const ruta of TODOS) {
      const fuente = readFileSync(ruta, 'utf8')
      for (const [indice, linea] of fuente.split('\n').entries()) {
        const sinComentario = linea.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
        if (PROMESA_DESCARTADA.test(sinComentario)) {
          infractores.push(`${rel(ruta)}:${indice + 1}`)
        }
      }
    }
    expect(
      infractores,
      'Estos reintentos descartan su promesa con `void`, así que el botón ' +
        'nunca refleja lo que está pasando y deja pasar el doble clic. ' +
        'Pasá la función pelada: onReintentar={refetch}.',
    ).toEqual([])
  })
})

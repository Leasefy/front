/**
 * El panel no le pregunta nada al usuario con un diálogo del navegador.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * `window.confirm` compila, funciona y parece inofensivo. Pero el diálogo que
 * pinta el navegador no es nuestro: ignora el tema (sale blanco sobre el panel
 * en oscuro), no respeta la tipografía ni el foco del resto de la pantalla,
 * no se puede probar en Playwright sin un manejador aparte, y varios
 * navegadores lo suprimen del todo cuando viene de un iframe o cuando el
 * usuario marcó «no volver a mostrar» — y ahí la confirmación se salta sola y
 * la acción destructiva ocurre sin que nadie haya dicho que sí.
 *
 * El reemplazo canónico es `AlertDialog` de `components/ui/alert-dialog.tsx`,
 * que ya usa medio panel. Este test existe para que la próxima confirmación
 * rápida no vuelva a entrar por la puerta de atrás.
 *
 * Es estático a propósito: montar cada pantalla que confirma algo para
 * comprobar que no llamó a una función global cuesta muchísimo más y falla por
 * motivos que no son éste.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = join(process.cwd(), 'src')

/**
 * Zonas donde un diálogo del navegador sí se acepta, cada una con su motivo.
 * Una excepción sin nombre es la puerta por la que vuelve el desorden.
 *
 * `app/admin/` es el backoffice interno de Leasefy: no usa este sistema de
 * diseño (tiene el suyo, ver `admin.css`) y lo operan dos personas del equipo,
 * no clientes.
 */
const ZONAS_PERMITIDAS = ['app/admin/', 'components/admin/']

/** `beforeunload` y compañía no son confirmaciones nuestras. */
const LLAMADA_NATIVA = /\bwindow\.(confirm|alert|prompt)\s*\(/

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

describe('el panel confirma con el sistema de diseño, no con el navegador', () => {
  it('encuentra el código (si no, el recorrido se rompió y el test no prueba nada)', () => {
    expect(TODOS.length).toBeGreaterThan(500)
  })

  it('nadie llama window.confirm / alert / prompt fuera del backoffice', () => {
    const infractores: string[] = []
    for (const ruta of TODOS) {
      const nombre = rel(ruta)
      if (ZONAS_PERMITIDAS.some((z) => nombre.startsWith(z))) continue
      const fuente = readFileSync(ruta, 'utf8')
      for (const [indice, linea] of fuente.split('\n').entries()) {
        // Los comentarios que nombran la regla («NUNCA window.confirm») no son
        // infracciones: son justamente lo que queremos que siga escrito.
        const sinComentario = linea.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
        if (LLAMADA_NATIVA.test(sinComentario)) {
          infractores.push(`${nombre}:${indice + 1}`)
        }
      }
    }
    expect(
      infractores,
      'Estos archivos preguntan con un diálogo del navegador. Usá AlertDialog ' +
        'de components/ui/alert-dialog.tsx: el del navegador ignora el tema, ' +
        'no se puede probar y algunos navegadores lo suprimen, con lo que la ' +
        'acción destructiva pasa sin confirmación.',
    ).toEqual([])
  })
})

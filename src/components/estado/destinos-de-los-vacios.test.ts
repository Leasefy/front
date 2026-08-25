import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

/**
 * Cada botón de un estado vacío tiene que llevar a una pantalla que EXISTA y
 * que funcione sin parámetros.
 *
 * ── Por qué existe este test ─────────────────────────────────────────────
 * Puse dos botones rotos el mismo día, y los dos los "verifiqué" listando el
 * directorio de la ruta en vez de abrirla:
 *
 *   /contratos/nuevo   → existe, pero EXIGE `?applicationId=`. El botón
 *                        mostraba «Falta el parámetro applicationId».
 *   /portafolio/nueva  → no existe. La carpeta se llama `nuevo`.
 *
 * Que la carpeta exista no prueba que la pantalla sirva. Un estado vacío
 * ofrece una salida; si la salida es un error, es peor que no ofrecer nada —
 * y es exactamente el defecto que estos estados vinieron a arreglar.
 */

const RAIZ = join(__dirname, '../../..')

/** Rutas que EXIGEN un query param: enlazarlas «a secas» lleva a un error. */
const EXIGEN_PARAMETRO = new Set(['/panel/inmobiliaria/contratos/nuevo'])

function rutaAArchivo(ruta: string): string {
  return join(RAIZ, 'src/app', ruta.replace(/^\//, ''), 'page.tsx')
}

/** Los `href` que pasan por `crear={{...}}` de `SinDatos`, con su archivo. */
function destinosDeclarados(): { archivo: string; href: string }[] {
  const salida = execSync(
    `grep -rn "href: '/panel\\|href: '/inquilino" src --include="*.tsx" -l || true`,
    { cwd: RAIZ, encoding: 'utf-8' },
  )
    .split('\n')
    .filter(Boolean)

  const encontrados: { archivo: string; href: string }[] = []
  for (const archivo of salida) {
    const texto = readFileSync(join(RAIZ, archivo), 'utf-8')
    // Sólo los que están dentro de un `crear={{ ... }}`: son los botones de
    // los estados vacíos, que es lo que este test cuida.
    for (const bloque of texto.match(/crear=\{\{[\s\S]{0,200}?\}\}/g) ?? []) {
      const href = bloque.match(/href:\s*'([^']+)'/)?.[1]
      if (href && href.startsWith('/')) encontrados.push({ archivo, href })
    }
  }
  return encontrados
}

describe('los destinos de los estados vacíos', () => {
  const destinos = destinosDeclarados()

  it('hay al menos uno declarado (si no, el test no está mirando nada)', () => {
    expect(destinos.length).toBeGreaterThan(0)
  })

  it('todos apuntan a una pantalla que existe', () => {
    const rotos = destinos.filter((d) => !existsSync(rutaAArchivo(d.href)))
    expect(
      rotos.map((r) => `${r.archivo} → ${r.href}`),
      'un estado vacío enlaza una ruta que no existe',
    ).toEqual([])
  })

  it('ninguno enlaza «a secas» una pantalla que exige un parámetro', () => {
    const malos = destinos.filter((d) => EXIGEN_PARAMETRO.has(d.href))
    expect(
      malos.map((r) => `${r.archivo} → ${r.href}`),
      'esa pantalla exige un query param: usá `accion` con el selector, no un href',
    ).toEqual([])
  })

  it('las rutas que exigen parámetro siguen exigiéndolo (si no, sobra la lista)', () => {
    // Si algún día `/contratos/nuevo` deja de pedir `applicationId`, este test
    // avisa para sacarla de la lista en vez de dejar una regla que ya no aplica.
    for (const ruta of EXIGEN_PARAMETRO) {
      const archivo = rutaAArchivo(ruta)
      expect(existsSync(archivo), `${ruta} ya no existe`).toBe(true)
      expect(readFileSync(archivo, 'utf-8')).toContain('searchParams.get')
    }
  })
})

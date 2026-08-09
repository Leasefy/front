/**
 * Ningún icono se repite entre las filas del sidebar.
 *
 * Dos filas con el mismo glifo se leen como la misma cosa: el icono deja de
 * ayudar a encontrar y pasa a estorbar. Pasó con `House` (Inicio e
 * Inmuebles · catálogo) y con `CurrencyDollar` (Cobros manuales y Pagos), y no
 * se nota leyendo el archivo — las filas están a cien líneas de distancia.
 *
 * Las **cabeceras de sección quedan afuera a propósito**: `PlanSidebar` las
 * renderiza con `<SidebarSection label={...} />` y nunca dibuja su `icon`. Ese
 * prop existe solo porque `NavItem` lo exige, así que un choque contra una
 * sección es un falso positivo. (Cinco de los siete "duplicados" que aparecían
 * al contar a ciegas eran de este tipo.)
 *
 * El test lee la fuente en vez de importar el layout porque el arreglo de nav
 * vive dentro de un componente cliente, detrás de hooks (`useI18n`,
 * `usePermissionsContext`) que no se pueden montar sin todo el árbol de
 * providers. Mismo enfoque que `claves-aprobacion.test.ts`.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

const LAYOUT = join(__dirname, 'layout.tsx')

interface FilaNav {
  label: string
  icon: string
}

/**
 * Extrae los pares label→icono de las filas que SÍ dibujan icono.
 * Las cabeceras de sección se reconocen por su `href: '#sec-…'`.
 */
function filasConIcono(): FilaNav[] {
  const src = readFileSync(LAYOUT, 'utf8')
  const filas: FilaNav[] = []
  const vistos = new Set<string>()

  for (const m of src.matchAll(/label:\s*t\('([^']+)'\)/g)) {
    const label = m[1]
    // La definición de la fila continúa después del label: el `icon` y el
    // `href` que le siguen son los suyos.
    const cola = src.slice(m.index! + m[0].length, m.index! + m[0].length + 400)
    const icono = cola.match(/icon:\s*([A-Za-z]+)/)?.[1]
    if (!icono) continue

    const href = cola.match(/href:\s*'([^']+)'/)?.[1] ?? ''
    if (href.startsWith('#sec-')) continue // cabecera: no dibuja icono

    if (vistos.has(label)) continue
    vistos.add(label)
    filas.push({ label, icon: icono })
  }

  return filas
}

describe('iconos del sidebar de inmobiliaria', () => {
  const filas = filasConIcono()

  it('encuentra filas para revisar (si no, el extractor se rompió)', () => {
    expect(filas.length).toBeGreaterThan(20)
  })

  it('ningún icono se usa en dos filas distintas', () => {
    const porIcono = new Map<string, string[]>()
    for (const f of filas) {
      porIcono.set(f.icon, [...(porIcono.get(f.icon) ?? []), f.label])
    }
    const repetidos = [...porIcono.entries()]
      .filter(([, labels]) => labels.length > 1)
      .map(([icon, labels]) => `${icon} → ${labels.join(', ')}`)

    expect(repetidos).toEqual([])
  })

  it('toda fila con enlace tiene su icono', () => {
    // Un hueco donde va el glifo desalinea la columna entera.
    for (const f of filas) expect(f.icon).toBeTruthy()
  })
})

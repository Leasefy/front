/**
 * Ninguna fila del sidebar se confunde con otra: ni por su icono ni por su
 * nombre.
 *
 * Dos filas con el mismo glifo se leen como la misma cosa: el icono deja de
 * ayudar a encontrar y pasa a estorbar. Pasó con `House` (Inicio e
 * Inmuebles · catálogo) y con `CurrencyDollar` (Cobros y Pagos), y no
 * se nota leyendo el archivo — las filas están a cien líneas de distancia.
 *
 * Con los nombres pasó lo mismo y más caro: había **dos filas llamadas
 * "Documentos"**, una en Administración y otra en General, distinguidas solo
 * por una nota al pie. La regla madre de `docs/VOCABULARIO.md` —un nombre, una
 * cosa— pide renombrar una de las dos, no aclararlas.
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

import es from '@/lib/i18n/locales/es.json'

const LAYOUT = join(__dirname, 'layout.tsx')

interface FilaNav {
  label: string
  icon: string
  href: string
}

/**
 * Extrae los pares label→icono de las filas que SÍ dibujan icono.
 * Las cabeceras de sección se reconocen por su `href: '#sec-…'`.
 *
 * Se deduplica por **href**, no por etiqueta: la etiqueta puede repetirse
 * legítimamente durante un rato (era el caso de las dos filas "Documentos"), y
 * deduplicar por ella escondía la segunda fila entera — junto con su icono.
 * Así se me pasó un tercer choque (`FileText` entre Cotizador y Documentos) que
 * solo apareció al renombrar. El href sí identifica una fila.
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
    if (!href || href.startsWith('#sec-')) continue // cabecera: no dibuja icono

    if (vistos.has(href)) continue
    vistos.add(href)
    filas.push({ label, icon: icono, href })
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

describe('nombres del sidebar de inmobiliaria', () => {
  const filas = filasConIcono()

  it('ninguna clave de etiqueta se usa en dos filas', () => {
    // Dos filas con la MISMA clave renderizan el mismo texto: es el caso
    // exacto de "Documentos" en Administración y en General.
    const porClave = new Map<string, number>()
    for (const f of filas) porClave.set(f.label, (porClave.get(f.label) ?? 0) + 1)
    const repetidas = [...porClave.entries()].filter(([, n]) => n > 1).map(([k]) => k)

    expect(repetidas).toEqual([])
  })

  it('ningún nombre en español se repite, aunque venga de claves distintas', () => {
    // Dos claves separadas pueden traducir a la misma palabra y el problema es
    // el mismo: quien mira el menú ve dos filas iguales.
    const texto = (clave: string) =>
      clave
        .split('.')
        .reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], es)

    const porTexto = new Map<string, string[]>()
    for (const f of filas) {
      const t = texto(f.label)
      if (typeof t !== 'string') continue
      porTexto.set(t, [...(porTexto.get(t) ?? []), f.label])
    }
    const repetidos = [...porTexto.entries()]
      .filter(([, claves]) => claves.length > 1)
      .map(([t, claves]) => `"${t}" ← ${claves.join(', ')}`)

    expect(repetidos).toEqual([])
  })

  it('ninguna fila necesita una nota al pie para distinguirse de otra', () => {
    // `hint` está bien para matizar ("Prospección · pipeline"), pero no para
    // salvar un nombre repetido: eso se arregla renombrando.
    const src = readFileSync(LAYOUT, 'utf8')
    const conHint = [...src.matchAll(/label:\s*t\('([^']+)'\)[^\n]*hint:/g)].map((m) => m[1])
    const contados = new Map<string, number>()
    for (const f of filas) contados.set(f.label, (contados.get(f.label) ?? 0) + 1)

    const rescatadas = conHint.filter((c) => (contados.get(c) ?? 0) > 1)
    expect(rescatadas).toEqual([])
  })
})

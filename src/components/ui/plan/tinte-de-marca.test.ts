/**
 * El color de marca de la inmobiliaria no puede pintar el sidebar en oscuro.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * La agencia elige UN hex en Configuración → Marca, y lo elige mirando el panel
 * en claro. El panel ya sabe que un color no sirve para los dos temas —su
 * `--primary` es indigo-500 en claro e indigo-300 en oscuro—, pero el sidebar
 * pisaba `--primary` con el color de marca sin mirar el tema.
 *
 * Se veía así, medido: el botón «Nueva consignación» del sidebar salía #4E53A2
 * y «Nuevo propietario», dos columnas a la derecha, #8A9FFF. Dos primarios en
 * la misma pantalla. Y como el texto del primario en oscuro es tinta (#14130f),
 * pensado para un relleno claro, sobre la marca quedaba en 2,73:1 — AA pide
 * 4,5:1.
 *
 * El arreglo reparte la decisión entre dos archivos: el componente aporta el
 * color (`--marca-primary`) y el CSS decide por tema. Es justo el tipo de
 * acuerdo que se rompe sin que nada falle — volver a escribir `--primary`
 * inline compila, pasa los tests y devuelve el defecto entero.
 *
 * Estático a propósito: lo que hay que fijar es que las dos mitades sigan
 * existiendo y sigan hablando del mismo nombre. Montar el sidebar con sus
 * providers no comprueba nada de esto, porque jsdom no aplica hojas de estilo.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SIDEBAR = readFileSync(
  join(process.cwd(), 'src/components/ui/plan/PlanSidebar.tsx'),
  'utf8',
)
const GLOBALS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('tinte de marca del sidebar', () => {
  it('el componente aporta el color, no lo aplica: escribe --marca-primary', () => {
    expect(SIDEBAR).toContain("['--marca-primary']: brandPrimaryHsl")
  })

  it('NO vuelve a pisar --primary inline — ahí es donde el tema pierde', () => {
    expect(SIDEBAR).not.toContain("['--primary']")
  })

  it('marca la rama con la clase que el CSS necesita para engancharse', () => {
    expect(SIDEBAR).toContain("brandPrimaryHsl && 'tinte-de-marca'")
  })

  it('en claro manda la marca', () => {
    expect(GLOBALS).toMatch(/\.tinte-de-marca\s*{\s*--primary:\s*var\(--marca-primary\)/)
  })

  it('en oscuro manda el primario del tema, el mismo del resto del panel', () => {
    expect(GLOBALS).toMatch(/\.dark \.tinte-de-marca\s*{\s*--primary:\s*var\(--indigo-300\)/)
  })

  it('ese primario de oscuro es el que el tema define arriba', () => {
    // Si alguien cambia el `--primary` de `.dark` y no esta regla, el sidebar
    // vuelve a ser de otro color que el encabezado — sin que nada falle.
    const bloqueOscuro = GLOBALS.slice(GLOBALS.indexOf('.dark {'))
    expect(bloqueOscuro).toMatch(/--primary:\s*var\(--indigo-300\)/)
  })
})

/**
 * El sidebar NO pisa `--primary`: el primario es el del tema y nada más.
 *
 * Definición de producto (2026-08-16, Nico): «que tuviera el primary de light y
 * el primary de dark según el usuario lo cambie y ya».
 *
 * Antes existía `.tinte-de-marca`, que en claro reemplazaba `--primary` por el
 * hex que la agencia elige en Configuración → Marca y en oscuro volvía al del
 * tema. Medido en vivo antes de sacarlo: el botón «Nueva consignación» del
 * sidebar salía **#4E53A2** mientras «Nuevo propietario», dos columnas a la
 * derecha, salía con el primario del tema. Dos azules distintos para el mismo
 * rol en la misma pantalla.
 *
 * Este test es ESTÁTICO a propósito: monta el árbol de estilos entero para
 * comprobar una regla que se expresa en dos archivos de texto, y por eso lee
 * los archivos. Si alguien reintroduce el tinte, falla acá.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = process.cwd()
const SIDEBAR = readFileSync(join(RAIZ, 'src/components/ui/plan/PlanSidebar.tsx'), 'utf8')
const GLOBALS = readFileSync(join(RAIZ, 'src/app/globals.css'), 'utf8')
const LAYOUT = readFileSync(
  join(RAIZ, 'src/app/panel/inmobiliaria/layout.tsx'),
  'utf8',
)

describe('el sidebar usa el primary del TEMA, no un color de marca', () => {
  it('no hay ninguna regla que reemplace --primary dentro del sidebar', () => {
    // Se admite nombrarlo en el comentario que explica por qué se fue; lo que
    // no puede volver es la DECLARACIÓN.
    expect(GLOBALS).not.toMatch(/^\s*\.tinte-de-marca\s*\{/m)
    expect(GLOBALS).not.toMatch(/--primary:\s*var\(--marca-primary\)/)
  })

  it('el componente ya no recibe ni escribe el color de marca', () => {
    expect(SIDEBAR).not.toContain('brandPrimaryHsl')
    expect(SIDEBAR).not.toContain('--marca-primary')
    expect(SIDEBAR).not.toContain('tinte-de-marca')
  })

  it('el layout ya no calcula el triplete de marca para el sidebar', () => {
    expect(LAYOUT).not.toContain('brandPrimaryHsl')
  })

  it('el primary del tema sigue siendo distinto en claro y en oscuro', () => {
    // Lo que el usuario pidió: que cambie con el tema y nada más.
    expect(GLOBALS).toMatch(/--primary:\s*var\(--indigo-500\)/)
    expect(GLOBALS).toMatch(/--primary:\s*var\(--indigo-300\)/)
  })
})

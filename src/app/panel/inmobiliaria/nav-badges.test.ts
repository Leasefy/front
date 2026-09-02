/**
 * Regresión de T-0049: el merge `c01ca788` resolvió un conflicto de línea y se
 * quedó con el hook de un lado (`usePilotoBadge`) pero dejó vivo el `badge:`
 * del otro lado (`migracionesPendientes`) — una referencia a una variable que
 * ya no existía. En runtime era `ReferenceError: migracionesPendientes is not
 * defined` al montar `/panel/inmobiliaria/*` para TODOS los usuarios.
 *
 * `tsc --noEmit` también lo detecta (TS2304 "Cannot find name"), pero un test
 * lo deja documentado como regresión explícita y no depende de que alguien
 * corra el type-check antes de commitear.
 *
 * Igual que `nav-sidebar.test.ts`: el test lee la fuente en vez de montar el
 * layout, porque `ALL_NAV_ITEMS` vive detrás de `ProtectedRoute`,
 * `AgencySubscriptionGuard`, `PermissionsProvider`, `SidebarProvider`,
 * `PanelPrefsProvider`, `I18nProvider` y `CommandPaletteProvider` — montar
 * ese árbol completo solo para leer un array de navegación es un test caro
 * y frágil frente a uno que verifica exactamente la clase de error que
 * ocurrió: un identificador usado que nunca fue declarado.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

const LAYOUT = join(__dirname, 'layout.tsx')
const src = readFileSync(LAYOUT, 'utf8')

/** Nombres declarados por `const { a, b: alias } = useAlgo(...)` en el cuerpo
 * del componente — el patrón que usan los tres hooks de badge
 * (`usePostulacionesPendientes`, `useMigracionesPendientes`, `usePilotoBadge`). */
function nombresDeclaradosPorHooks(): Set<string> {
  const declarados = new Set<string>()
  for (const m of src.matchAll(/const\s*\{([^}]*)\}\s*=\s*use[A-Za-z]+\(/g)) {
    for (const campo of m[1].split(',')) {
      const parte = campo.trim()
      if (!parte) continue
      // `pendientes: migracionesPendientes` → el alias; `pendientes` solo → el campo.
      const alias = parte.includes(':') ? parte.split(':')[1].trim() : parte
      declarados.add(alias)
    }
  }
  return declarados
}

/** Identificadores usados como `badge: <ident>` en las filas de nav. */
function identificadoresDeBadge(): string[] {
  return [...src.matchAll(/badge:\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
}

describe('badges del sidebar de inmobiliaria — regresión T-0049', () => {
  const badges = identificadoresDeBadge()
  const declarados = nombresDeclaradosPorHooks()

  it('encuentra badges para revisar (si no, el extractor se rompió)', () => {
    expect(badges.length).toBeGreaterThanOrEqual(3)
  })

  it('todo `badge:` referencia una variable declarada por un hook en el archivo', () => {
    const huerfanos = badges.filter((b) => !declarados.has(b))
    expect(huerfanos).toEqual([])
  })

  it('migracionesPendientes y pilotoPendientes conviven — ninguno reemplaza al otro', () => {
    // El bug original: el merge se quedó con uno de los dos badges y perdió
    // la referencia al otro. Ambos deben seguir declarados Y usados.
    expect(declarados.has('migracionesPendientes')).toBe(true)
    expect(declarados.has('pilotoPendientes')).toBe(true)
    expect(badges).toContain('migracionesPendientes')
    expect(badges).toContain('pilotoPendientes')
  })

  it('todo badge usado en las filas está en las deps del useMemo de ALL_NAV_ITEMS', () => {
    // La tercera pieza perdida en el bug original: el array de deps del
    // `useMemo` no incluía `migracionesPendientes`, así que un cambio en ese
    // valor nunca hubiera refrescado el nav (stale closure).
    const depsLine = src.match(/^ {2}\], \[([^\]]*)\]\);/m)
    expect(depsLine).not.toBeNull()
    const deps = (depsLine?.[1] ?? '').split(',').map((d) => d.trim())

    const faltantes = badges.filter((b) => !deps.includes(b))
    expect(faltantes).toEqual([])
  })
})

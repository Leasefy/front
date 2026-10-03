/**
 * 🔴 ARREGLOS-4 (03-10-2026) · El layout del panel no pide lo que el rol no puede ver.
 *
 * PRUEBAS-RESTO, en el navegador: el contador y la asesora recibían un 403 en
 * CADA pantalla — `GET /inmobiliaria/config` (el back la cierra con
 * `configuracion:view`) y, la asesora, `GET /contracts/migrar/lotes`
 * (`contratos:view`). Los pedía el layout para todos: la marca de la barra (que
 * ya viene de `useAuth().agency`) y el badge de «migraciones por completar».
 *
 * Igual que `nav-badges.test.ts`: se lee la fuente en vez de montar el árbol
 * entero del layout. Lo que cuida es la forma exacta del arreglo: cada pedido
 * va atado al MISMO permiso que exige el back. Los hooks prueban aparte que
 * con `false` no piden (`use-migraciones-pendientes.test.tsx`,
 * `use-inmobiliaria-config.test.tsx`).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

const src = readFileSync(join(__dirname, 'layout.tsx'), 'utf8')

describe('🔴 el layout del panel pide sólo con el permiso del back', () => {
  it('la configuración de la inmobiliaria, sólo con configuracion:view', () => {
    expect(src).toMatch(/useInmobiliariaConfig\(\s*canAccess\('configuracion',\s*'view'\)\s*\)/)
    expect(src).not.toMatch(/useInmobiliariaConfig\(\s*\)/)
  })

  it('los lotes de migración (el badge), sólo con contratos:view', () => {
    expect(src).toMatch(/useMigracionesPendientes\(\s*canAccess\('contratos',\s*'view'\)\s*\)/)
    expect(src).not.toMatch(/useMigracionesPendientes\(\s*\)/)
  })
})

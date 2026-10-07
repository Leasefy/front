/**
 * 🔴 H-08 (QA-PAGOS-95, 05-10-2026): con el ABOGADO EXTERNO, cada pantalla del
 * panel disparaba `GET /contracts/migrar/lotes` → 403 («Un abogado externo sólo
 * entra a sus casos jurídicos…»): el layout lo pedía con `contratos:view`, que
 * el rol trae de fábrica y el back le recorta fuera de lo jurídico.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('H-08 · el layout no le pide al abogado externo los lotes de migración', () => {
  it('🔴 la condición excluye al ABOGADO_EXTERNO', () => {
    const s = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/layout.tsx'), 'utf8')
    expect(s).toMatch(/useMigracionesPendientes\(\s*canAccess\('contratos', 'view'\) && agencyRole !== 'ABOGADO_EXTERNO',?\s*\)/)
  })
})

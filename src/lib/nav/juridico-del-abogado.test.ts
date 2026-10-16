/**
 * ROLES (Nico, 14-10-2026): «Cobro jurídico» va en el menú del abogado externo
 * como «Jurídico». Es SU menú: el administrador sigue llegando al cobro
 * jurídico desde Cartera y su menú no cambia (`soloEsosRoles`).
 */
import { describe, it, expect } from 'vitest'
import { filasDelSidebar } from './sidebar-del-panel'
import { filterAgencyNav } from './agency-nav-filter'

const JURIDICO = '/panel/inmobiliaria/pagos/cartera/juridico'

function veJuridico(agencyRole: string, isAdmin: boolean): boolean {
  const ctx = { canAccess: () => true, isAdmin, agencyRole }
  return filterAgencyNav(filasDelSidebar((k) => k, ctx), ctx)
    .filter((f) => f.kind !== 'section')
    .some((f) => f.href === JURIDICO)
}

describe('«Jurídico» en el menú', () => {
  it('el abogado externo lo ve', () => {
    expect(veJuridico('ABOGADO_EXTERNO', false)).toBe(true)
  })

  it('🔴 el administrador NO lo ve en el menú, aunque se salte los demás filtros de rol', () => {
    expect(veJuridico('ADMIN', true)).toBe(false)
  })

  it.each(['CONTADOR', 'VIEWER', 'COORDINADOR', 'AUXILIAR_CARTERA', 'AGENTE'])('%s no lo ve', (rol) => {
    expect(veJuridico(rol, false)).toBe(false)
  })

  it('🔴 el abogado externo no ve «Contratos»: todas sus pantallas le dan 403 fuera de lo jurídico', () => {
    // Sus módulos de fábrica (role-defaults.ts): cobros, contratos y documentos.
    const suyos = ['cobros', 'contratos', 'documentos']
    const ctx = { canAccess: (m: string) => suyos.includes(m), isAdmin: false, agencyRole: 'ABOGADO_EXTERNO' }
    const hrefs = filterAgencyNav(filasDelSidebar((k) => k, ctx), ctx)
      .filter((f) => f.kind !== 'section')
      .map((f) => f.href)
    expect(hrefs.filter((h) => h.startsWith('/panel/inmobiliaria/contratos'))).toEqual([])
  })
})

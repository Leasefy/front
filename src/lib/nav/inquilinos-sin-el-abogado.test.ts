/**
 * QA-INQ E-05 (03-10-2026): el abogado externo ve «sólo sus casos» (O-05). El
 * back le responde 403 en toda la sección de Inquilinos, así que el menú no se
 * la ofrece (una fila que se ve y rebota es una promesa rota). A los demás
 * roles con `contratos:view` no se les quita nada.
 */
import { describe, it, expect } from 'vitest'
import { filasDelSidebar } from './sidebar-del-panel'
import { filterAgencyNav } from './agency-nav-filter'

const conContratos = (module: string) => module === 'contratos'

function veInquilinos(agencyRole: string): boolean {
  const ctx = { canAccess: (m: string) => conContratos(m), isAdmin: false, agencyRole }
  return filterAgencyNav(filasDelSidebar((k) => k, ctx), ctx)
    .filter((f) => f.kind !== 'section')
    .some((f) => f.href === '/panel/inmobiliaria/inquilinos')
}

describe('Inquilinos en el menú', () => {
  it('🔴 el abogado externo NO ve «Inquilinos» aunque tenga contratos', () => {
    expect(veInquilinos('ABOGADO_EXTERNO')).toBe(false)
  })

  it.each(['ADMIN', 'CONTADOR', 'VIEWER', 'COORDINADOR', 'AUXILIAR_CARTERA', 'AGENTE'])(
    '%s con contratos:view lo sigue viendo',
    (rol) => {
      expect(veInquilinos(rol)).toBe(true)
    },
  )
})

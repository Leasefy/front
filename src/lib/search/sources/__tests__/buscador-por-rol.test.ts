/**
 * 🔴 COBRANZA-MANUAL (04-10-2026): «el buscador respeta lo que el rol ve».
 * El orquestador entró como auxiliar de cartera: el menú y el buscador le
 * ofrecían Chat, Contratos, Facturación… Ahora la navegación del buscador pasa
 * por el MISMO gate que la fila del menú.
 */
import { describe, it, expect } from 'vitest'

import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { navigationSource, seVeEnElBuscador } from '../navigation-source'

const P = '/panel/inmobiliaria'

/** Los permisos del auxiliar tal como los publica el back (sólo `cobros` y la cobranza del micro). */
const delAuxiliar = (m: string, a: string) => (m === 'cobros' && (a === 'view' || a === 'create')) || (m === 'cobranza' && a === 'view')

function ctxDe(agencyRole: string, canAccess: (m: string, a: string) => boolean, isAdmin = false) {
  return { agencyId: 'ag', canAccess, nav: { canAccess, isAdmin, agencyRole, modulosPagos: [] } }
}

async function titulos(
  q: string,
  ctx: Omit<ReturnType<typeof ctxDe>, 'nav'> & Partial<Pick<ReturnType<typeof ctxDe>, 'nav'>>,
): Promise<string[]> {
  const r = await navigationSource.run(q, ctx, new AbortController().signal)
  return r.map((x) => x.title)
}

describe('buscador: la navegación por rol', () => {
  const aux = ctxDe(AGENCY_ROLES.AUXILIAR_CARTERA, delAuxiliar)

  it('el auxiliar de cartera encuentra la cartera, la cobranza y la deuda del mes', async () => {
    expect(await titulos('cartera', aux)).toContain('Cartera')
    expect(await titulos('cobranza', aux)).toContain('Cobranza')
    expect(seVeEnElBuscador({ href: `${P}/pagos` }, aux)).toBe(true)
  })

  it.each([
    ['facturacion', 'Facturación'],
    ['contabilidad', 'Contabilidad'],
    ['liquidaciones', 'Liquidaciones'],
    ['conciliacion', 'Conciliación'],
    ['chat', 'Chat'],
    ['contratos', 'Contratos'],
    ['propietarios', 'Propietarios'],
    ['recaudo', 'Recaudo'],
    ['agenda', 'Agenda'],
    ['postulaciones', 'Postulaciones'],
    ['mensajes', 'Mensajes'],
  ])('🔴 el auxiliar NO encuentra «%s»', async (q, titulo) => {
    expect(await titulos(q, aux)).not.toContain(titulo)
  })

  it('el contador sí encuentra Facturación y Contabilidad; la asesora no', async () => {
    const contador = ctxDe(AGENCY_ROLES.CONTADOR, () => true)
    expect(await titulos('facturacion', contador)).toContain('Facturación')
    expect(await titulos('contabilidad', contador)).toContain('Contabilidad')
    const asesora = ctxDe(AGENCY_ROLES.AGENTE, (m) => m !== 'cobros' && m !== 'dispersiones' && m !== 'reportes')
    expect(await titulos('facturacion', asesora)).not.toContain('Facturación')
  })

  it('el administrador encuentra todo; sin el contexto del menú (llamador viejo), como antes', async () => {
    const admin = ctxDe(AGENCY_ROLES.ADMIN, () => true, true)
    expect(await titulos('chat', admin)).toContain('Chat')
    expect(await titulos('facturacion', admin)).toContain('Facturación')
    const viejo = { agencyId: 'ag', canAccess: delAuxiliar }
    expect(await titulos('facturacion', viejo)).toContain('Facturación')
  })
})

/**
 * 🔴 CB-19 (QA-PAGOS-95 r2, 06-10-2026): el buscador le ofrecía «Mapeo
 * contable» al auxiliar de cartera, que al abrirlo recibía un 403. La entrada
 * lleva ahora el gate de su pantalla: módulo `reportes` y sólo administrador o
 * contador.
 */
import { describe, it, expect } from 'vitest'

import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { navigationSource } from '../navigation-source'

const delAuxiliar = (m: string, a: string) => (m === 'cobros' && (a === 'view' || a === 'create')) || (m === 'cobranza' && a === 'view')
const delContador = (m: string, a: string) => m === 'reportes' || m === 'cobros' || m === 'dispersiones' || (m === 'configuracion' && a === 'view')
const todo = () => true

function ctxDe(agencyRole: string, canAccess: (m: string, a: string) => boolean, isAdmin = false) {
  return { agencyId: 'ag', canAccess, nav: { canAccess, isAdmin, agencyRole, modulosPagos: [] } }
}

async function titulos(q: string, ctx: ReturnType<typeof ctxDe>): Promise<string[]> {
  const r = await navigationSource.run(q, ctx, new AbortController().signal)
  return r.map((x) => x.title)
}

describe('🔴 CB-19: «Mapeo contable» en el buscador', () => {
  it('el auxiliar de cartera NO lo encuentra (ni por «mapeo» ni por «contabilidad»)', async () => {
    const aux = ctxDe(AGENCY_ROLES.AUXILIAR_CARTERA, delAuxiliar)
    expect(await titulos('mapeo', aux)).not.toContain('Mapeo contable')
    expect(await titulos('contabilidad', aux)).not.toContain('Mapeo contable')
  })

  it('un rol con `reportes` pero que no es administrador ni contador tampoco', async () => {
    const coord = ctxDe(AGENCY_ROLES.COORDINADOR, (m) => m === 'reportes')
    expect(await titulos('mapeo', coord)).not.toContain('Mapeo contable')
  })

  it('el contador y el administrador sí', async () => {
    expect(await titulos('mapeo', ctxDe(AGENCY_ROLES.CONTADOR, delContador))).toContain('Mapeo contable')
    expect(await titulos('mapeo', ctxDe(AGENCY_ROLES.ADMIN, todo, true))).toContain('Mapeo contable')
  })
})

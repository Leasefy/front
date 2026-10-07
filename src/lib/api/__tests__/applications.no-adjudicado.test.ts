/**
 * QA-IA-A (04-10-2026): el back devuelve NO_ADJUDICADO cuando el inmueble quedó
 * para otra persona; el mapeo del inquilino no lo conocía y caía en el
 * respaldo «submitted»: la persona desplazada veía «Enviada».
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { applicationsApi } from '../applications.service'

afterEach(() => vi.unstubAllGlobals())

describe('la postulación NO adjudicada, vista por el inquilino', () => {
  it('se lee «no_adjudicado», nunca «submitted»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ id: 'd17a0755-2380-460a-8c63-9690a5131ec2', propertyId: 'p1', status: 'NO_ADJUDICADO', createdAt: '2026-10-04T06:21:21Z', updatedAt: '2026-10-04T06:27:48Z', property: null }),
      } as unknown as Response),
    )
    const vista = await applicationsApi.getByIdForDisplay('d17a0755-2380-460a-8c63-9690a5131ec2')
    expect(vista.status).toBe('no_adjudicado')
  })
})

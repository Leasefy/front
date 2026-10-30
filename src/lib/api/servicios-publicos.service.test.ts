/**
 * 🔴 La cuenta por días de la factura de ENTRADA (revisión en pantalla con los datos de Portofino, 29-10-2026).
 *
 * `revisarEntrada` mandaba `servicios` como LISTA y el DTO del back lo valida como texto separado por comas (así
 * viaja en el formulario de `registrar`, con el soporte). El back contestaba 400 («Escoge los servicios de la
 * lista») y el formulario nunca mostraba cómo se partía la factura entre el anterior y el inquilino que llega.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

const postMock = vi.fn()
vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>()
  return { ...real, apiClient: { ...real.apiClient, post: (...a: unknown[]) => postMock(...a) } }
})

const { serviciosPublicosApi } = await import('./servicios-publicos.service')

afterEach(() => vi.clearAllMocks())

const base = {
  servicio: 'ENERGIA' as const,
  periodoDesde: '2026-09-15',
  periodoHasta: '2026-10-14',
  valorCop: 185400,
  pagadaPor: 'PROPIETARIO' as const,
  entrega: '2026-10-03',
}

describe('serviciosPublicosApi.revisarEntrada', () => {
  it('varios servicios viajan como texto separado por comas, como en el formulario de registrar', async () => {
    postMock.mockResolvedValue({})
    await serviciosPublicosApi.revisarEntrada('c-1', { ...base, servicios: ['ENERGIA', 'AGUA'] })
    const [ruta, cuerpo] = postMock.mock.calls[0]!
    expect(ruta).toBe('/contracts/c-1/servicios-publicos/entrada/revisar')
    expect(cuerpo).toMatchObject({ servicio: 'ENERGIA', servicios: 'ENERGIA,AGUA', tipo: 'ENTRADA' })
  })

  it('con un solo servicio no manda `servicios` (basta `servicio`)', async () => {
    postMock.mockResolvedValue({})
    await serviciosPublicosApi.revisarEntrada('c-1', { ...base, servicios: ['ENERGIA'] })
    const cuerpo = postMock.mock.calls[0]![1] as Record<string, unknown>
    expect(cuerpo).not.toHaveProperty('servicios')
    expect(cuerpo.servicio).toBe('ENERGIA')
  })
})

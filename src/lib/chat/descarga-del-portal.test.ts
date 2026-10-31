import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getBlob, descargarBlob } = vi.hoisted(() => ({ getBlob: vi.fn(), descargarBlob: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { getBlob } }))
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob }))

import { bajarElDocumentoDelPortal, esUnaDescargaDelPortal } from './descarga-del-portal'

const ID = 'b67fe905-61df-4f7a-89fc-464419fc29c4'

beforeEach(() => {
  getBlob.mockReset()
  descargarBlob.mockReset()
})

describe('vuelta 4 · los PDF que deja el chat del portal', () => {
  it('sólo las rutas del portal de la lista (recibo, factura, certificación)', () => {
    expect(esUnaDescargaDelPortal(`/portal/recibos/${ID}/pdf`)).toBe(true)
    expect(esUnaDescargaDelPortal(`/portal/propietario/facturas/${ID}/pdf`)).toBe(true)
    expect(esUnaDescargaDelPortal(`/portal/propietario/certificaciones-del-mandatario/${ID}/pdf`)).toBe(true)
    for (const mala of [
      'https://otro.com/portal/recibos/x/pdf',
      `//otro.com/portal/recibos/${ID}/pdf`,
      `/portal/recibos/${ID}/../pdf`,
      '/portal/recibos/no-es-uuid/pdf',
      `/inmobiliaria/recibos-de-caja/${ID}/pdf`,
      `/portal/recibos/${ID}/pdf?x=1`,
      '',
    ]) {
      expect(esUnaDescargaDelPortal(mala)).toBe(false)
    }
  })

  it('baja el PDF con la sesión y su nombre limpio; una ruta ajena no llama a nada', async () => {
    getBlob.mockResolvedValue(new Blob(['%PDF']))
    await bajarElDocumentoDelPortal({ ruta: `/portal/recibos/${ID}/pdf`, nombre: '../recibo:2.pdf' })
    expect(getBlob).toHaveBeenCalledWith(`/portal/recibos/${ID}/pdf`)
    expect(descargarBlob).toHaveBeenCalledWith(expect.any(Blob), '..recibo2.pdf')
    await expect(bajarElDocumentoDelPortal({ ruta: 'https://otro.com/x.pdf', nombre: 'x.pdf' })).rejects.toThrow('no es de tu portal')
    expect(getBlob).toHaveBeenCalledTimes(1)
  })
})

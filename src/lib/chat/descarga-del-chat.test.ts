import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getBlob, get, descargarBlob } = vi.hoisted(() => ({ getBlob: vi.fn(), get: vi.fn(), descargarBlob: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { getBlob, get } }))
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob }))

import { bajarLaDescargaDelChat, formaDeLaRutaDeDescarga, leerDescargaDelChat } from './descarga-del-chat'
import { leerTarjetaDeEjecucion } from './tarjetas-de-ejecucion'

const PROCESO = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const EXOGENA = '/inmobiliaria/contabilidad/exogena/1001/archivo?anio=2025'

beforeEach(() => {
  getBlob.mockReset()
  get.mockReset()
  descargarBlob.mockReset()
})

describe('D1 · descargar dentro del chat', () => {
  it('sólo acepta rutas GET relativas de descarga conocidas (la misma lista del micro)', () => {
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/procesos/${PROCESO}/descarga`)).toBe('enlace')
    expect(formaDeLaRutaDeDescarga(EXOGENA)).toBe('archivo')
    for (const mala of ['https://otro.com/x', '//otro.com/x', `/inmobiliaria/procesos/${PROCESO}/../x`, '/panel/inmobiliaria', 'javascript:alert(1)']) {
      expect(formaDeLaRutaDeDescarga(mala)).toBeNull()
    }
  })

  it('vuelta 4: el PDF del contrato, el mandato firmado, el acta de consignación y el extracto del mes', () => {
    expect(formaDeLaRutaDeDescarga(`/contracts/${PROCESO}/pdf`)).toBe('enlace')
    expect(formaDeLaRutaDeDescarga(`/contracts/${PROCESO}/pagare/documentos/pagare`)).toBe('enlace')
    expect(formaDeLaRutaDeDescarga(`/contracts/${PROCESO}/pagare/documentos/otro`)).toBeNull()
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/captacion/firmas/${PROCESO}/pdf`)).toBe('enlace')
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/consignaciones/${PROCESO}/acta.pdf`)).toBe('archivo')
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/propietarios/${PROCESO}/extracto.pdf?month=2026-09`)).toBe('archivo')
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/finanzas/retenciones/certificado/pdf?anio=2025&propietarioId=${PROCESO}`)).toBe('archivo')
    expect(formaDeLaRutaDeDescarga(`/inmobiliaria/finanzas/retenciones/certificado/pdf?anio=2025`)).toBeNull()
    for (const mala of [
      `/contracts/${PROCESO}/pdf/sellar`,
      '/contracts/24/pdf',
      `/inmobiliaria/consignaciones/${PROCESO}/actaXpdf`,
      `/inmobiliaria/propietarios/${PROCESO}/extracto.pdf`,
      `/inmobiliaria/propietarios/${PROCESO}/extracto.pdf?month=2026-09&x=1`,
    ]) {
      expect(formaDeLaRutaDeDescarga(mala)).toBeNull()
    }
  })

  it('la forma la decide la ruta, no el cuerpo', () => {
    expect(leerDescargaDelChat({ ruta: EXOGENA, nombre: 'e.csv', forma: 'archivo' })).toEqual({ ruta: EXOGENA, nombre: 'e.csv', forma: 'archivo' })
    expect(leerDescargaDelChat({ ruta: EXOGENA, nombre: 'e.csv', forma: 'enlace' })).toBeNull()
    expect(leerDescargaDelChat({ ruta: 'https://otro.com/a.csv', nombre: 'a.csv', forma: 'archivo' })).toBeNull()
    expect(leerDescargaDelChat({ ruta: EXOGENA, nombre: '  ', forma: 'archivo' })).toBeNull()
    expect(leerDescargaDelChat(null)).toBeNull()
  })

  it('la tarjeta del resultado hecho trae la descarga; las otras no', () => {
    const base = { ejecucionId: 'e1', accion: 'aprobar_formato_de_exogena', titulo: 'Aprobar', tipo: 'resultado', resumen: 'Listo', gracia: null, deshacer: null }
    const t = leerTarjetaDeEjecucion({ ...base, estado: 'hecha', descarga: { ruta: EXOGENA, nombre: 'e.csv', forma: 'archivo' } })
    expect(t?.tipo === 'resultado' && t.descarga?.nombre).toBe('e.csv')
    const c = leerTarjetaDeEjecucion({ ...base, estado: 'cancelada', descarga: { ruta: EXOGENA, nombre: 'e.csv', forma: 'archivo' } })
    expect(c?.tipo === 'resultado' && c.descarga).toBeFalsy()
  })

  it('archivo: GET del blob con la sesión y se guarda con su nombre', async () => {
    const blob = new Blob(['a;b'])
    getBlob.mockResolvedValue(blob)
    await bajarLaDescargaDelChat({ ruta: EXOGENA, nombre: 'e.csv', forma: 'archivo' })
    expect(getBlob).toHaveBeenCalledWith(EXOGENA)
    expect(descargarBlob).toHaveBeenCalledWith(blob, 'e.csv')
  })

  it('enlace: GET del enlace firmado y el navegador lo baja; un enlace que no es https no se sigue', async () => {
    const navegar = vi.fn()
    get.mockResolvedValue({ url: 'https://almacen.leasefy.co/firmado?x=1', nombre: 'libro.xlsx' })
    await bajarLaDescargaDelChat({ ruta: `/inmobiliaria/procesos/${PROCESO}/descarga`, nombre: 'libro.xlsx', forma: 'enlace' }, navegar)
    expect(navegar).toHaveBeenCalledWith('https://almacen.leasefy.co/firmado?x=1')
    get.mockResolvedValue({ url: 'javascript:alert(1)' })
    await expect(bajarLaDescargaDelChat({ ruta: `/inmobiliaria/procesos/${PROCESO}/descarga`, nombre: 'x', forma: 'enlace' }, navegar)).rejects.toThrow()
    expect(navegar).toHaveBeenCalledTimes(1)
  })

  it('una ruta que no pasa no llama al back', async () => {
    await expect(bajarLaDescargaDelChat({ ruta: 'https://otro.com/a', nombre: 'a', forma: 'archivo' })).rejects.toThrow()
    expect(getBlob).not.toHaveBeenCalled()
  })
})

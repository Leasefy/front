import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

import { aplicarErroresDelServidor, repartirErroresDelServidor } from './errores-en-el-formulario'

function cuatrocientos(campos: Array<{ campo: string; regla: string; mensaje: string }>) {
  return new ApiError(
    400,
    campos.map((c) => c.mensaje),
    'DATOS_INVALIDOS',
    { statusCode: 400, code: 'DATOS_INVALIDOS', campos },
  )
}

beforeEach(() => {
  toastError.mockReset()
})

describe('repartirErroresDelServidor', () => {
  it('cada campo del servidor va a SU campo, con el mapa de nombres', () => {
    const r = repartirErroresDelServidor(
      cuatrocientos([
        { campo: 'firstName', regla: 'requerido', mensaje: 'Falta el nombre.' },
        { campo: 'budgetMax', regla: 'maximo', mensaje: 'Muy alto.' },
      ]),
      { mapa: { firstName: 'displayName' } },
    )
    expect(r.porCampo).toEqual({ displayName: 'Falta el nombre.', budgetMax: 'Muy alto.' })
    expect(r.orden).toEqual(['displayName', 'budgetMax'])
    expect(r.sueltos).toEqual([])
  })

  it('una ruta anidada se busca entera y por la hoja (agency.nit → nit)', () => {
    const r = repartirErroresDelServidor(cuatrocientos([{ campo: 'agency.nit', regla: 'formato', mensaje: 'NIT raro.' }]), {
      campos: ['nit'],
    })
    expect(r.porCampo).toEqual({ nit: 'NIT raro.' })
  })

  it('un campo que el formulario no muestra queda suelto (para el toast)', () => {
    const r = repartirErroresDelServidor(
      cuatrocientos([
        { campo: 'budgetMax', regla: 'maximo', mensaje: 'Muy alto.' },
        { campo: 'colorFavorito', regla: 'no_permitido', mensaje: 'El formulario mandó un dato que no esperábamos.' },
      ]),
      { campos: ['budgetMax'] },
    )
    expect(r.porCampo).toEqual({ budgetMax: 'Muy alto.' })
    expect(r.sueltos).toEqual(['El formulario mandó un dato que no esperábamos.'])
  })

  it('`null` en el mapa = no se muestra: va suelto', () => {
    const r = repartirErroresDelServidor(cuatrocientos([{ campo: 'preferredContact', regla: 'opcion', mensaje: 'Elige un medio.' }]), {
      mapa: { preferredContact: null },
    })
    expect(r.sueltos).toEqual(['Elige un medio.'])
  })

  it('sólo el primer mensaje de cada campo', () => {
    const r = repartirErroresDelServidor(
      cuatrocientos([
        { campo: 'moveInDate', regla: 'fecha', mensaje: 'Primero.' },
        { campo: 'moveInDate', regla: 'fecha', mensaje: 'Segundo.' },
      ]),
    )
    expect(r.porCampo).toEqual({ moveInDate: 'Primero.' })
  })

  it('sin campos (un 5xx, la red): el mensaje general, con la regla de oro', () => {
    const nuestro = repartirErroresDelServidor(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    expect(nuestro.orden).toEqual([])
    expect(nuestro.sueltos[0]).toMatch(/de nuestro lado/)
    expect(nuestro.sueltos[0]).toContain('ab12cd34')

    const red = repartirErroresDelServidor(new TypeError('Failed to fetch'))
    expect(red.sueltos[0]).toMatch(/conexión/)
  })
})

describe('aplicarErroresDelServidor (react-hook-form)', () => {
  function formulario() {
    return { setError: vi.fn(), setFocus: vi.fn() }
  }

  it('setError en cada campo, foco en el primero y SIN toast si todo tuvo campo', () => {
    const form = formulario()
    aplicarErroresDelServidor(
      cuatrocientos([
        { campo: 'candidateEmail', regla: 'correo', mensaje: 'Revisa el correo.' },
        { campo: 'candidateName', regla: 'requerido', mensaje: 'Falta el nombre.' },
      ]),
      form,
    )
    expect(form.setError).toHaveBeenCalledWith('candidateEmail', { type: 'server', message: 'Revisa el correo.' })
    expect(form.setError).toHaveBeenCalledWith('candidateName', { type: 'server', message: 'Falta el nombre.' })
    expect(form.setFocus).toHaveBeenCalledWith('candidateEmail')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('el toast lleva SÓLO lo que quedó sin campo', () => {
    const form = formulario()
    aplicarErroresDelServidor(
      cuatrocientos([
        { campo: 'candidateEmail', regla: 'correo', mensaje: 'Revisa el correo.' },
        { campo: 'otro', regla: 'no_permitido', mensaje: 'Dato inesperado.' },
      ]),
      form,
      { campos: ['candidateEmail'] },
    )
    expect(toastError).toHaveBeenCalledWith('Dato inesperado.')
  })

  it('un 5xx: ningún setError y un toast que dice que fue nuestro', () => {
    const form = formulario()
    aplicarErroresDelServidor(new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {}), form)
    expect(form.setError).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/de nuestro lado/))
  })

  it('`toast: false` deja lo suelto a la pantalla', () => {
    const form = formulario()
    const r = aplicarErroresDelServidor(new ApiError(409, 'Ya existe.', 'YA_EXISTE'), form, { toast: false })
    expect(toastError).not.toHaveBeenCalled()
    expect(r.sueltos).toEqual(['Ya existe.'])
  })

  it('un campo que no se puede enfocar no rompe nada', () => {
    const form = { setError: vi.fn(), setFocus: vi.fn(() => { throw new Error('sin ref') }) }
    expect(() =>
      aplicarErroresDelServidor(cuatrocientos([{ campo: 'x', regla: 'requerido', mensaje: 'Falta.' }]), form),
    ).not.toThrow()
  })
})

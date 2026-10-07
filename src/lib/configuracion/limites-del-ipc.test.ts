/**
 * 02-10-2026 · El espejo del IPC de la inmobiliaria: las MISMAS cifras y
 * frases que `back/src/inmobiliaria/agency/dto/limites-del-ipc.ts`, y el
 * reparto de un 400 del back entre el campo y el toast.
 */
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { IPC_MAXIMO, IPC_MINIMO, MENSAJES_DEL_IPC as M, loQueElBackDijoDelIpc } from './limites-del-ipc'

function cuatrocientos(campos: Array<{ campo: string; mensaje: string }>) {
  return new ApiError(
    400,
    campos.map((c) => c.mensaje),
    'DATOS_INVALIDOS',
    {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: campos.map((c) => c.mensaje),
      campos: campos.map((c) => ({ ...c, regla: 'maximo' })),
    },
  )
}

describe('los topes y las frases del IPC', () => {
  it('🔴 el tope es 100 % (Nico, 02-10-2026), el mismo con el que la renovación lee el IPC', () => {
    expect(IPC_MINIMO).toBe(0)
    expect(IPC_MAXIMO).toBe(100)
  })

  it('cada frase dice el tope de su campo', () => {
    expect(M.ipcVigente).toBe('El IPC vigente debe ser un número entre 0 y 100 %, con hasta dos decimales.')
    expect(M.ipcPorAnio).toBe(
      'El IPC de cada año debe ser mayor que 0 y hasta 100 %, con hasta dos decimales, en un año entre 2000 y 2100.',
    )
    expect(M.ipcVigente).toContain(`entre ${IPC_MINIMO} y ${IPC_MAXIMO} %`)
    expect(M.ipcPorAnio).toContain(`hasta ${IPC_MAXIMO} %`)
  })
})

describe('loQueElBackDijoDelIpc', () => {
  it('🔴 un 400 con el campo del IPC: su frase va al campo, nada al toast', () => {
    expect(loQueElBackDijoDelIpc(cuatrocientos([{ campo: 'ipcVigente', mensaje: M.ipcVigente }]), 'ipcVigente')).toEqual(
      { delCampo: M.ipcVigente, sueltos: [] },
    )
    expect(loQueElBackDijoDelIpc(cuatrocientos([{ campo: 'ipcPorAnio', mensaje: M.ipcPorAnio }]), 'ipcPorAnio')).toEqual(
      { delCampo: M.ipcPorAnio, sueltos: [] },
    )
  })

  it('lo de otro campo que esta sección no muestra va a los sueltos (al toast)', () => {
    const r = loQueElBackDijoDelIpc(
      cuatrocientos([
        { campo: 'renovacionAutomatica', mensaje: 'La renovación automática debe ser sí o no.' },
        { campo: 'ipcVigente', mensaje: M.ipcVigente },
      ]),
      'ipcVigente',
    )
    expect(r.delCampo).toBe(M.ipcVigente)
    expect(r.sueltos).toEqual(['La renovación automática debe ser sí o no.'])
  })

  it('el 400 del IPC por año no se pinta bajo el IPC vigente', () => {
    const r = loQueElBackDijoDelIpc(cuatrocientos([{ campo: 'ipcPorAnio', mensaje: M.ipcPorAnio }]), 'ipcVigente')
    expect(r.delCampo).toBeUndefined()
    expect(r.sueltos).toEqual([M.ipcPorAnio])
  })

  it('🔴 sin campos (403, 5xx, la red) no dice nada: el padre ya avisó', () => {
    expect(loQueElBackDijoDelIpc(new Error('403'), 'ipcVigente')).toEqual({ sueltos: [] })
    expect(
      loQueElBackDijoDelIpc(
        new ApiError(403, 'No tienes permiso.', 'SIN_PERMISO', { statusCode: 403, code: 'SIN_PERMISO' }),
        'ipcPorAnio',
      ),
    ).toEqual({ sueltos: [] })
  })
})

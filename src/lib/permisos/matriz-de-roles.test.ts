import { describe, expect, it } from 'vitest'

import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria'
import {
  conAccion,
  cuerpoConLoQueCambio,
  diferenciasConElRol,
  matricesToUiMatrix,
} from './matriz-de-roles'

/**
 * 22-09 noche · «Permisos por rol» con los siete roles, y guardar SÓLO lo que
 * se tocó (antes el PUT mandaba siempre tres roles y el back devolvía a
 * fábrica lo que no venía).
 */

const copia = () => JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as typeof DEFAULT_ROLE_PERMISSIONS

describe('matriz de roles', () => {
  it('traduce los SIETE roles que manda el back', () => {
    const ui = matricesToUiMatrix({
      roles: {
        ADMIN: {},
        AGENTE: {},
        CONTADOR: {},
        VIEWER: {},
        COORDINADOR: { pipeline: ['view'] },
        AUXILIAR_CARTERA: {},
        ABOGADO_EXTERNO: {},
      },
    })
    expect(Object.keys(ui).sort()).toEqual(
      ['abogado_externo', 'admin', 'agente', 'auxiliar_cartera', 'contador', 'coordinador', 'viewer'].sort(),
    )
    expect(ui.coordinador?.permissions).toEqual([{ module: 'pipeline', actions: ['view'] }])
  })

  it('🔴 el cuerpo del PUT lleva SÓLO el rol que se tocó', () => {
    const cargado = copia()
    const editado = copia()
    editado.coordinador.permissions.push({ module: 'bitacora', actions: ['view'] })
    expect(cuerpoConLoQueCambio(cargado, editado)).toEqual({
      COORDINADOR: expect.objectContaining({ bitacora: ['view'] }),
    })
  })

  it('sin tocar nada no se manda nada (y nunca el ADMIN)', () => {
    const editado = copia()
    editado.admin.permissions = []
    expect(cuerpoConLoQueCambio(copia(), editado)).toEqual({})
  })

  it('el orden de las acciones no cuenta como cambio', () => {
    const editado = copia()
    editado.agente.permissions = editado.agente.permissions.map((p) => ({ ...p, actions: [...p.actions].reverse() }))
    expect(cuerpoConLoQueCambio(copia(), editado)).toEqual({})
  })

  it('diferencias con el rol: lo sumado y lo quitado, también un permiso puntual', () => {
    const delRol = { cobros: ['view', 'edit'], reportes: ['view'] } as never
    const propios = { cobros: ['view'], reportes: ['view', 'cambiar_fecha_egreso'], bitacora: ['view'] } as never
    expect(diferenciasConElRol(propios, delRol)).toEqual([
      { modulo: 'cobros', accion: 'edit', tipo: 'quitado' },
      { modulo: 'reportes', accion: 'cambiar_fecha_egreso', tipo: 'sumado' },
      { modulo: 'bitacora', accion: 'view', tipo: 'sumado' },
    ])
  })

  it('conAccion no muta la matriz original', () => {
    const m = { cobros: ['view'] } as never as Record<string, never[]>
    const n = conAccion(m as never, 'cobros', 'edit', true)
    expect(n.cobros).toEqual(['view', 'edit'])
    expect(m.cobros).toEqual(['view'])
  })
})

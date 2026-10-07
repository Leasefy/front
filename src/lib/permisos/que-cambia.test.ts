/** CF-09 (QA 04-10): «Confirmar cambios» dice qué cambia. */
import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLE_PERMISSIONS, updateRolePermission } from '@/lib/types/inmobiliaria'
import { queCambiaEnLosPermisos } from './que-cambia'

describe('queCambiaEnLosPermisos', () => {
  const antes = { ...DEFAULT_ROLE_PERMISSIONS }

  it('sin cambios, nada', () => {
    expect(queCambiaEnLosPermisos(antes, antes)).toEqual([])
  })

  it('quitar y poner un permiso se dice con el rol, el módulo y la acción', () => {
    const agente = antes.agente!
    const despues = {
      ...antes,
      agente: updateRolePermission(agente, 'pipeline', 'view', false),
    }
    const frases = queCambiaEnLosPermisos(antes, despues)
    expect(frases).toHaveLength(1)
    expect(frases[0]).toMatch(/ pierde Pipeline · Ver$/)
  })
})

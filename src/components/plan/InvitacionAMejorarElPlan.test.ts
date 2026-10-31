import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { INVITACIONES, invitacionDeLaRuta } from './InvitacionAMejorarElPlan'

describe('las invitaciones a mejorar el plan (Nico, 31-10-2026: «más hermosos»)', () => {
  it('cada una asoma la pantalla REAL de su parte: la captura existe en public/', () => {
    for (const inv of INVITACIONES) {
      expect(existsSync(join(process.cwd(), 'public', inv.captura.src)), `${inv.clave}: ${inv.captura.src}`).toBe(true)
      expect(inv.captura.alt.length).toBeGreaterThan(10)
    }
  })

  it('una invitación por función, según la pantalla en la que se está', () => {
    expect(invitacionDeLaRuta('/panel/inmobiliaria/pagos/cobranza')?.clave).toBe('cobranza')
    expect(invitacionDeLaRuta('/panel/inmobiliaria/contratos/123')?.clave).toBe('gestion')
    expect(invitacionDeLaRuta('/panel/inmobiliaria/configuracion')).toBeNull()
    expect(invitacionDeLaRuta(null)).toBeNull()
  })
})

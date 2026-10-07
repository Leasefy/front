/**
 * PILOTO-ACTIVO (04-10-2026): un enlace de «lo que le falta a la operación»
 * sólo se ofrece a quien puede abrir esa pantalla. En vivo, la asesora y el
 * contador apretaban «Fijar los días de plazo» y caían en «No tienes acceso a
 * esto» (Configuración → Perfil es sólo del administrador).
 */
import { describe, it, expect } from 'vitest'

import { quienLoHace, rolesDelEnlace } from './quien-abre-el-enlace'
import { seccionPorSlug } from '@/app/panel/inmobiliaria/configuracion/secciones'

describe('quién abre la pantalla de cada enlace del Piloto', () => {
  it('cada enlace de los requisitos dice sus roles; lo demás es de todos', () => {
    expect(rolesDelEnlace('/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')).toEqual(['ADMIN'])
    expect(rolesDelEnlace('/panel/inmobiliaria/configuracion/medios-de-pago')).toEqual(['ADMIN'])
    expect(rolesDelEnlace('/panel/inmobiliaria/facturacion?tab=resolucion')).toEqual(['ADMIN', 'CONTADOR'])
    // IA95-34 (Nico, 05-10-2026, «Dejarlo conciliar»): el auxiliar de cartera también entra.
    expect(rolesDelEnlace('/panel/inmobiliaria/conciliacion')).toEqual(['ADMIN', 'CONTADOR', 'AUXILIAR_CARTERA'])
    expect(rolesDelEnlace('/panel/inmobiliaria/piloto#piloto-activacion')).toBeUndefined()
  })

  it('las secciones de Configuración dicen lo mismo que su `gate` (sólo el administrador)', () => {
    for (const slug of ['perfil', 'medios-de-pago']) {
      expect(seccionPorSlug(slug)?.gate).toEqual({ tipo: 'admin' })
    }
  })

  it('quien no la puede abrir lee quién lo hace, en palabras', () => {
    expect(quienLoHace(['ADMIN'])).toBe('Lo hace un administrador de tu inmobiliaria.')
    expect(quienLoHace(['ADMIN', 'CONTADOR'])).toBe('Lo hace un administrador o el contador de tu inmobiliaria.')
  })
})

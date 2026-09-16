import { describe, it, expect } from 'vitest'

import { hrefDeSeccion, menuDeCuenta, seccionDeLaRuta } from './configuracion-de-cuenta'
import { CONFIGURACION_DEL_INQUILINO } from '@/app/inquilino/configuracion/secciones'
import { CONFIGURACION_DEL_PROPIETARIO } from '@/app/panel/(landlord)/configuracion/secciones'

describe('configuración de cuenta — URLs', () => {
  it('la primera sección vive en la raíz; el resto en su segmento', () => {
    expect(hrefDeSeccion(CONFIGURACION_DEL_INQUILINO, 'notificaciones')).toBe('/inquilino/configuracion')
    expect(hrefDeSeccion(CONFIGURACION_DEL_INQUILINO, 'seguridad')).toBe('/inquilino/configuracion/seguridad')
    expect(hrefDeSeccion(CONFIGURACION_DEL_PROPIETARIO, 'plan')).toBe('/panel/configuracion')
    expect(hrefDeSeccion(CONFIGURACION_DEL_PROPIETARIO, 'cuentas-de-recaudo')).toBe('/panel/configuracion/cuentas-de-recaudo')
  })

  it('reconoce la sección de la URL, con barra final o query, y nada fuera de la raíz', () => {
    expect(seccionDeLaRuta(CONFIGURACION_DEL_INQUILINO, '/inquilino/configuracion/')?.id).toBe('notificaciones')
    expect(seccionDeLaRuta(CONFIGURACION_DEL_INQUILINO, '/inquilino/configuracion/datos?x=1')?.id).toBe('datos')
    expect(seccionDeLaRuta(CONFIGURACION_DEL_INQUILINO, '/inquilino/configuracion/no-existe')).toBeNull()
    expect(seccionDeLaRuta(CONFIGURACION_DEL_INQUILINO, '/inquilino/perfil')).toBeNull()
    // `/panel/configuracionX` no es la configuración del propietario.
    expect(seccionDeLaRuta(CONFIGURACION_DEL_PROPIETARIO, '/panel/configuracionX')).toBeNull()
  })

  it('cada sección tiene un slug único y pertenece a un grupo declarado', () => {
    for (const cfg of [CONFIGURACION_DEL_INQUILINO, CONFIGURACION_DEL_PROPIETARIO]) {
      const slugs = cfg.secciones.map((s) => s.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
      const grupos = new Set(cfg.grupos.map((g) => g.id))
      for (const s of cfg.secciones) expect(grupos.has(s.grupo)).toBe(true)
    }
  })

  it('el menú sale en el idioma pedido y en el orden declarado', () => {
    const es = menuDeCuenta(CONFIGURACION_DEL_PROPIETARIO, 'es')
    expect(es.map((g) => g.label)).toEqual(['Tu cuenta', 'Tu operación', 'Privacidad'])
    expect(es[0]?.entradas[0]).toMatchObject({ id: 'plan', label: 'Tu plan', href: '/panel/configuracion' })
    const en = menuDeCuenta(CONFIGURACION_DEL_INQUILINO, 'en')
    expect(en[0]?.label).toBe('Your account')
  })
})

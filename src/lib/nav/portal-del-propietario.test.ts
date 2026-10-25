/**
 * La arquitectura del portal del propietario de inmobiliaria que eligió Nico
 * (21-10-2026): «Tablero + 3 secciones».
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { MI_PLATA, SOLICITUDES_DEL_PROPIETARIO, RUTA_POR_DECIDIR, seccionDelPropietario, seccionDelIndependiente } from './portal-del-propietario'
import { esRutaDelPropietarioDeInmobiliaria } from '@/lib/context/PropietarioDeInmobiliariaContext'

describe('las secciones del propietario', () => {
  it('Mi plata: Estado de cuenta, Giros, Informes y Certificados', () => {
    expect(MI_PLATA.pestanas.map((p) => p.es)).toEqual(['Estado de cuenta', 'Giros', 'Informes', 'Certificados'])
  })
  it('Solicitudes: Por decidir, Reparaciones y Mis solicitudes', () => {
    expect(SOLICITUDES_DEL_PROPIETARIO.pestanas.map((p) => p.es)).toEqual(['Por decidir', 'Reparaciones', 'Mis solicitudes'])
  })
  it.each([
    ['/panel/estado-de-cuenta', 'mi-plata'],
    ['/panel/giros', 'mi-plata'],
    ['/panel/informes', 'mi-plata'],
    ['/panel/certificados', 'mi-plata'],
    ['/panel/por-decidir', 'solicitudes'],
    ['/panel/escoger-inquilino', 'solicitudes'],
    ['/panel/revisar-canon', 'solicitudes'],
    ['/panel/aprobaciones', 'solicitudes'],
    ['/panel/solicitudes/r-1', 'solicitudes'],
  ])('%s → %s', (ruta, clave) => {
    expect(seccionDelPropietario(ruta)?.clave).toBe(clave)
  })
  it('Inicio, Mensajes y la ficha de un inmueble no llevan pestañas', () => {
    for (const r of ['/panel', '/panel/mensajes', '/panel/inmuebles/i-1', '/panel/perfil']) expect(seccionDelPropietario(r)).toBeNull()
  })
})

describe('🔴 nada se perdió al reagrupar', () => {
  it('«Por decidir» es una ruta del propietario de inmobiliaria (si no, el layout lo saca de ahí)', () => {
    expect(esRutaDelPropietarioDeInmobiliaria(RUTA_POR_DECIDIR)).toBe(true)
  })

  it('las diez pantallas que tenía el menú siguen a un clic: en el menú o en una pestaña', () => {
    const ANTES = [
      '/panel',
      '/panel/estado-de-cuenta',
      '/panel/giros',
      '/panel/aprobaciones',
      '/panel/escoger-inquilino',
      '/panel/revisar-canon',
      '/panel/solicitudes',
      '/panel/informes',
      '/panel/certificados',
      '/panel/mensajes',
    ]
    const layout = readFileSync(join(__dirname, '../../app/panel/(landlord)/layout.tsx'), 'utf8')
    for (const r of ANTES) {
      const enElMenu = layout.includes(`href: '${r}'`)
      const enUnaPestana = seccionDelPropietario(r) !== null
      expect(enElMenu || enUnaPestana, r).toBe(true)
    }
  })
})

describe('el propietario INDEPENDIENTE (Nico: «el mismo criterio», 21-10)', () => {
  it.each([
    ['/panel/propiedades', 'mis-inmuebles'],
    ['/panel/candidatos', 'mis-inmuebles'],
    ['/panel/visitas', 'mis-inmuebles'],
    ['/panel/seleccion', 'mis-inmuebles'],
    ['/panel/escoger-inquilino', 'mis-inmuebles'],
    ['/panel/revisar-canon', 'mis-inmuebles'],
    ['/panel/contratos', 'contratos-y-plata'],
    ['/panel/leases', 'contratos-y-plata'],
    ['/panel/estado-de-cuenta', 'contratos-y-plata'],
    ['/panel/portafolio', 'contratos-y-plata'],
    ['/panel/informes', 'contratos-y-plata'],
    ['/panel/certificados', 'contratos-y-plata'],
    ['/panel/solicitudes', 'solicitudes'],
    ['/panel/aprobaciones', 'solicitudes'],
    ['/panel/novedades', 'solicitudes'],
  ])('%s → %s', (ruta, clave) => {
    expect(seccionDelIndependiente(ruta)?.clave).toBe(clave)
  })

  it('el menú tiene cinco filas y las 18 pantallas de antes siguen a un clic', () => {
    const layout = readFileSync(join(__dirname, '../../app/panel/(landlord)/layout.tsx'), 'utf8')
    const i = layout.indexOf('const LANDLORD_NAV_ITEMS')
    const menu = layout.slice(i, layout.indexOf('];', i))
    expect((menu.match(/label:/g) ?? []).length).toBe(5)
    for (const r of [
      '/panel/propiedades', '/panel/candidatos', '/panel/visitas', '/panel/contratos', '/panel/leases',
      '/panel/estado-de-cuenta', '/panel/aprobaciones', '/panel/escoger-inquilino', '/panel/revisar-canon',
      '/panel/solicitudes', '/panel/mensajes', '/panel/informes', '/panel/certificados', '/panel/portafolio',
      '/panel/seleccion', '/panel/novedades',
    ]) {
      expect(menu.includes(`href: '${r}'`) || seccionDelIndependiente(r) !== null, r).toBe(true)
    }
  })
})

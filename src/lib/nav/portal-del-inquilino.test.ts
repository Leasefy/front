/**
 * La arquitectura del portal del inquilino que eligió Nico (21-10-2026):
 * «3 secciones» con pestañas, según si la persona arrienda.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
  BUSCAR_ARRIENDO,
  MI_ARRIENDO,
  RUTA_DEL_MARKETPLACE,
  filasDelMenu,
  rutasDeLaSeccion,
  seccionDeLaRuta,
} from './portal-del-inquilino'

describe('el menú según si arrienda', () => {
  it('quien arrienda: Inicio, Mi arriendo, Mi calificación y Mensajes (sin buscar)', () => {
    expect(filasDelMenu(true)).toEqual(['inicio', 'mi-arriendo', 'calificacion', 'mensajes'])
  })
  it('quien no arrienda: Inicio, Buscar arriendo y Mensajes', () => {
    expect(filasDelMenu(false)).toEqual(['inicio', 'buscar', 'mensajes'])
  })
  it('mientras no se sabe, sólo lo que es de todos: no se muestra un menú para cambiarlo', () => {
    expect(filasDelMenu(null)).toEqual(['inicio', 'mensajes'])
    // Revisora r27 (CC): sin arriendo, en una pestaña de «Mi arriendo» esa fila aparece para encenderse.
    expect(filasDelMenu(false, '/inquilino/pagos')).toEqual(['inicio', 'buscar', 'mi-arriendo', 'mensajes'])
    expect(filasDelMenu(false, '/inquilino/documentos')).toContain('mi-arriendo')
    expect(filasDelMenu(false, '/inquilino/para-ti')).toEqual(['inicio', 'buscar', 'mensajes'])
  })
  it('nunca más de cuatro filas (antes eran 14)', () => {
    for (const a of [true, false, null]) expect(filasDelMenu(a).length).toBeLessThanOrEqual(4)
  })
})

describe('cada pantalla cae en su sección', () => {
  it.each([
    ['/inquilino/arriendo', 'mi-arriendo'],
    ['/inquilino/arriendo/l-1', 'mi-arriendo'],
    ['/inquilino/pagos', 'mi-arriendo'],
    ['/inquilino/estado-de-cuenta', 'mi-arriendo'],
    ['/inquilino/acuerdos/a-1', 'mi-arriendo'],
    ['/inquilino/casos/c-1', 'mi-arriendo'],
    ['/inquilino/solicitudes', 'mi-arriendo'],
    ['/inquilino/contratos/k-1/firmar', 'mi-arriendo'],
    ['/inquilino/documentos', 'mi-arriendo'],
    ['/inquilino/para-ti', 'buscar'],
    ['/inquilino/propiedades/p-1', 'buscar'],
    ['/inquilino/guardados', 'buscar'],
    ['/inquilino/aplicaciones/x/completar', 'buscar'],
    ['/inquilino/aprobacion', 'buscar'],
  ])('%s → %s', (ruta, clave) => {
    expect(seccionDeLaRuta(ruta, false)?.clave).toBe(clave)
  })

  it('Inicio, Mensajes, Perfil y Notificaciones no tienen pestañas', () => {
    for (const r of ['/inquilino', '/inquilino/mensajes', '/inquilino/perfil', '/inquilino/notificaciones']) {
      expect(seccionDeLaRuta(r, false)).toBeNull()
    }
  })

  it('Mi calificación: pestaña de «Buscar arriendo» para quien busca; fila suelta para quien arrienda', () => {
    expect(seccionDeLaRuta('/inquilino/calificacion', false)?.clave).toBe('buscar')
    expect(seccionDeLaRuta('/inquilino/calificacion', true)).toBeNull()
  })

  it('«Mi arriendo» tiene sus siete pestañas en el orden elegido (Servicios públicos: Portofino 22-10)', () => {
    expect(MI_ARRIENDO.pestanas.map((p) => p.es)).toEqual([
      'Resumen',
      'Pagos',
      'Estado de cuenta',
      'Acuerdos',
      'Servicios públicos',
      'Solicitudes',
      'Contrato y documentos',
    ])
  })

  it('«Buscar arriendo»: Para ti, Guardados, Mis postulaciones, Mi tope y Mi calificación', () => {
    expect(BUSCAR_ARRIENDO.pestanas.map((p) => p.es)).toEqual(['Para ti', 'Guardados', 'Mis postulaciones', 'Mi tope', 'Mi calificación'])
  })

  it('el marketplace es la página pública de búsqueda', () => {
    expect(RUTA_DEL_MARKETPLACE).toBe('/propiedades')
  })
})

describe('🔴 nada se perdió al reagrupar', () => {
  // Todas las pantallas del portal con su page.tsx, menos las que viven en el
  // header o el Inicio. Si alguien suma una pantalla, tiene que decidir dónde cae.
  const FUERA_DE_LAS_SECCIONES = new Set([
    '/inquilino',
    '/inquilino/mensajes',
    '/inquilino/notificaciones',
    '/inquilino/perfil',
    '/inquilino/configuracion',
    '/inquilino/configuracion/[seccion]',
    '/inquilino/calificacion',
  ])
  const raiz = join(__dirname, '../../app/inquilino')
  const rutas: string[] = []
  const recorrer = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) recorrer(p)
      else if (n === 'page.tsx') {
        const r = relative(raiz, dir)
        rutas.push(r ? `/inquilino/${r}` : '/inquilino')
      }
    }
  }
  recorrer(raiz)

  it.each(rutas.filter((r) => !FUERA_DE_LAS_SECCIONES.has(r)))('%s tiene sección', (ruta) => {
    const concreta = ruta.replace(/\[[^\]]+\]/g, 'x')
    expect(seccionDeLaRuta(concreta, false)).not.toBeNull()
  })

  it('las filas del menú marcan todas las rutas de su sección', () => {
    expect(rutasDeLaSeccion(MI_ARRIENDO)).toContain('/inquilino/documentos')
    expect(rutasDeLaSeccion(BUSCAR_ARRIENDO)).toContain('/inquilino/guardados')
  })
})

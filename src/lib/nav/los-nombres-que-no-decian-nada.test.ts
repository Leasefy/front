import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { LOS_NOMBRES_QUE_NO_DECIAN_NADA } from './los-nombres-que-no-decian-nada'
import { ARQUITECTURA_DEL_PANEL } from './arquitectura-del-panel'

/**
 * El renombre del 21-09: «Calce» → «Qué ofrecer», «Visitas» → «Preparar
 * visitas». Lo que se vigila acá es lo que se rompe callado en un renombre:
 * la URL vieja que queda en 404, la carpeta que no se movió, y la etiqueta
 * que se quedó apuntando a la ruta anterior.
 */
describe('los nombres que no decían nada', () => {
  it('las dos URLs viejas siguen llevando a alguna parte', () => {
    expect(LOS_NOMBRES_QUE_NO_DECIAN_NADA).toEqual([
      {
        source: '/panel/inmobiliaria/pipeline/calce',
        destination: '/panel/inmobiliaria/pipeline/que-ofrecer',
        permanent: false,
      },
      {
        source: '/panel/inmobiliaria/pipeline/visitas',
        destination: '/panel/inmobiliaria/pipeline/preparar-visitas',
        permanent: false,
      },
    ])
  })

  it('🔴 ninguna es permanente: un 301 lo cachea el navegador para siempre', () => {
    for (const r of LOS_NOMBRES_QUE_NO_DECIAN_NADA) {
      expect(r.permanent, r.source).toBe(false)
    }
  })

  it('🔴 el destino EXISTE como pantalla: una redirección a un 404 es peor que el nombre viejo', () => {
    for (const r of LOS_NOMBRES_QUE_NO_DECIAN_NADA) {
      const carpeta = join(
        process.cwd(),
        'src/app',
        r.destination.replace('/panel/', 'panel/'),
      )
      expect(existsSync(join(carpeta, 'page.tsx')), r.destination).toBe(true)
    }
  })

  it('y la vieja ya NO existe: si existiera, la redirección no se dispararía nunca', () => {
    for (const r of LOS_NOMBRES_QUE_NO_DECIAN_NADA) {
      const carpeta = join(process.cwd(), 'src/app', r.source.replace('/panel/', 'panel/'))
      expect(existsSync(carpeta), r.source).toBe(false)
    }
  })

  it('el menú apunta a los nombres nuevos, no a los viejos', () => {
    const hrefs = JSON.stringify(ARQUITECTURA_DEL_PANEL)
    expect(hrefs).toContain('/pipeline/que-ofrecer')
    expect(hrefs).toContain('/pipeline/preparar-visitas')
    expect(hrefs).not.toContain('/pipeline/calce')
    expect(hrefs).not.toContain('/pipeline/visitas')
  })

  it('la tabla está enchufada en next.config.mjs, no sólo escrita', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(config).toContain('LOS_NOMBRES_QUE_NO_DECIAN_NADA_DATA')
  })
})

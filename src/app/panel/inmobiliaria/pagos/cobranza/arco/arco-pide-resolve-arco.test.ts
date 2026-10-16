/**
 * ROLES (14-10-2026): la bandeja ARCO y su detalle piden `cotizador:resolve-arco`,
 * lo mismo que el micro (`arco/requests[/:id]`). Sin la guarda, un rol sin el
 * permiso que abría la URL veía «No pudimos cargar las solicitudes» con todo en
 * cero: una pantalla que parecía caída en vez de decir que no tiene acceso.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const AQUI = join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cobranza/arco')

describe('ARCO pide resolve-arco', () => {
  it.each(['page.tsx', '[id]/page.tsx'])('%s envuelve la pantalla en la guarda de resolve-arco', (archivo) => {
    const fuente = readFileSync(join(AQUI, archivo), 'utf8')
    expect(fuente).toContain('<PageGuard module="cotizador" action="resolve-arco">')
  })
})

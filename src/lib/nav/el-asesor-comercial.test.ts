/**
 * 🔴 EL ASESOR COMERCIAL (Nico, 17-09-2026): «sólo debe ver los apartados
 * comerciales, nada de operaciones». Ve inmuebles disponibles, leads y
 * pipeline; no ve cobros, recibos, cartera, contratos en curso, propietarios
 * con plata, contabilidad ni liquidaciones.
 *
 * Este guardián arma el sidebar con la matriz POR DEFECTO del asesor (el
 * espejo de `AGENCY_ROLE_DEFAULTS` del back) y fija qué filas le quedan.
 */

import { describe, it, expect } from 'vitest'

import { DEFAULT_ROLE_PERMISSIONS, getRoleLabel } from '@/lib/types/inmobiliaria'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { ApiError } from '@/lib/api/client'
import { filasDelSidebar } from './sidebar-del-panel'
import { filterAgencyNav, pasaGateDeFila } from './agency-nav-filter'

const permisosDelAsesor = DEFAULT_ROLE_PERMISSIONS.agente.permissions

const canAccess = (module: string, action: string) =>
  permisosDelAsesor.some((p) => p.module === module && (p.actions as string[]).includes(action))

const ctx = { canAccess, isAdmin: false, agencyRole: 'AGENTE' }

function hrefsVisibles(): string[] {
  const filas = filasDelSidebar((k) => k, ctx)
  return filterAgencyNav(filas, ctx)
    .filter((f) => f.kind !== 'section')
    .map((f) => f.href)
}

describe('el asesor comercial en el panel (17-09-2026)', () => {
  it('se llama «Asesor comercial»', () => {
    expect(getRoleLabel('agente')).toBe('Asesor comercial')
  })

  it('ve lo comercial: pipeline, agenda, inmuebles, postulaciones y propietarios', () => {
    const visibles = hrefsVisibles()
    for (const href of [
      '/panel/inmobiliaria/pipeline',
      '/panel/inmobiliaria/agenda',
      '/panel/inmobiliaria/inmuebles',
      '/panel/inmobiliaria/postulaciones',
      '/panel/inmobiliaria/propietarios',
    ]) {
      expect(visibles).toContain(href)
    }
  })

  it('no ve nada de operación ni de plata', () => {
    const visibles = hrefsVisibles().join(' ')
    for (const fragmento of [
      '/contratos',
      '/pagos',
      '/facturacion',
      '/contabilidad',
      '/mantenimientos',
      '/solicitudes',
      '/reportes',
      '/inquilinos',
      '/conciliacion',
    ]) {
      expect(visibles).not.toContain(fragmento)
    }
  })

  it('la agenda se abre con operaciones O con pipeline', () => {
    expect(pasaGateDeFila({ modulos: ['operaciones', 'pipeline'] }, ctx)).toBe(true)
    expect(
      pasaGateDeFila(
        { modulos: ['operaciones', 'pipeline'] },
        { ...ctx, canAccess: () => false },
      ),
    ).toBe(false)
  })

  it('un inmueble arrendado dice por qué no se abre, no «no tienes acceso a esto»', () => {
    const fallo = clasificarFallo(
      new ApiError(403, 'Este inmueble está arrendado', 'INMUEBLE_ARRENDADO'),
      { queEs: 'el inmueble' },
    )
    expect(fallo.titulo).toBe('Este inmueble está arrendado')
    expect(fallo.sePuedeReintentar).toBe(false)
  })
})

/**
 * Encuadre por rol — qué módulos de negocio ve cada quien en la navegación.
 *
 * La propiedad que más importa NO es "tal rol ve tal cosa" (eso se ajusta en la
 * tabla), sino que este recorte **solo puede quitar**. Si alguna vez devolviera
 * una fila que el permiso negó, el menú estaría prometiendo acceso que el
 * backend va a rechazar — y peor, escondiendo que el gate de permisos falló.
 */

import { describe, it, expect } from 'vitest'
import { House } from '@phosphor-icons/react'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { canSeeBusinessModule, ROLE_MODULE_SCOPE, BUSINESS_MODULES } from './agency-module-scope'
import { filterAgencyNav, type NavItemWithModule } from './agency-nav-filter'

const permitirTodo = () => true
const negarTodo = () => false

describe('canSeeBusinessModule', () => {
  it('deja pasar lo transversal (sin scope) para cualquier rol', () => {
    for (const rol of Object.values(AGENCY_ROLES)) {
      expect(canSeeBusinessModule(undefined, { isAdmin: false, agencyRole: rol })).toBe(true)
    }
  })

  it('ADMIN ve los cuatro módulos', () => {
    for (const m of BUSINESS_MODULES) {
      expect(canSeeBusinessModule(m, { isAdmin: true, agencyRole: null })).toBe(true)
    }
  })

  it('el comercial (AGENTE) no ve finanzas', () => {
    const ctx = { isAdmin: false, agencyRole: AGENCY_ROLES.AGENTE }
    expect(canSeeBusinessModule('comercial', ctx)).toBe(true)
    expect(canSeeBusinessModule('administracion', ctx)).toBe(true)
    expect(canSeeBusinessModule('finanzas', ctx)).toBe(false)
  })

  it('el contador no ve comercial', () => {
    const ctx = { isAdmin: false, agencyRole: AGENCY_ROLES.CONTADOR }
    expect(canSeeBusinessModule('finanzas', ctx)).toBe(true)
    expect(canSeeBusinessModule('administracion', ctx)).toBe(true)
    expect(canSeeBusinessModule('comercial', ctx)).toBe(false)
  })

  it('no recorta mientras el rol todavía no cargó', () => {
    // Durante la carga manda el esqueleto del sidebar; recortar acá además
    // dejaría el menú vacío en vez de mostrarlo.
    expect(canSeeBusinessModule('finanzas', { isAdmin: false, agencyRole: null })).toBe(true)
  })

  it('no recorta ante un rol que el backend agregó y el front no conoce', () => {
    expect(canSeeBusinessModule('finanzas', { isAdmin: false, agencyRole: 'AUDITOR' })).toBe(true)
  })

  it('todo rol conocido conserva "general"', () => {
    for (const permitidos of Object.values(ROLE_MODULE_SCOPE)) {
      expect(permitidos).toContain('general')
    }
  })
})

describe('filterAgencyNav — el encuadre solo puede QUITAR', () => {
  const nav: NavItemWithModule[] = [
    { kind: 'section', label: 'FINANZAS', href: '#sec-finanzas', icon: House, scope: 'finanzas' },
    { label: 'Facturación', href: '/panel/inmobiliaria/facturacion', icon: House, module: 'facturacion', scope: 'finanzas' },
    { kind: 'section', label: 'COMERCIAL', href: '#sec-comercial', icon: House, scope: 'comercial' },
    { label: 'Inmuebles', href: '/panel/inmobiliaria/inmuebles', icon: House, module: 'portafolio', scope: 'comercial' },
  ]

  it('nunca devuelve una fila que el permiso negó, aunque el scope la permita', () => {
    const visto = filterAgencyNav(nav, {
      canAccess: negarTodo,
      isAdmin: false,
      agencyRole: AGENCY_ROLES.ADMIN,
    })
    expect(visto.filter((i) => i.kind !== 'section')).toHaveLength(0)
  })

  it('al comercial le saca el módulo de finanzas entero, encabezado incluido', () => {
    const visto = filterAgencyNav(nav, {
      canAccess: permitirTodo,
      isAdmin: false,
      agencyRole: AGENCY_ROLES.AGENTE,
    })
    const etiquetas = visto.map((i) => i.label)
    expect(etiquetas).not.toContain('Facturación')
    expect(etiquetas).not.toContain('FINANZAS')
    expect(etiquetas).toContain('Inmuebles')
  })

  it('al contador le saca comercial y le deja finanzas', () => {
    const visto = filterAgencyNav(nav, {
      canAccess: permitirTodo,
      isAdmin: false,
      agencyRole: AGENCY_ROLES.CONTADOR,
    })
    const etiquetas = visto.map((i) => i.label)
    expect(etiquetas).toContain('Facturación')
    expect(etiquetas).not.toContain('Inmuebles')
    expect(etiquetas).not.toContain('COMERCIAL')
  })

  it('ADMIN ve todo', () => {
    const visto = filterAgencyNav(nav, {
      canAccess: permitirTodo,
      isAdmin: true,
      agencyRole: AGENCY_ROLES.ADMIN,
    })
    expect(visto.map((i) => i.label)).toEqual(['FINANZAS', 'Facturación', 'COMERCIAL', 'Inmuebles'])
  })
})

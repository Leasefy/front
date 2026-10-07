/**
 * QA-INQ (03-10-2026): la CSP que va SÓLO a reporte llevaba
 * `upgrade-insecure-requests`. En `Content-Security-Policy-Report-Only` esa
 * directiva no aplica: el navegador la ignora y lo avisa como ERROR en la
 * consola de cada página. Va sólo en la política que bloquea.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'
import { politicaDeContenido } from '@/lib/seguridad/politica-de-contenido'

const pedir = () => middleware(new NextRequest('https://leasefy.co/panel/inmobiliaria/inquilinos'))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('upgrade-insecure-requests sólo en la política que bloquea', () => {
  it('🔴 en producción y en modo reporte, la Report-Only NO la trae', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const p = pedir().headers.get('Content-Security-Policy-Report-Only')
    expect(p).toBeTruthy()
    expect(p).not.toContain('upgrade-insecure-requests')
  })

  it('en producción y obligatoria, sí (la política real no cambia)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CSP_MODO', 'obligatoria')
    const p = pedir().headers.get('Content-Security-Policy')
    expect(p).toContain('upgrade-insecure-requests')
  })

  it('la función sin `soloReporte` sigue igual que antes', () => {
    expect(politicaDeContenido('n', { desarrollo: false })).toContain('upgrade-insecure-requests')
    expect(politicaDeContenido('n', { desarrollo: false, soloReporte: true })).not.toContain('upgrade-insecure-requests')
  })
})

/**
 * `/api/csp-reporte`: el destino de los reportes de la CSP. Es pública, así
 * que se le prueba lo que la hace segura: límite de intentos, tope de tamaño y
 * que ninguna credencial de una URL termine en el log.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, sinCredenciales, violacionesDelCuerpo, TOPE_DEL_CUERPO } from './route'
import { _olvidarCuentas, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta'

const REPORTE_VIEJO = {
  'csp-report': {
    'document-uri': 'https://leasefy.co/auth/enlace?returnUrl=%2Fpanel#access_token=eyJSECRETO',
    'effective-directive': 'script-src-elem',
    'blocked-uri': 'https://evil.example/x.js?robado=eyJSECRETO',
    disposition: 'enforce',
    'script-sample': '',
  },
}

function peticion(cuerpo: string, tipo = 'application/csp-report') {
  return new NextRequest('https://leasefy.co/api/csp-reporte', {
    method: 'POST',
    headers: { 'content-type': tipo },
    body: cuerpo,
  })
}

let avisos: { mock: { calls: unknown[][] }; mockRestore: () => void }
beforeEach(() => {
  _olvidarCuentas()
  avisos = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => avisos.mockRestore())

describe('/api/csp-reporte', () => {
  it('registra la violación SIN query ni fragmento (tokens en URLs no llegan al log)', async () => {
    const r = await POST(peticion(JSON.stringify(REPORTE_VIEJO)))
    expect(r.status).toBe(204)
    const linea = avisos.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
    expect(linea).toContain('script-src-elem')
    expect(linea).toContain('https://evil.example/x.js')
    expect(linea).toContain('https://leasefy.co/auth/enlace')
    expect(linea).not.toContain('SECRETO')
  })

  it('entiende el formato nuevo de report-to', () => {
    const v = violacionesDelCuerpo([
      { type: 'csp-violation', body: { documentURL: 'https://leasefy.co/x?t=1', effectiveDirective: 'img-src', blockedURL: 'https://a.example/p.png?d=1', disposition: 'report', sample: '' } },
      { type: 'deprecation', body: {} },
    ])
    expect(v).toEqual([
      { directiva: 'img-src', bloqueado: 'https://a.example/p.png', pagina: 'https://leasefy.co/x', modo: 'report', muestra: '' },
    ])
  })

  it('un cuerpo gigante se rechaza sin leerlo entero', async () => {
    const r = await POST(peticion('x'.repeat(TOPE_DEL_CUERPO + 1)))
    expect(r.status).toBe(413)
    expect(avisos).not.toHaveBeenCalled()
  })

  it('basura no rompe nada ni escribe en el log', async () => {
    expect((await POST(peticion('{no es json'))).status).toBe(204)
    expect(avisos).not.toHaveBeenCalled()
    expect(sinCredenciales("'inline'")).toBe("'inline'")
    expect(sinCredenciales('data:image/png;base64,AAAA')).toBe('data:')
  })

  it('tiene límite de intentos (es pública: sin techo nos llenan el log)', async () => {
    const max = POLITICAS_DE_LAS_RUTAS.reporteCsp.maximo
    for (let i = 0; i < max; i++) {
      expect((await POST(peticion(JSON.stringify(REPORTE_VIEJO)))).status).toBe(204)
    }
    const r = await POST(peticion(JSON.stringify(REPORTE_VIEJO)))
    expect(r.status).toBe(429)
    expect(r.headers.get('Retry-After')).toBeTruthy()
  })
})

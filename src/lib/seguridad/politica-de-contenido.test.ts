/**
 * La CSP del front (endurecimiento del navegador, 23-09). Antes era
 * `script-src 'unsafe-inline' 'unsafe-eval'` + `connect-src https:` en
 * Report-Only sin destino: un `<script>` inyectado corría y podía mandar lo que
 * leyera a cualquier servidor. Estas pruebas fijan lo que la hace útil.
 */

import { describe, expect, it } from 'vitest'
import {
  cabeceraDeLaPolitica,
  llevaPoliticaDeDocumento,
  modoDeLaPolitica,
  nuevoNonce,
  politicaDeContenido,
  type EntornoDeLaPolitica,
} from './politica-de-contenido'

const PROD: EntornoDeLaPolitica = {
  desarrollo: false,
  NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
  NEXT_PUBLIC_BACKEND_URL: 'https://api.leasefy.co/v1',
  NEXT_PUBLIC_AGENT_URL: 'https://agente.leasefy.co',
}

function directiva(politica: string, nombre: string): string[] {
  const d = politica.split(';').map((x) => x.trim()).find((x) => x.startsWith(nombre + ' '))
  return d ? d.split(/\s+/).slice(1) : []
}

describe('politicaDeContenido', () => {
  it('en producción los scripts van por nonce + strict-dynamic, sin unsafe-eval', () => {
    const p = politicaDeContenido('abc123', PROD)
    const s = directiva(p, 'script-src')
    expect(s).toContain("'nonce-abc123'")
    expect(s).toContain("'strict-dynamic'")
    expect(s).not.toContain("'unsafe-eval'")
  })

  it('en desarrollo agrega unsafe-eval y el websocket del recargado', () => {
    const p = politicaDeContenido('n', { ...PROD, desarrollo: true })
    expect(directiva(p, 'script-src')).toContain("'unsafe-eval'")
    expect(directiva(p, 'connect-src')).toContain('ws:')
    expect(p).not.toContain('upgrade-insecure-requests')
  })

  it('connect-src es una lista CERRADA: nuestros backends, Supabase (https y wss) y los terceros medidos', () => {
    const c = directiva(politicaDeContenido('n', PROD), 'connect-src')
    expect(c).not.toContain('https:')
    expect(c).not.toContain('*')
    expect(c).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://api.leasefy.co',
        'https://agente.leasefy.co',
        'https://proyecto.supabase.co',
        'wss://proyecto.supabase.co',
        'https://tiles.openfreemap.org',
      ]),
    )
  })

  it('img-src NO es `https:` entero: una imagen es el canal de fuga sin clic', () => {
    const i = directiva(politicaDeContenido('n', PROD), 'img-src')
    expect(i).not.toContain('https:')
    expect(i).not.toContain('http:')
    expect(i).toEqual(
      expect.arrayContaining(["'self'", 'data:', 'blob:', 'https://proyecto.supabase.co', 'https://tiles.openfreemap.org']),
    )
  })

  it('nadie de afuera nos enmarca, no hay plugins y la base no se cambia', () => {
    const p = politicaDeContenido('n', PROD)
    expect(directiva(p, 'frame-ancestors')).toEqual(["'self'"])
    expect(directiva(p, 'object-src')).toEqual(["'none'"])
    expect(directiva(p, 'base-uri')).toEqual(["'self'"])
    expect(directiva(p, 'form-action')).toEqual(["'self'"])
  })

  it('los reportes tienen destino', () => {
    const p = politicaDeContenido('n', PROD)
    expect(directiva(p, 'report-uri')).toEqual(['/api/csp-reporte'])
    expect(directiva(p, 'report-to')).toEqual(['csp'])
  })

  it('una variable de entorno basura no mete nada raro en la política', () => {
    const p = politicaDeContenido('n', { ...PROD, NEXT_PUBLIC_AGENT_URL: "javascript:alert(1); script-src *" })
    expect(p).not.toContain('javascript:')
    expect(p).not.toContain('script-src *')
  })
})

describe('modo y alcance', () => {
  it('por defecto REPORTE: obligatoria sólo con CSP_MODO=obligatoria', () => {
    expect(cabeceraDeLaPolitica(modoDeLaPolitica(undefined))).toBe('Content-Security-Policy-Report-Only')
    expect(cabeceraDeLaPolitica(modoDeLaPolitica('cualquiera'))).toBe('Content-Security-Policy-Report-Only')
    expect(cabeceraDeLaPolitica(modoDeLaPolitica(' Obligatoria '))).toBe('Content-Security-Policy')
  })

  it('los service workers y el worker del mapa no llevan la CSP de documento', () => {
    // Con strict-dynamic, el importScripts de Firebase (gstatic) quedaría
    // bloqueado y las notificaciones push dejarían de llegar sin ruido.
    expect(llevaPoliticaDeDocumento('/firebase-messaging-sw.js')).toBe(false)
    expect(llevaPoliticaDeDocumento('/sw-inventario.js')).toBe(false)
    expect(llevaPoliticaDeDocumento('/maplibre/6.11.1/maplibre-gl-worker.mjs')).toBe(false)
    expect(llevaPoliticaDeDocumento('/panel/inmobiliaria')).toBe(true)
  })

  it('el nonce es nuevo cada vez y tiene 128 bits', () => {
    const a = nuevoNonce()
    const b = nuevoNonce()
    expect(a).not.toBe(b)
    expect(atob(a)).toHaveLength(16)
  })
})

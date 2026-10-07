import { describe, it, expect } from 'vitest'
import { falloDeLaAccionDelPortal } from './fallo-de-la-accion'

/**
 * 02-10-2026 · Una acción del portal del propietario que no sale. Antes
 * cualquier `status: 0` decía «Próximamente» (también con la red caída) y lo
 * demás pintaba `res.error` tal cual («Error 500», «network»).
 */
const OPCIONES = { accion: 'registrar la elección', porDefecto: 'Prueba de nuevo en un momento.' }

describe('falloDeLaAccionDelPortal', () => {
  it('el portal sin cablear (sin URL del micro o sin agencia) es «no habilitado»', () => {
    expect(falloDeLaAccionDelPortal({ status: 0, error: 'unavailable' }, OPCIONES)).toEqual({ tipo: 'no-habilitado' })
  })

  it('un 401 o un 404 del micro también (el mismo criterio que los GET)', () => {
    expect(falloDeLaAccionDelPortal({ status: 401, error: 'Error 401' }, OPCIONES).tipo).toBe('no-habilitado')
    expect(falloDeLaAccionDelPortal({ status: 404, error: 'not_found' }, OPCIONES).tipo).toBe('no-habilitado')
  })

  it('🔴 la red caída habla de la conexión, NO de «Próximamente»', () => {
    const r = falloDeLaAccionDelPortal({ status: 0, error: 'network' }, OPCIONES)
    expect(r.tipo).toBe('mensaje')
    expect(r.tipo === 'mensaje' && r.texto).toMatch(/conexión/)
  })

  it('🔴 un 5xx dice que fue nuestro (no «Error 500»)', () => {
    const r = falloDeLaAccionDelPortal({ status: 500, error: 'Error 500' }, OPCIONES)
    expect(r.tipo === 'mensaje' && r.texto).toMatch(/^No pudimos registrar la elección: algo falló de nuestro lado/)
  })

  it('un 4xx con frase la dice; con un código (`invalid_state`) no lo muestra', () => {
    const conFrase = falloDeLaAccionDelPortal({ status: 400, error: 'El proceso ya está cerrado.' }, OPCIONES)
    expect(conFrase.tipo === 'mensaje' && conFrase.texto).toBe('El proceso ya está cerrado.')
    const conCodigo = falloDeLaAccionDelPortal({ status: 400, error: 'invalid_state' }, OPCIONES)
    expect(conCodigo.tipo === 'mensaje' && conCodigo.texto).toBe('Prueba de nuevo en un momento.')
  })
})

import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { descripcionDelError, motivosDelError } from './descripcion-del-error'

describe('descripcionDelError', () => {
  it('un 409 o un 400 que explica se muestra tal cual', () => {
    expect(descripcionDelError(new ApiError(409, 'Esa franja se cruza con otra visita.'))).toBe(
      'Esa franja se cruza con otra visita.',
    )
    expect(descripcionDelError(new ApiError(400, '  Elige al menos un día.  '))).toBe('Elige al menos un día.')
  })

  // 02-10-2026 · Regla de oro: un 5xx no se calla ni culpa a nadie; dice que
  // fue nuestro y da la referencia para soporte.
  it('un 5xx dice que fue de nuestro lado, con la referencia si el back la mandó', () => {
    expect(descripcionDelError(new ApiError(500, 'Internal server error'))).toMatch(/de nuestro lado/)
    expect(descripcionDelError(new ApiError(502, 'Bad Gateway'))).toMatch(/de nuestro lado/)
    const conRef = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' })
    expect(descripcionDelError(conRef)).toContain('ab12cd34')
    expect(descripcionDelError(conRef)).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0) habla de la red, sin el texto crudo del navegador', () => {
    const red = new ApiError(0, 'No pudimos conectarnos al servidor. (Failed to fetch)')
    expect(descripcionDelError(red)).toMatch(/conexión/)
    expect(descripcionDelError(red)).not.toContain('Failed to fetch')
  })

  it('un volcado de Prisma, un texto largo o de varias líneas no caben en un toast', () => {
    expect(descripcionDelError(new Error('Invalid `this.prisma.x.update()` invocation'))).toBeUndefined()
    expect(descripcionDelError(new Error('a'.repeat(161)))).toBeUndefined()
    expect(descripcionDelError(new Error('uno\ndos'))).toBeUndefined()
  })

  it('lo que no es un Error, o un Error sin mensaje, no dice nada', () => {
    expect(descripcionDelError('texto suelto')).toBeUndefined()
    expect(descripcionDelError(undefined)).toBeUndefined()
    expect(descripcionDelError(new Error(''))).toBeUndefined()
  })
})

/**
 * F5 — un 400 del `ValidationPipe` llega con varios motivos, y `ApiError` los
 * pega con « · » para poder ser un `Error`. Ese pegote pasaba el tope y se
 * perdía entero: el toast decía «no se pudo» y nadie sabía qué cambiar.
 */
describe('motivosDelError', () => {
  it('devuelve los motivos SUELTOS de un 400 con lista, no el pegote', () => {
    const e = new ApiError(400, [
      'availability debe ser uno de los valores permitidos',
      'status debe ser uno de los valores permitidos',
    ]);
    expect(motivosDelError(e)).toEqual([
      'availability debe ser uno de los valores permitidos',
      'status debe ser uno de los valores permitidos',
    ]);
  });

  it('un 409 con un solo mensaje sale como un motivo', () => {
    const e = new ApiError(409, 'El inmueble tiene un contrato vigente.');
    expect(motivosDelError(e)).toEqual(['El inmueble tiene un contrato vigente.']);
  });

  it('un 5xx: un solo motivo que dice que fue nuestro (02-10-2026)', () => {
    const motivos = motivosDelError(new ApiError(500, 'Internal server error'));
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toMatch(/de nuestro lado/);
  });

  it('descarta el volcado de Prisma y los mensajes que no caben', () => {
    expect(motivosDelError(new ApiError(400, 'Invalid `prisma.consignacion.update()`'))).toEqual([]);
    expect(motivosDelError(new ApiError(400, 'x'.repeat(200)))).toEqual([]);
  });

  it('lo que no es un Error no tiene motivos', () => {
    expect(motivosDelError('se rompió')).toEqual([]);
  });
});

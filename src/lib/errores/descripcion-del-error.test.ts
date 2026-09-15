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

  it('un 5xx no explica nada: no se muestra', () => {
    expect(descripcionDelError(new ApiError(500, 'Internal server error'))).toBeUndefined()
    expect(descripcionDelError(new ApiError(502, 'Bad Gateway'))).toBeUndefined()
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

  it('un 5xx no explica nada: lista vacía para que quien llama ponga su texto', () => {
    expect(motivosDelError(new ApiError(500, 'Internal server error'))).toEqual([]);
  });

  it('descarta el volcado de Prisma y los mensajes que no caben', () => {
    expect(motivosDelError(new ApiError(400, 'Invalid `prisma.consignacion.update()`'))).toEqual([]);
    expect(motivosDelError(new ApiError(400, 'x'.repeat(200)))).toEqual([]);
  });

  it('lo que no es un Error no tiene motivos', () => {
    expect(motivosDelError('se rompió')).toEqual([]);
  });
});

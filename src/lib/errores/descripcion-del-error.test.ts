import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { descripcionDelError } from './descripcion-del-error'

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

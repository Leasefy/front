import { describe, expect, it } from 'vitest'

import { partirElNombre } from './datos-del-propietario'

/** Nico, 28-10-2026: el nombre completo se guarda partido en nombres y apellidos, como en Colombia. */
describe('partirElNombre', () => {
  it.each([
    ['Nicolas Garcia', 'Nicolas', 'Garcia'],
    ['Nicolás García Gómez', 'Nicolás', 'García Gómez'],
    ['Juan Camilo López Acevedo', 'Juan Camilo', 'López Acevedo'],
    ['María de los Ángeles Pérez Gómez', 'María de los Ángeles', 'Pérez Gómez'],
    ['Ana María Pérez de la Torre', 'Ana María', 'Pérez de la Torre'],
    ['Carlos del Valle', 'Carlos', 'del Valle'],
    ['  Sara   Ríos  ', 'Sara', 'Ríos'],
    ['Madonna', 'Madonna', 'Madonna'],
  ])('«%s» → %s | %s', (completo, nombres, apellidos) => {
    expect(partirElNombre(completo)).toEqual({ firstName: nombres, lastName: apellidos })
  })

  it('vacío no inventa nada', () => {
    expect(partirElNombre('   ')).toEqual({ firstName: '', lastName: '' })
  })
})

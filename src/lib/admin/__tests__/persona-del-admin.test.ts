import { describe, expect, it } from 'vitest'

import { nombreDelCorreo, personaDelAdmin } from '../persona-del-admin'

describe('personaDelAdmin', () => {
  it('los fundadores salen con su nombre y su cargo aunque la cuenta no traiga metadatos', () => {
    expect(personaDelAdmin('n@leasefy.co')).toMatchObject({ nombre: 'Nico', cargo: 'CPO', inicial: 'N' })
    expect(personaDelAdmin('Juan.Lopez@leasefy.co')).toMatchObject({ nombre: 'Juan', cargo: 'CEO' })
    expect(personaDelAdmin('alex.lopez@leasefy.co')).toMatchObject({ nombre: 'Alex', cargo: 'CMO' })
    expect(personaDelAdmin('victor.ortiz@leasefy.co')).toMatchObject({ nombre: 'Víctor', cargo: 'CTO', inicial: 'V' })
  })

  it('los metadatos de la cuenta mandan sobre la lista', () => {
    expect(personaDelAdmin('n@leasefy.co', { nombre: 'Nicolás', cargo: 'Producto' })).toMatchObject({
      nombre: 'Nicolás',
      cargo: 'Producto',
    })
  })

  it('cualquier otra cuenta toma el nombre del correo y va sin cargo', () => {
    expect(personaDelAdmin('ops+lab@leasefy.co')).toMatchObject({ nombre: 'Ops', cargo: null })
    expect(nombreDelCorreo('maria.perez@gmail.com')).toBe('Maria')
  })
})

/**
 * 🔴 ARREGLOS-3 (03-10-2026): las reglas de la pantalla del acta firmable —
 * qué foto se puede subir, cómo se llama un espacio escrito a mano, qué espacios
 * se muestran y qué se le dice a la persona del envío del enlace.
 */
import { describe, expect, it } from 'vitest'

import {
  espaciosParaLasFotos,
  fraseDelEnvio,
  problemaDeLaFoto,
  problemaDelEspacio,
} from './firma-del-acta.service'

describe('problemaDeLaFoto — las reglas del back (JPG, PNG o WebP, hasta 5 MB)', () => {
  it('acepta una foto de verdad', () => {
    expect(problemaDeLaFoto({ type: 'image/jpeg', size: 200_000 })).toBeNull()
    expect(problemaDeLaFoto({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeNull()
  })
  it('un PDF, un HEIC o un archivo vacío no', () => {
    expect(problemaDeLaFoto({ type: 'application/pdf', size: 10 })).toMatch(/JPG, PNG o WebP/)
    expect(problemaDeLaFoto({ type: 'image/heic', size: 10 })).toMatch(/JPG, PNG o WebP/)
    expect(problemaDeLaFoto({ type: 'image/png', size: 0 })).toMatch(/Falta la foto/)
  })
  it('más de 5 MB no', () => {
    expect(problemaDeLaFoto({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
  })
})

describe('problemaDelEspacio', () => {
  it('1 a 60 caracteres, sin < ni >', () => {
    expect(problemaDelEspacio('Patio de ropas')).toBeNull()
    expect(problemaDelEspacio('   ')).not.toBeNull()
    expect(problemaDelEspacio('x'.repeat(61))).not.toBeNull()
    expect(problemaDelEspacio('<b>Sala</b>')).not.toBeNull()
  })
})

describe('espaciosParaLasFotos', () => {
  const inventario = [
    { clave: 'sala', nombre: 'Sala' },
    { clave: 'cocina', nombre: 'Cocina' },
  ]

  it('primero los del inventario (con sus fotos si las tienen), después los escritos a mano', () => {
    const r = espaciosParaLasFotos(
      inventario,
      [
        { espacio: 'Cocina', clave: 'cocina', fotos: [{ ruta: 'r1', url: 'u1' }] },
        { espacio: 'Patio de ropas', clave: null, fotos: [{ ruta: 'r2', url: null }] },
      ],
      ['Terraza'],
    )
    expect(r.map((e) => [e.espacio, e.clave, e.fotos.length])).toEqual([
      ['Sala', 'sala', 0],
      ['Cocina', 'cocina', 1],
      ['Patio de ropas', null, 1],
      ['Terraza', null, 0],
    ])
  })

  it('sin clave, se reconoce por el nombre (sin importar mayúsculas) y no se repite', () => {
    const r = espaciosParaLasFotos(inventario, [{ espacio: 'sala', clave: null, fotos: [{ ruta: 'r', url: 'u' }] }], [
      'SALA',
    ])
    expect(r.map((e) => [e.espacio, e.fotos.length])).toEqual([
      ['Sala', 1],
      ['Cocina', 0],
    ])
  })
})

describe('fraseDelEnvio', () => {
  const base = { enlace: 'http://x/firmar/acta/t', venceEl: '2026-10-10T15:00:00.000Z', enviadoA: 'i***@example.test' }
  it('enviado: a qué correo', () => {
    expect(fraseDelEnvio({ ...base, envio: 'ENVIADO' })).toContain('i***@example.test')
  })
  it('🔴 simulado (los correos apagados): que lo copie, sin decir que le llegó', () => {
    const frase = fraseDelEnvio({ ...base, envio: 'SIMULADO' })
    expect(frase).toMatch(/Copia el enlace/)
    expect(frase).not.toMatch(/Le mandamos/)
  })
  it('fallido: que lo mande por otro medio', () => {
    expect(fraseDelEnvio({ ...base, envio: 'FALLIDO' })).toMatch(/otro medio/)
  })
})

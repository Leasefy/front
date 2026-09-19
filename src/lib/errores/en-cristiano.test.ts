/**
 * 🔴 El identificador de una migración no es para el usuario (Nico, 18-09-2026).
 *
 * En la ficha de un contrato salía «Falta aplicar la migración
 * 20260917120000_modalidad_del_mandato: este mandato se liquida como hoy». Quien
 * administra inmuebles no puede aplicar una migración, no sabe qué es, y lo
 * único que aprende es que el producto tiene piezas sueltas.
 *
 * Estas pruebas fijan las dos mitades de la decisión: que el identificador NO
 * se vea, y que la consecuencia —lo único accionable— SÍ se conserve.
 */

import { describe, it, expect } from 'vitest'

import { enCristiano, motivoEnCristiano } from './en-cristiano'

const MIGRACION = '20260917120000_modalidad_del_mandato'

describe('el motivo técnico, en cristiano', () => {
  it('🔴 el caso de Nico: el identificador desaparece, la consecuencia queda', () => {
    const r = enCristiano(
      `Falta aplicar la migración ${MIGRACION}: este mandato se liquida como hoy.`,
    )
    expect(r.texto).toBe(
      'Esta función todavía no está disponible. Por ahora, este mandato se liquida como hoy.',
    )
    expect(r.texto).not.toContain('migración')
    expect(r.texto).not.toContain(MIGRACION)
    expect(r.seTradujo).toBe(true)
  })

  it('el original no se pierde: queda para soporte', () => {
    const bruto = `Falta aplicar la migración ${MIGRACION}: este mandato se liquida como hoy.`
    expect(enCristiano(bruto).tecnico).toBe(bruto)
  })

  it('la forma con la lista de piezas entre paréntesis también se traduce', () => {
    const r = enCristiano(
      'Falta aplicar la migración 20260916100000_segunda_ronda (deducciones, recibos): esas funciones quedan apagadas y lo de antes sigue igual.',
    )
    expect(r.texto).toBe(
      'Esta función todavía no está disponible. Por ahora, esas funciones quedan apagadas y lo de antes sigue igual.',
    )
    expect(r.texto).not.toMatch(/\d{14}/)
  })

  it('sin consecuencia, dice lo único que se sabe', () => {
    const r = enCristiano(
      'Falta aplicar la migración 20260915170000_contratos_terminacion_anticipada.',
    )
    expect(r.texto).toBe('Esta función todavía no está disponible.')
  })

  it('la forma de portales —«en esta base»— conserva lo que sí funciona', () => {
    const r = enCristiano(
      'Todavía no se puede manejar la publicación a portales en esta base: falta la tabla de cuentas. Publicar en el catálogo de Leasefy sigue funcionando como hoy.',
    )
    expect(r.texto).toBe(
      'Esta función todavía no está disponible. Por ahora, publicar en el catálogo de Leasefy sigue funcionando como hoy.',
    )
  })

  it('🔴 un identificador suelto en cualquier frase tampoco se muestra', () => {
    const r = enCristiano(`Algo raro con ${MIGRACION} adentro`)
    expect(r.texto).not.toContain(MIGRACION)
    expect(r.seTradujo).toBe(true)
  })

  it('🔴 lo que NO reconoce lo deja tal cual: inventar es peor que copiar', () => {
    const r = enCristiano('El plan no incluye este módulo.')
    expect(r.texto).toBe('El plan no incluye este módulo.')
    expect(r.seTradujo).toBe(false)
  })

  it('sin motivo, no hay texto', () => {
    expect(motivoEnCristiano(null)).toBeNull()
    expect(motivoEnCristiano(undefined)).toBeNull()
    expect(motivoEnCristiano('   ')).toBeNull()
  })

  it('siempre termina en punto y empieza en mayúscula', () => {
    const r = enCristiano('Falta aplicar la migración 20260101000000_x: algo pasa')
    expect(r.texto!.endsWith('.')).toBe(true)
    expect(r.texto![0]).toBe(r.texto![0].toUpperCase())
  })
})

describe('el error de un toast, en cristiano', () => {
  it('🔴 el toast del enlace de firma deja de mostrar la migración', async () => {
    const { errorEnCristiano } = await import('./en-cristiano')
    // El texto exacto que le salió a Nico al apretar «Crear enlace de firma»
    // apenas el botón ganó su `catch`.
    const real =
      'Todavía no se puede exigir documentos, consultar listas ni firmar el mandato en esta base: falta aplicar la migración 20260918163000_captacion_listas_y_firma_del_mandato (firmas_del_mandato). La consignación sigue funcionando como hoy.'
    const texto = errorEnCristiano(new Error(real), 'No se pudo')
    expect(texto).not.toContain('20260918163000')
    expect(texto).not.toContain('migración')
    // Queda en minúscula porque va detrás de «Por ahora,».
    expect(texto).toContain('la consignación sigue funcionando como hoy')
  })

  it('un error sin mensaje cae en el texto por defecto', async () => {
    const { errorEnCristiano } = await import('./en-cristiano')
    expect(errorEnCristiano({}, 'No se pudo')).toBe('No se pudo')
    expect(errorEnCristiano(new Error('   '), 'No se pudo')).toBe('No se pudo')
  })
})

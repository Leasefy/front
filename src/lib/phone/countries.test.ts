import { describe, it, expect } from 'vitest'
import {
  PAISES,
  PAIS_POR_DEFECTO,
  paisPorIso,
  recortarAlPais,
  normalizarTelefono,
  errorTelefono,
} from './countries'

describe('catálogo de países', () => {
  it('solo Colombia: es donde opera Leasefy', () => {
    expect(PAISES).toHaveLength(1)
    expect(PAISES[0].iso).toBe('CO')
    expect(PAIS_POR_DEFECTO).toBe('CO')
  })

  it('Colombia está bien descrita', () => {
    const co = paisPorIso('CO')
    expect(co.indicativo).toBe('57')
    expect(co.longitud).toBe(10)
    expect(co.prefijosCelular).toEqual(['3'])
    expect(co.ejemplo.replace(/\D/g, '')).toHaveLength(10)
    expect(co.bandera.length).toBeGreaterThan(0)
  })

  it('un ISO desconocido cae en Colombia en vez de reventar', () => {
    expect(paisPorIso('XX').iso).toBe('CO')
  })
})

describe('recortarAlPais — el bug reportado', () => {
  it('no deja escribir más de 10 dígitos', () => {
    // Esto es lo que se pudo escribir antes: 14 dígitos en un campo de 10.
    expect(recortarAlPais('31178899000000')).toBe('3117889900')
    expect(recortarAlPais('31178899000000')).toHaveLength(10)
  })

  it('quita el indicativo si lo pegaron de más', () => {
    expect(recortarAlPais('+57 300 111 2233')).toBe('3001112233')
    expect(recortarAlPais('573001112233')).toBe('3001112233')
  })

  it('no confunde un número que legítimamente empieza igual al indicativo', () => {
    // 5712345678 son 10 dígitos exactos: es el número, no indicativo+número.
    expect(recortarAlPais('5712345678')).toBe('5712345678')
  })

  it('ignora espacios, guiones y paréntesis', () => {
    expect(recortarAlPais('(300) 111-22-33')).toBe('3001112233')
  })
})

describe('normalizarTelefono', () => {
  it('arma el E.164', () => {
    expect(normalizarTelefono('3001112233')).toBe('+573001112233')
  })

  it('acepta el número ya con indicativo', () => {
    expect(normalizarTelefono('573001112233')).toBe('+573001112233')
  })

  it('rechaza si faltan dígitos', () => {
    expect(normalizarTelefono('300111223')).toBeNull()
    expect(normalizarTelefono('')).toBeNull()
  })

  it('exige que sea celular (empieza por 3), no un fijo', () => {
    expect(normalizarTelefono('6011112233')).toBeNull()
  })

  /*
   * El input recorta mientras se escribe (ayuda de tecleo), pero el validador
   * NO: si llegan dígitos de más, se rechaza. Recortar en silencio mandaría el
   * SMS de verificación a un número que la persona nunca escribió.
   */
  it('NO trunca en silencio — un dígito de más se rechaza, no se recorta', () => {
    expect(recortarAlPais('30011122334')).toBe('3001112233') //   el input sí ayuda
    expect(normalizarTelefono('30011122334')).toBeNull() //        el validador no perdona
  })
})

describe('errorTelefono — el mensaje dice qué pasa', () => {
  it('vacío pide el dato', () => {
    expect(errorTelefono('')).toMatch(/Ingresa tu celular/i)
  })

  it('largo incorrecto dice cuántos dígitos van', () => {
    expect(errorTelefono('300111')).toBe('El celular en Colombia tiene 10 dígitos.')
  })

  it('prefijo incorrecto lo explica', () => {
    expect(errorTelefono('6011112233')).toMatch(/empieza por 3/i)
  })

  it('válido no da error', () => {
    expect(errorTelefono('3001112233')).toBeNull()
  })
})

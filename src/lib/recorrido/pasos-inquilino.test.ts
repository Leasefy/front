import { describe, it, expect } from 'vitest'
import { PASOS_RECORRIDO } from './pasos'
import {
  PASOS_INQUILINO,
  TOTAL_PASOS_INQUILINO,
  PASO_FINAL,
  pasoInquilinoPorKey,
  siguientePasoInquilino,
  anteriorPasoInquilino,
} from './pasos-inquilino'

describe('el mapa del inquilino no es el de la inmobiliaria', () => {
  it('colapsa la cola de la inmobiliaria en un solo paso', () => {
    // Los 11 canónicos son el mapa de la agencia: cinco de ellos son trabajo
    // suyo. Mostrarle «3 de 11» a un inquilino le promete ocho tareas que no
    // son suyas.
    expect(TOTAL_PASOS_INQUILINO).toBe(7)
    const final = PASOS_INQUILINO[TOTAL_PASOS_INQUILINO - 1]
    expect(final.key).toBe(PASO_FINAL)
    expect(final.cubre).toEqual([
      'alerta',
      'evaluacion',
      'comparacion',
      'decision',
      'contrato',
    ])
  })

  it('no pierde ni inventa pasos canónicos', () => {
    const cubiertos = PASOS_INQUILINO.flatMap((p) => p.cubre)
    expect([...cubiertos].sort()).toEqual(PASOS_RECORRIDO.map((p) => p.key).sort())
  })

  it('conserva el orden del recorrido canónico', () => {
    const propios = PASOS_INQUILINO.filter((p) => p.key !== PASO_FINAL).map((p) => p.key)
    const canonicos = PASOS_RECORRIDO.filter((p) => propios.includes(p.key)).map((p) => p.key)
    expect(propios).toEqual(canonicos)
  })

  it('numera de 1 a 7 sin huecos', () => {
    expect(PASOS_INQUILINO.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('el turno tiene tres valores, no dos', () => {
  it('distingue lo que le toca de lo que hacemos nosotros', () => {
    // `actor` de pasos.ts sólo responde la pregunta de la agencia («¿es mío?»).
    // El inquilino necesita saber además cuándo está esperándonos a nosotros.
    expect(pasoInquilinoPorKey('pago')?.turno).toBe('tuyo')
    expect(pasoInquilinoPorKey('aseguradoras')?.turno).toBe('nuestro')
    expect(pasoInquilinoPorKey(PASO_FINAL)?.turno).toBe('inmobiliaria')
  })

  it('el último paso del inquilino es postularse: después no le toca nada más', () => {
    const suyos = PASOS_INQUILINO.filter((p) => p.turno === 'tuyo')
    expect(suyos[suyos.length - 1].key).toBe('postulacion')
  })
})

describe('navegación', () => {
  it('desde el pago se vuelve a pedir la aprobación', () => {
    // Es la pregunta que la pantalla de pago no contestaba: a dónde se vuelve.
    const anterior = anteriorPasoInquilino('pago')
    expect(anterior?.key).toBe('asegurabilidad')
    expect(anterior?.href).toBe('/inquilino/aprobacion')
  })

  it('el primer paso no tiene a dónde volver', () => {
    expect(anteriorPasoInquilino('catalogo')).toBeUndefined()
  })

  it('el último no tiene siguiente', () => {
    expect(siguientePasoInquilino(PASO_FINAL)).toBeUndefined()
    expect(siguientePasoInquilino('pago')?.key).toBe('aseguradoras')
  })

  it('una clave desconocida no revienta', () => {
    // @ts-expect-error a propósito: puede llegar de datos viejos
    expect(pasoInquilinoPorKey('inventado')).toBeUndefined()
  })

  it('ningún paso saca al inquilino del panel', () => {
    // Un "siguiente paso" que lo tira al sitio público le hace perder la sesión
    // de vista y no sabe cómo volver.
    for (const p of PASOS_INQUILINO) {
      expect(p.href.startsWith('/inquilino/')).toBe(true)
    }
  })

  it('el pago cuelga de la aprobación, que es lo que enciende el sidebar', () => {
    // El sidebar marca activo con `pathname.startsWith(href)`. Fuera de esta
    // rama, el panel entero queda apagado.
    expect(pasoInquilinoPorKey('pago')?.href).toBe('/inquilino/aprobacion/pago')
    expect(pasoInquilinoPorKey('pago')?.href.startsWith('/inquilino/aprobacion')).toBe(true)
  })
})

describe('vocabulario (docs/VOCABULARIO.md, audiencia = inquilino)', () => {
  const PROHIBIDAS = [
    // Palabra de seguros: el inquilino dice "aprobación".
    'asegurabilidad',
    // Colisiona con apartaestudio, que es un tipo de inmueble del catálogo.
    'estudio',
    // Nuestro scoring A/B/C/D nunca se le muestra con esta palabra.
    'evaluación',
    // Se lee como *app*: muere en toda la UI en español.
    'aplicación',
  ]

  it('ninguna etiqueta ni descripción usa las palabras de la agencia', () => {
    for (const p of PASOS_INQUILINO) {
      const texto = `${p.label} ${p.desc}`.toLowerCase()
      for (const palabra of PROHIBIDAS) {
        expect(texto, `«${palabra}» en el paso ${p.numero} (${p.key})`).not.toContain(palabra)
      }
    }
  })

  it('tutea, como el resto del panel del inquilino', () => {
    // El panel dice "tienes", "puedes", "eliges". El voseo se coló sólo acá.
    const VOSEO = /\b(pagá|elegí|buscá|escribí|tenés|podés|querés|revisá|mirá)\b/i
    for (const p of PASOS_INQUILINO) {
      expect(`${p.label} ${p.desc}`).not.toMatch(VOSEO)
    }
  })
})

/**
 * Protege reglas de experiencia, no marcado.
 *
 * Lo que se verifica acá es lo que se pierde en un refactor sin que nadie se
 * dé cuenta: que un rechazo siga teniendo salidas, que una demo se anuncie
 * como demo, y que un "con condiciones" no se convierta en un muro.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

import { ResultadoAprobacion } from './ResultadoAprobacion'
import type { PreApprovalResult } from '@/lib/api/funnel.service'


// Con `t` devolviendo la clave, `useTf` cae al respaldo — que es el español
// real de la pantalla. Así los tests siguen leyendo la copy que ve el usuario,
// no un identificador.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'es' }),
  useOptionalI18n: () => ({ t: (key: string) => key, locale: 'es' }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement | null = null
let root: Root | null = null

let entradas = 0

function pintar(result: PreApprovalResult, props: Partial<{ canonConsultadoCop: number | null; conSesion: boolean; esAgencia: boolean }> = {}) {
  entradas = 0
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => {
    root!.render(
      <ResultadoAprobacion
        result={result}
        canonConsultadoCop={props.canonConsultadoCop ?? null}
        conSesion={props.conSesion ?? false}
        esAgencia={props.esAgencia ?? false}
        onNuevaConsulta={() => {}}
        onEntrar={() => { entradas += 1 }}
      />,
    )
  })
  return contenedor.textContent ?? ''
}

afterEach(() => {
  act(() => root?.unmount())
  contenedor?.remove()
  contenedor = null
  root = null
})

function resultado(over: Partial<PreApprovalResult> = {}): PreApprovalResult {
  return {
    asegurabilidad: 'yes',
    aseguradoras: [{ aseguradora: 'sura', status: 'approved' }],
    stubMode: false,
    message: 'ok',
    maxAfianzableCop: null,
    ...over,
  }
}

describe('el rechazo NO es un callejón', () => {
  it('ofrece las tres salidas, no solo un "lo sentimos"', () => {
    const t = pintar(resultado({ asegurabilidad: 'no', aseguradoras: [] }))
    // La primera es la que más se usa en Colombia: que el titular sea otro.
    expect(t).toContain('Que alguien se postule por ti')
    expect(t).toContain('codeudor')
    expect(t).toContain('Seguir viendo propiedades')
  })

  it('siempre deja un camino al catálogo', () => {
    pintar(resultado({ asegurabilidad: 'no', aseguradoras: [] }))
    const links = Array.from(contenedor!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links).toContain('/propiedades')
  })

  it('dice que no es definitivo', () => {
    expect(pintar(resultado({ asegurabilidad: 'no', aseguradoras: [] }))).toContain('No es definitivo')
  })
})

describe('"con condiciones" sigue siendo un sí', () => {
  it('no frena: manda al catálogo igual que un aprobado', () => {
    pintar(resultado({ asegurabilidad: 'partial' }), { conSesion: true })
    const links = Array.from(contenedor!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links).toContain('/inquilino/para-ti')
  })

  it('explica la condición en palabras normales, no con la palabra "condicional"', () => {
    const t = pintar(resultado({ asegurabilidad: 'partial' }))
    expect(t).toContain('codeudor')
    expect(t).toContain('Qué suele significar')
  })
})

describe('el número — hay DOS y no significan lo mismo', () => {
  it('el máximo afianzable se dice como techo ("hasta")', () => {
    // Llega cuando se consulta SIN propiedad: la aseguradora responde hasta
    // cuánto, y eso sí es un tope con el que se puede filtrar el catálogo.
    const t = pintar(resultado({ maxAfianzableCop: 2_800_000 }))
    expect(t).toContain('2.800.000')
    expect(t).toContain('Te afianzamos hasta')
  })

  it('el canon consultado se dice como punto confirmado ("para"), no como techo', () => {
    const t = pintar(resultado(), { canonConsultadoCop: 2_000_000 })
    expect(t).toContain('2.000.000')
    expect(t).toContain('Aprobado para un canon de')
    expect(t).not.toContain('Te afianzamos hasta')
  })

  it('el máximo manda sobre el canon consultado', () => {
    const t = pintar(resultado({ maxAfianzableCop: 2_800_000 }), { canonConsultadoCop: 2_000_000 })
    expect(t).toContain('2.800.000')
    expect(t).not.toContain('2.000.000')
  })

  it('sin ninguno de los dos NO se inventa una cifra, y el hueco es del sistema', () => {
    const t = pintar(resultado())
    expect(t).not.toMatch(/\$\s*\d/)
    // "todavía no tienes un monto" sonaba a que le faltaba algo a la persona.
    expect(t).toContain('Estamos calculando')
  })
})

describe('honestidad', () => {
  it('un resultado de demostración se anuncia como tal', () => {
    const t = pintar(resultado({ stubMode: true }))
    expect(t).toContain('Resultado de ejemplo')
    expect(t).toContain('no son reales')
  })

  it('un resultado real no lleva el aviso', () => {
    expect(pintar(resultado())).not.toContain('Resultado de ejemplo')
  })
})

describe('el aprobado entra a la plataforma, no a la calle', () => {
  it('sin cuenta, "Ver mi catálogo" NO saca al catálogo público', () => {
    // Ahí vería el mismo listado que cualquier visitante y su aprobación no
    // pintaría nada. El camino correcto es crear la cuenta.
    pintar(resultado(), { conSesion: false })
    const links = Array.from(contenedor!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links).not.toContain('/propiedades')
  })

  it('sin cuenta, el botón dispara la creación de cuenta', () => {
    pintar(resultado(), { conSesion: false })
    const btn = Array.from(contenedor!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ver mi catálogo'),
    )
    expect(btn).toBeTruthy()
    act(() => { btn!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(entradas).toBe(1)
  })

  it('con cuenta va derecho a su panel', () => {
    pintar(resultado(), { conSesion: true })
    const links = Array.from(contenedor!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links).toContain('/inquilino/para-ti')
  })

  it('a un rechazado NO se le cobra peaje: el catálogo público sigue abierto', () => {
    // Obligarlo a registrarse después de un no sería cobrarle por la mala noticia.
    pintar(resultado({ asegurabilidad: 'no', aseguradoras: [] }), { conSesion: false })
    const links = Array.from(contenedor!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links).toContain('/propiedades')
  })

  it('a la inmobiliaria le dice que está viendo lo que ve el candidato', () => {
    expect(pintar(resultado(), { esAgencia: true })).toContain('como lo ve el candidato')
  })
})

describe('una demo no promete un catálogo que no puede dar', () => {
  /*
   * El caso real, reproducido: en local el funnel devuelve `stubMode: true` con
   * un máximo afianzable de ejemplo de $2.800.000. La persona leía "estás
   * aprobado hasta $2.800.000", tocaba "Ver mi catálogo" y aterrizaba en una
   * pantalla que le decía que no sabíamos nada de ella.
   *
   * No era un bug del catálogo: un resultado de demo NO se guarda a propósito
   * (regla 2 de `aprobacion-local.ts`), así que no había nada con qué
   * personalizar. Lo que estaba mal era el botón que prometía lo contrario.
   */
  const demo = () =>
    resultado({ stubMode: true, maxAfianzableCop: 2_800_000 })

  it('con sesión no ofrece "mi catálogo"', () => {
    const txt = pintar(demo(), { conSesion: true })
    expect(txt).toContain('Ver propiedades')
    expect(txt).not.toContain('Ver mi catálogo')
  })

  it('el botón lleva a explorar, no al catálogo personalizado', () => {
    pintar(demo(), { conSesion: true })
    const hrefs = [...contenedor!.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/inquilino/explorar')
    expect(hrefs).not.toContain('/inquilino/para-ti')
  })

  it('tampoco promete que el catálogo va a marcar nada', () => {
    const txt = pintar(demo(), { conSesion: true })
    expect(txt).not.toContain('En el catálogo te marcamos lo que va contigo.')
    expect(txt).toContain('Cuando el resultado sea real')
  })

  it('la nota bajo el número tampoco promete el filtro', () => {
    const txt = pintar(demo(), { conSesion: true })
    expect(txt).toContain('Con un tope real te mostraríamos')
    expect(txt).not.toContain('Con este tope te mostramos')
  })

  it('un resultado real sí ofrece su catálogo', () => {
    const txt = pintar(resultado({ maxAfianzableCop: 2_800_000 }), { conSesion: true })
    expect(txt).toContain('Ver mi catálogo')
    const hrefs = [...contenedor!.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/inquilino/para-ti')
  })
})

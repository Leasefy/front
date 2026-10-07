/**
 * La presentación de un agente — A «Escenario», la que eligió Nico (05-10-2026
 * 19:10). Se monta DE VERDAD (el Dialog del DS, el Cajón, el orbe en SVG de
 * happy-dom) y se comprueba lo que la persona vive:
 *   · sin las líneas grandes alrededor: sólo los dos anillos del orbe;
 *   · se anuncia con el nombre y la promesa del agente;
 *   · «Empezar» la cierra como vista (`completo`); Esc, como `omitido`;
 *   · el foco arranca en el llamado y vuelve a quien la abrió;
 *   · «¿Cómo funciona?» abre el cajón de explicaciones ENCIMA, sin cerrarla;
 *   · el modo dice la verdad: Copiloto por defecto, «a pedido» para quien no
 *     lee el modo, y Automático sin el piloto activo rige como Copiloto.
 * Y que cada clave que usan las fichas existe, con texto, en es y en.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'
import { I18nProvider } from '@/lib/i18n/i18n-context'

import { FICHAS, PRESENTACIONES, PresentacionEscenario, clavesDeLaFicha, fichaDelAgente } from './index'
import { modoQueRige, type ComoSeCerro, type PropsDePresentacion } from './piezas'
import { CLAVES_COMUNES, MODOS, claveDelModo } from './textos'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

async function esperar(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

function montar(props: Partial<PropsDePresentacion> & { onCerrar: (c: ComoSeCerro) => void }) {
  act(() =>
    root.render(
      <I18nProvider>
        <PresentacionEscenario ficha={props.ficha ?? FICHAS.conciliacion} abierta {...props} />
      </I18nProvider>,
    ),
  )
}

const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')
const texto = (clave: string) =>
  clave.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], es) as string

describe('A «Escenario»', () => {
  it('🔴 sin las líneas grandes alrededor (Nico, 05-10): sólo los dos anillos del orbe', () => {
    montar({ onCerrar: vi.fn() })
    const d = dialogo()!
    // Ninguna retícula de círculos ni líneas de puntos en el fondo: el fondo no tiene SVG.
    expect(d.querySelector('[data-fondo-de-marca] svg')).toBeNull()
    expect(d.querySelectorAll('[data-fondo-de-marca] circle, [data-fondo-de-marca] path').length).toBe(0)
    // Los anillos que quedan son los del orbe: el punteado y el arco, pegados a él.
    // (Hay un orbe para el escritorio y otro, más chico, para el celular: cada uno con SUS dos anillos.)
    const orbes = Array.from(d.querySelectorAll<HTMLElement>('[data-orbe-de-la-presentacion]'))
    expect(orbes.length).toBeGreaterThan(0)
    for (const o of orbes) {
      const anillos = Array.from(o.querySelectorAll<HTMLElement>('[data-anillo-del-orbe]')).map((a) => a.dataset.anilloDelOrbe)
      expect(anillos).toEqual(['punteado', 'arco'])
    }
    expect(d.querySelectorAll('[data-anillo-del-orbe]').length).toBe(orbes.length * 2)
    expect(d.querySelector('[data-orbe-de-la-presentacion="conciliacion"] .cdc-orb')).not.toBeNull()
  })

  it('se anuncia con el nombre y la promesa del agente', () => {
    montar({ onCerrar: vi.fn() })
    const d = dialogo()!
    expect(document.getElementById(d.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Agente de Conciliación')
    expect(document.getElementById(d.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      texto(FICHAS.conciliacion.promesa),
    )
  })

  it('«Empezar» la deja vista (completo) y Esc, omitida', () => {
    const onCerrar = vi.fn()
    montar({ onCerrar })
    const empezar = document.querySelector<HTMLButtonElement>('[data-testid="presentacion-empezar"]')!
    expect(empezar.textContent).toContain('Empezar a conciliar')
    act(() => empezar.click())
    expect(onCerrar).toHaveBeenCalledWith('completo')
    act(() => {
      dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCerrar).toHaveBeenCalledWith('omitido')
  })

  it('la ✕ lleva el data-testid de cada lugar y se anuncia «Cerrar»', () => {
    const onCerrar = vi.fn()
    montar({ onCerrar, testid: 'presentacion-del-agente', testidCerrar: 'presentacion-del-agente-cerrar' })
    expect(document.querySelector('[data-testid="presentacion-del-agente"]')).toBe(dialogo())
    const aspa = document.querySelector<HTMLButtonElement>('[data-testid="presentacion-del-agente-cerrar"]')!
    expect(aspa.getAttribute('aria-label')).toBe('Cerrar')
    act(() => aspa.click())
    expect(onCerrar).toHaveBeenCalledWith('omitido')
  })

  it('el foco arranca en el llamado y, al cerrar con Esc, vuelve al botón que la abrió', async () => {
    function Banco() {
      const [abierta, setAbierta] = React.useState(false)
      return (
        <I18nProvider>
          <button type="button" data-testid="abridor" onClick={() => setAbierta(true)}>
            Abrir
          </button>
          <PresentacionEscenario ficha={FICHAS.cobranza} abierta={abierta} onCerrar={() => setAbierta(false)} />
        </I18nProvider>
      )
    }
    act(() => root.render(<Banco />))
    const abridor = document.querySelector<HTMLButtonElement>('[data-testid="abridor"]')!
    abridor.focus()
    act(() => abridor.click())
    await esperar()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('presentacion-empezar')
    act(() => {
      dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await esperar(80)
    expect(document.activeElement).toBe(abridor)
  })

  it('«¿Cómo funciona?» abre el cajón con los pasos de la pantalla, sin cerrar la presentación', async () => {
    const onCerrar = vi.fn()
    montar({ onCerrar })
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="presentacion-como-funciona"]')!.click())
    await esperar()
    const cajon = document.querySelector('[data-testid="presentacion-como-funciona-cajon"]')
    expect(cajon, 'el cajón de explicaciones').not.toBeNull()
    expect(cajon!.querySelectorAll('[data-paso]').length).toBe(FICHAS.conciliacion.comoFunciona.pasos.length)
    expect(cajon!.textContent).not.toMatch(/comoFunciona\./)
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('el piloto automático: su «¿Cómo funciona?» tiene sus cuatro pasos', async () => {
    montar({ onCerrar: vi.fn(), ficha: FICHAS.piloto })
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="presentacion-como-funciona"]')!.click())
    await esperar()
    const cajon = document.querySelector('[data-testid="presentacion-como-funciona-cajon"]')!
    expect(cajon.querySelectorAll('[data-paso]').length).toBe(4)
    expect(cajon.textContent).toContain('Activar la prueba de 30 días')
  })
})

describe('el modo dice la verdad', () => {
  it('Copiloto por defecto, con lo que significa', () => {
    montar({ onCerrar: vi.fn() })
    const modo = document.querySelector('[data-testid="modo-del-agente"]')!
    expect(modo.getAttribute('data-modo')).toBe('copiloto')
    expect(modo.textContent).toContain(texto('inmobiliaria.ai.intro.conciliacion.modo.copiloto'))
    expect(dialogo()!.textContent).toContain('Modo · Copiloto')
  })

  it('quien no lee el modo (Asegurabilidad) dice «a pedido», no inventa un Copiloto', () => {
    montar({ onCerrar: vi.fn(), ficha: FICHAS.cotizador, modo: 'autonomo', pilotoActivo: true })
    const modo = document.querySelector('[data-testid="modo-del-agente"]')!
    expect(modo.getAttribute('data-modo')).toBe('a-pedido')
    expect(modo.textContent).toContain(texto('inmobiliaria.ai.intro.cotizador.modo.aPedido'))
    expect(dialogo()!.textContent).toContain('Modo · A pedido')
  })

  it('Automático sin el piloto activo: se dice que rige Copiloto', () => {
    montar({ onCerrar: vi.fn(), ficha: FICHAS.cobranza, modo: 'autonomo', pilotoActivo: false })
    const modo = document.querySelector('[data-testid="modo-del-agente"]')!
    expect(modo.textContent).toContain(texto('inmobiliaria.ai.intro.cobranza.modo.copiloto'))
    expect(modo.textContent).toContain(texto(CLAVES_COMUNES.sinPilotoActivo))
  })

  it('Automático con el piloto activo: lo que hace solo', () => {
    montar({ onCerrar: vi.fn(), ficha: FICHAS.cobranza, modo: 'autonomo', pilotoActivo: true })
    const modo = document.querySelector('[data-testid="modo-del-agente"]')!
    expect(modo.textContent).toContain(texto('inmobiliaria.ai.intro.cobranza.modo.autonomo'))
    expect(modo.textContent).not.toContain(texto(CLAVES_COMUNES.sinPilotoActivo))
  })

  it('modoQueRige', () => {
    expect(modoQueRige('autonomo', false)).toBe('copiloto')
    expect(modoQueRige('autonomo', null)).toBe('copiloto')
    expect(modoQueRige('autonomo', true)).toBe('autonomo')
    expect(modoQueRige('sombra', false)).toBe('sombra')
  })
})

describe('las claves', () => {
  const leer = (d: unknown, c: string) =>
    c.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], d)
  const todas = [
    ...PRESENTACIONES.flatMap((id) => clavesDeLaFicha(FICHAS[id])),
    ...Object.values(CLAVES_COMUNES),
    ...MODOS.map(claveDelModo),
  ]

  it('cada clave existe con texto en español y en inglés', () => {
    expect(todas.filter((c) => typeof leer(es, c) !== 'string' || !(leer(es, c) as string).trim())).toEqual([])
    expect(todas.filter((c) => typeof leer(en, c) !== 'string' || !(leer(en, c) as string).trim())).toEqual([])
  })

  it('el inglés no es el español copiado', () => {
    // Un nombre propio («Laura») y «Manual» se escriben igual en los dos idiomas.
    const iguales = todas.filter((c) => leer(es, c) === leer(en, c) && !['Laura', 'Manual'].includes(leer(es, c) as string))
    expect(iguales).toEqual([])
  })

  it('fichaDelAgente: los seis agentes con espacio, y Pagos sin presentación', () => {
    for (const id of ['conciliacion', 'cobranza', 'avaluos', 'cotizador', 'estudio', 'matching']) {
      expect(fichaDelAgente(id)?.agente).toBe(id)
    }
    expect(fichaDelAgente('pagos')).toBeNull()
    expect(fichaDelAgente('piloto')).toBeNull()
  })
})

describe('los textos no prometen lo que el código no hace', () => {
  /** Lo que los textos viejos prometían (ver la entrega de PRESENTACIONES, 05-10). */
  const PROHIBIDO = [
    /en segundos/i,
    /en minutos/i,
    /sin salir del panel/i,
    /codeudor/i,
    /automáticamente/i,
    /únicamente con tu aprobación/i,
    /candidatos aprobados/i,
    /mora estándar solo/i,
  ]
  it.each(PRESENTACIONES.map((p) => [p] as const))('%s', (id) => {
    const dicho = clavesDeLaFicha(FICHAS[id])
      .map((c) => texto(c))
      .join(' ')
    for (const re of PROHIBIDO) expect(dicho, `${id}: ${re}`).not.toMatch(re)
  })

  it('el estudio dice que es opcional y que lo pide el candidato (Nico, 04-10)', () => {
    expect(texto('inmobiliaria.ai.intro.estudio.necesita.n1')).toMatch(/opcional y lo pide el candidato/)
  })

  it('la presentación del piloto automático no lo llama «chat» ni lo confunde con Ori', () => {
    const p = FICHAS.piloto
    const dicho = [p.nombre, p.rol, p.promesa, ...p.capacidades.flatMap((c) => [c.titulo, c.texto])].map(texto).join(' ')
    expect(dicho).not.toMatch(/\bOri\b|\bchat\b/i)
  })
})

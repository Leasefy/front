/**
 * RecorridoHilo — la LÍNEA que dice en qué paso está una pantalla.
 *
 * Lo que se protege acá es lo único que la tira tiene que acertar:
 *  · el número del paso y el total
 *  · **de quién es la pelota** — que es la razón de existir del componente
 *  · qué sigue, y que solo sea enlace cuando hay a dónde ir
 *  · 🔴 y, desde el 21-09-2026, que el mapa de los once pasos NO esté puesto
 *    sobre la pantalla: se abre en un modal si alguien lo pide
 *
 * Las claves se resuelven contra el es.json REAL (no un `t: k => k`), así que
 * si alguien renombra una clave el test lo ve: la cadena esperada deja de
 * aparecer y en su lugar sale la ruta de la clave.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

// El mapa que se abre en el modal esconde el enlace del paso en cuya pantalla
// ya estás, así que necesita un pathname.
vi.mock('next/navigation', () => ({ usePathname: () => '/panel/inmobiliaria/otra-cosa' }))

// Mismo doble que usa `para-entender-mas.test.tsx`: un modal de verdad no
// aporta nada acá y mete a Radix y a los portales en el medio.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
  DialogContent: ({ children, ...p }: { children: React.ReactNode }) => <div {...p}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

// Sin esto React avisa en cada render que el entorno no soporta act(). No
// cambia el resultado, pero llena la salida de ruido y tapa avisos reales.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { RecorridoHilo } from './RecorridoHilo'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

function montar(ui: React.ReactElement) {
  act(() => root.render(ui))
  return contenedor
}

describe('RecorridoHilo', () => {
  it('ubica el paso dentro del total', () => {
    const el = montar(<RecorridoHilo paso="alerta" />)
    expect(el.textContent).toContain('Paso 7 de 11')
    expect(el.textContent).toContain('Te llega la postulación')
  })

  it('en un paso de la inmobiliaria dice que le toca', () => {
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    expect(el.textContent).toContain('Te toca')
    expect(el.textContent).not.toContain('Lo hace el inquilino')
  })

  it('en un paso del inquilino dice que está esperando', () => {
    const el = montar(<RecorridoHilo paso="postulacion" />)
    expect(el.textContent).toContain('Lo hace el inquilino')
    expect(el.textContent).not.toContain('Te toca')
  })

  it('anuncia el paso siguiente', () => {
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    // 8 → 9
    expect(el.textContent).toContain('Comparas los candidatos')
  })

  it('el paso siguiente es enlace solo cuando hay a dónde ir', () => {
    // El 6 (postulación) precede al 7, que se atiende en `/postulaciones`.
    const conRuta = montar(<RecorridoHilo paso="postulacion" />)
    expect(conRuta.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).not.toBeNull()
  })

  it('sin ruta declarada, el paso siguiente es texto y no un enlace muerto', () => {
    // 8 → 9 (comparación) no tiene ruta estática: depende de la propiedad.
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    const enlaces = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(enlaces).not.toContain(null)
    expect(enlaces.some((h) => h?.includes('[id]'))).toBe(false)
  })

  it('acepta una ruta de contexto para los pasos que dependen de una propiedad', () => {
    const el = montar(
      <RecorridoHilo
        paso="comparacion"
        hrefs={{ decision: '/panel/inmobiliaria/inmuebles/p-1/candidatos' }}
      />,
    )
    expect(
      el.querySelector('a[href="/panel/inmobiliaria/inmuebles/p-1/candidatos"]'),
    ).not.toBeNull()
  })

  it('en el último paso no promete un siguiente', () => {
    const el = montar(<RecorridoHilo paso="contrato" />)
    expect(el.textContent).toContain('Paso 11 de 11')
    expect(el.textContent).not.toContain('Sigue:')
  })

  it('una clave desconocida no tumba la pantalla que la hospeda', () => {
    // @ts-expect-error — el borde se prueba en runtime a propósito
    const el = montar(<RecorridoHilo paso="inventado" />)
    expect(el.textContent).toBe('')
  })

  it('🔴 el mapa de once pasos NO está puesto sobre la pantalla', () => {
    /* La versión anterior de esta tira era una TARJETA de ~100 px —borde, fondo
       propio y una barra decorativa de once segmentos— arriba del formulario de
       contrato y de la cola de estudios. Nico, 21-09: «hay muchas pantallas que
       colocamos información ahí dispuesta y eso llena las pantallas de carga
       cognitiva innecesaria». Lo que se fija acá no es la estética: es que el
       contenido caro no esté montado para quien no lo pidió. */
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    expect(el.querySelector('[data-testid="modal"]')).toBeNull()
    expect(el.textContent).not.toContain('Acá cambia de manos')
    expect(el.querySelectorAll('[data-paso]')).toHaveLength(0)
    // …pero hay por dónde pedirlo.
    expect(el.querySelector('[data-testid="para-entender-mas"]')?.textContent)
      .toContain('El recorrido completo')
  })

  it('pedido el recorrido, se abre el mapa marcando el paso en el que estás', () => {
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    act(() => {
      el.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!.click()
    })
    expect(el.querySelector('[data-testid="modal"]')).not.toBeNull()
    const marcas = [...el.querySelectorAll('[data-paso]')].map((s) => s.textContent)
    expect(marcas).toHaveLength(11)
    // Los siete anteriores quedaron atrás (el número deja lugar al ✓) y el 8
    // —el de esta pantalla— conserva el suyo.
    expect(marcas.slice(0, 7)).toEqual(['', '', '', '', '', '', ''])
    expect(marcas[7]).toBe('8')
  })

  it('la tira NO vuelve a ser una tarjeta', () => {
    /* Un assert de formato, a propósito y con su motivo: el defecto que se
       arregló era exactamente el espacio que ocupaba —borde y fondo propio
       encima de lo que la persona vino a hacer—, y ningún assert de contenido
       lo habría visto. Si algún día la tira necesita marco, este test se cambia
       a mano y se escribe por qué. */
    const el = montar(<RecorridoHilo paso="evaluacion" />)
    const clases = (el.firstElementChild as HTMLElement).className
    expect(clases).not.toMatch(/\bborder\b/)
    expect(clases).not.toMatch(/\bbg-/)
    expect(clases).toContain('flex')
  })

  it('no deja escapar claves i18n sin resolver', () => {
    const el = montar(<RecorridoHilo paso="alerta" />)
    expect(el.textContent).not.toContain('inmobiliaria.recorrido')
  })
})
